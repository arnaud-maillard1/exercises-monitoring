import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
} from '../data/configuration'
import { db } from '../data/database'
import type { Exercice, Session, Theme } from '../data/models'
import { useContexteScolaire } from './useContexteScolaire'

function lireIdentifiant(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isInteger(valeur)
        ? valeur
        : null
}

export function useSessionActuelle() {
    const { brancheActiveId, classeActiveId } = useContexteScolaire()
    const session = ref<Session | null>(null)
    const themes = ref<Theme[]>([])
    const exercices = ref<Exercice[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const configuration = await db.configuration.bulkGet([
            CLE_BRANCHE_ACTIVE,
            CLE_CLASSE_ACTIVE,
        ])
        const brancheId = lireIdentifiant(configuration[0]?.valeur)
        const classeId = lireIdentifiant(configuration[1]?.valeur)
        if (brancheId === null || classeId === null) {
            return { session: null, themes: [], exercices: [] }
        }

        const themesStockes = await db.themes
            .where('brancheId')
            .equals(brancheId)
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

        const sessionStockee =
            (await db.sessions
                .where('[classeId+brancheId]')
                .equals([classeId, brancheId])
                .first()) ?? null

        return {
            session: sessionStockee,
            themes: themesStockes,
            exercices: exercicesStockes,
        }
    }).subscribe({
        next: (resultat) => {
            session.value = resultat.session
            themes.value = resultat.themes
            exercices.value = resultat.exercices
            chargement.value = false
            erreur.value = null
        },
        error: (cause: unknown) => {
            chargement.value = false
            erreur.value =
                cause instanceof Error
                    ? cause.message
                    : 'Impossible de charger l’espace élèves'
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function enregistrerSession(
        exerciceIds: number[],
    ): Promise<void> {
        const brancheId = brancheActiveId.value
        const classeId = classeActiveId.value
        if (brancheId === null || classeId === null) {
            throw new Error('Choisis une branche et une classe.')
        }
        const idsUniques = [...new Set(exerciceIds)]

        await db.transaction(
            'rw',
            db.sessions,
            db.exercices,
            db.themes,
            async () => {
                const themesValides = await db.themes
                    .where('brancheId')
                    .equals(brancheId)
                    .primaryKeys()
                const themesSet = new Set(themesValides)
                const exercicesExistants = await db.exercices.bulkGet(
                    idsUniques,
                )
                const idsValides = idsUniques.filter((_id, index) => {
                    const exercice = exercicesExistants[index]
                    return exercice !== undefined && themesSet.has(exercice.themeId)
                })
                const sessionExistante = await db.sessions
                    .where('[classeId+brancheId]')
                    .equals([classeId, brancheId])
                    .first()
                const maintenant = Date.now()

                if (sessionExistante?.id !== undefined) {
                    await db.sessions.update(sessionExistante.id, {
                        exerciceIds: idsValides,
                        modifieLe: maintenant,
                    })
                } else {
                    await db.sessions.add({
                        classeId,
                        brancheId,
                        nom: 'Espace élèves',
                        exerciceIds: idsValides,
                        creeLe: maintenant,
                        modifieLe: maintenant,
                    })
                }
            },
        )
    }

    return {
        session: readonly(session),
        themes: readonly(themes),
        exercices: readonly(exercices),
        chargement: readonly(chargement),
        erreur: readonly(erreur),
        enregistrerSession,
    }
}
