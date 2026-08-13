import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import { db } from '../data/database'
import type { Exercice, Theme } from '../data/models'
import { useContexteScolaire } from './useContexteScolaire'
import { CLE_BRANCHE_ACTIVE } from '../data/configuration'

function comparerNoms(
    premier: { nom: string },
    second: { nom: string },
): number {
    return premier.nom.localeCompare(second.nom, 'fr', {
        sensitivity: 'base',
    })
}

async function retirerExercicesDesSessions(
    exerciceIds: number[],
): Promise<void> {
    if (exerciceIds.length === 0) return

    const idsSupprimes = new Set(exerciceIds)

    await db.sessions.toCollection().modify((session) => {
        const exerciceIdsRestants = session.exerciceIds.filter(
            (id) => !idsSupprimes.has(id),
        )

        if (exerciceIdsRestants.length !== session.exerciceIds.length) {
            session.exerciceIds = exerciceIdsRestants
            session.modifieLe = Date.now()
        }
    })
}

export function useThemesExercices() {
    const { brancheActiveId } = useContexteScolaire()
    const themes = ref<Theme[]>([])
    const exercices = ref<Exercice[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const configuration = await db.configuration.get(CLE_BRANCHE_ACTIVE)
        const id = typeof configuration?.valeur === 'number'
            ? configuration.valeur
            : null
        if (id === null) {
            return { themes: [], exercices: [] }
        }
        const themesStockes = await db.themes
            .where('brancheId')
            .equals(id)
            .toArray()
        themesStockes.sort((a, b) => a.ordre - b.ordre)
        const themeIds = themesStockes.map((theme) => theme.id!)
        const exercicesStockes = themeIds.length
            ? await db.exercices
                  .where('themeId')
                  .anyOf(themeIds)
                  .toArray()
            : []

        exercicesStockes.sort((premier, second) => {
            if (premier.themeId !== second.themeId) {
                return premier.themeId - second.themeId
            }

            return premier.ordre - second.ordre
        })

        return {
            themes: themesStockes,
            exercices: exercicesStockes,
        }
    }).subscribe({
        next: (resultat) => {
            themes.value = resultat.themes
            exercices.value = resultat.exercices
            chargement.value = false
            erreur.value = null
        },
        error: (cause: unknown) => {
            chargement.value = false
            erreur.value = cause instanceof Error
                ? cause.message
                : "Impossible de charger les thèmes et exercices"
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function ajouterTheme(nom: string): Promise<number> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error('Le nom du thème est obligatoire')
        }

        const brancheId = brancheActiveId.value
        if (brancheId === null) {
            throw new Error('Choisis une branche avant d’ajouter un thème.')
        }

        return db.transaction('rw', db.themes, async () => {
            const liste = await db.themes
                .where('brancheId')
                .equals(brancheId)
                .toArray()
            const ordreMaximum = liste.reduce(
                (maximum, theme) => Math.max(maximum, theme.ordre),
                -1,
            )

            return db.themes.add({
                brancheId,
                nom: nomNettoye,
                ordre: ordreMaximum + 1,
                creeLe: Date.now(),
            })
        })
    }

    async function modifierTheme(id: number, nom: string): Promise<void> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error('Le nom du thème est obligatoire')
        }

        await db.themes.update(id, { nom: nomNettoye })
    }

    async function supprimerTheme(id: number): Promise<void> {
        await db.transaction(
            'rw',
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            async () => {
                const exerciceIds = await db.exercices
                    .where('themeId')
                    .equals(id)
                    .primaryKeys()

                if (exerciceIds.length > 0) {
                    await db.progressions
                        .where('exerciceId')
                        .anyOf(exerciceIds)
                        .delete()
                    await retirerExercicesDesSessions(exerciceIds)
                }

                await db.exercices.where('themeId').equals(id).delete()
                await db.themes.delete(id)
            },
        )
    }

    async function deplacerTheme(
        id: number,
        direction: 'haut' | 'bas',
    ): Promise<void> {
        await db.transaction('rw', db.themes, async () => {
            if (brancheActiveId.value === null) return
            const liste = await db.themes
                .where('brancheId')
                .equals(brancheActiveId.value)
                .toArray()
            liste.sort((a, b) => a.ordre - b.ordre)
            const index = liste.findIndex((theme) => theme.id === id)
            const indexCible = direction === 'haut' ? index - 1 : index + 1

            if (
                index === -1
                || indexCible < 0
                || indexCible >= liste.length
            ) {
                return
            }

            const theme = liste[index]
            const themeCible = liste[indexCible]

            await db.themes.bulkPut([
                { ...theme, ordre: themeCible.ordre },
                { ...themeCible, ordre: theme.ordre },
            ])
        })
    }

    async function trierThemesAlphabetiquement(): Promise<void> {
        await db.transaction('rw', db.themes, async () => {
            if (brancheActiveId.value === null) return
            const liste = await db.themes
                .where('brancheId')
                .equals(brancheActiveId.value)
                .toArray()
            liste.sort(comparerNoms)

            await db.themes.bulkPut(
                liste.map((theme, index) => ({
                    ...theme,
                    ordre: index,
                })),
            )
        })
    }

    async function ajouterExercice(
        themeId: number,
        nom: string,
    ): Promise<number> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error("Le nom de l'exercice est obligatoire")
        }

        return db.transaction(
            'rw',
            db.themes,
            db.exercices,
            async () => {
                const theme = await db.themes.get(themeId)

                if (!theme) {
                    throw new Error("Le thème sélectionné n'existe plus")
                }

                const exercicesDuTheme = await db.exercices
                    .where('themeId')
                    .equals(themeId)
                    .toArray()
                const ordreMaximum = exercicesDuTheme.reduce(
                    (maximum, exercice) => Math.max(maximum, exercice.ordre),
                    -1,
                )

                return db.exercices.add({
                    themeId,
                    nom: nomNettoye,
                    ordre: ordreMaximum + 1,
                    creeLe: Date.now(),
                })
            },
        )
    }

    async function modifierExercice(
        id: number,
        nom: string,
    ): Promise<void> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error("Le nom de l'exercice est obligatoire")
        }

        await db.exercices.update(id, { nom: nomNettoye })
    }

    async function supprimerExercice(id: number): Promise<void> {
        await db.transaction(
            'rw',
            db.exercices,
            db.progressions,
            db.sessions,
            async () => {
                await db.progressions
                    .where('exerciceId')
                    .equals(id)
                    .delete()
                await retirerExercicesDesSessions([id])
                await db.exercices.delete(id)
            },
        )
    }

    async function deplacerExercice(
        id: number,
        direction: 'haut' | 'bas',
    ): Promise<void> {
        await db.transaction('rw', db.exercices, async () => {
            const exercice = await db.exercices.get(id)

            if (!exercice) return

            const liste = await db.exercices
                .where('themeId')
                .equals(exercice.themeId)
                .toArray()
            liste.sort((premier, second) => premier.ordre - second.ordre)

            const index = liste.findIndex((item) => item.id === id)
            const indexCible = direction === 'haut' ? index - 1 : index + 1

            if (
                index === -1
                || indexCible < 0
                || indexCible >= liste.length
            ) {
                return
            }

            const exerciceCible = liste[indexCible]

            await db.exercices.bulkPut([
                { ...exercice, ordre: exerciceCible.ordre },
                { ...exerciceCible, ordre: exercice.ordre },
            ])
        })
    }

    async function trierExercicesAlphabetiquement(
        themeId: number,
    ): Promise<void> {
        await db.transaction('rw', db.exercices, async () => {
            const liste = await db.exercices
                .where('themeId')
                .equals(themeId)
                .toArray()
            liste.sort(comparerNoms)

            await db.exercices.bulkPut(
                liste.map((exercice, index) => ({
                    ...exercice,
                    ordre: index,
                })),
            )
        })
    }

    return {
        themes: readonly(themes),
        exercices: readonly(exercices),
        chargement: readonly(chargement),
        erreur: readonly(erreur),
        ajouterTheme,
        modifierTheme,
        supprimerTheme,
        deplacerTheme,
        trierThemesAlphabetiquement,
        ajouterExercice,
        modifierExercice,
        supprimerExercice,
        deplacerExercice,
        trierExercicesAlphabetiquement,
    }
}
