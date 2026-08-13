import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import { db } from '../data/database'
import type { Eleve } from '../data/models'
import { useContexteScolaire } from './useContexteScolaire'
import { CLE_CLASSE_ACTIVE } from '../data/configuration'

export function useEleves() {
    const { classeActiveId } = useContexteScolaire()
    const eleves = ref<Eleve[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const configuration = await db.configuration.get(CLE_CLASSE_ACTIVE)
        const id = typeof configuration?.valeur === 'number'
            ? configuration.valeur
            : null
        if (id === null) return []
        const liste = await db.eleves
            .where('classeId')
            .equals(id)
            .toArray()
        return liste.sort((a, b) => a.ordre - b.ordre)
    }).subscribe({
        next: (resultat) => {
            eleves.value = resultat
            chargement.value = false
            erreur.value = null
        },
        error: (cause: unknown) => {
            chargement.value = false
            erreur.value = cause instanceof Error
                ? cause.message
                : "Impossible de charger les élèves"
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function ajouterEleve(nom: string): Promise<number> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error("Le nom de l'élève est obligatoire")
        }

        const classeId = classeActiveId.value
        if (classeId === null) {
            throw new Error('Choisis une classe avant d’ajouter un élève.')
        }

        return db.transaction('rw', db.eleves, async () => {
            const liste = await db.eleves
                .where('classeId')
                .equals(classeId)
                .toArray()
            const ordreMaximum = liste.reduce(
                (maximum, eleve) => Math.max(maximum, eleve.ordre),
                -1,
            )

            return db.eleves.add({
                classeId,
                nom: nomNettoye,
                ordre: ordreMaximum + 1,
                creeLe: Date.now(),
            })
        })
    }

    async function modifierEleve(id: number, nom: string): Promise<void> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error("Le nom de l'élève est obligatoire")
        }

        await db.eleves.update(id, { nom: nomNettoye })
    }

    async function supprimerEleve(id: number): Promise<void> {
        await db.transaction(
            'rw',
            db.eleves,
            db.progressions,
            async () => {
                await db.progressions
                    .where('eleveId')
                    .equals(id)
                    .delete()
                await db.eleves.delete(id)
            },
        )
    }

    async function deplacerEleve(
        id: number,
        direction: 'haut' | 'bas',
    ): Promise<void> {
        await db.transaction('rw', db.eleves, async () => {
            if (classeActiveId.value === null) return
            const liste = await db.eleves
                .where('classeId')
                .equals(classeActiveId.value)
                .toArray()
            liste.sort((a, b) => a.ordre - b.ordre)
            const index = liste.findIndex((eleve) => eleve.id === id)
            const indexCible = direction === 'haut' ? index - 1 : index + 1

            if (
                index === -1
                || indexCible < 0
                || indexCible >= liste.length
            ) {
                return
            }

            const eleve = liste[index]
            const eleveCible = liste[indexCible]

            await db.eleves.bulkPut([
                { ...eleve, ordre: eleveCible.ordre },
                { ...eleveCible, ordre: eleve.ordre },
            ])
        })
    }

    async function trierAlphabetiquement(): Promise<void> {
        await db.transaction('rw', db.eleves, async () => {
            if (classeActiveId.value === null) return
            const liste = await db.eleves
                .where('classeId')
                .equals(classeActiveId.value)
                .toArray()

            liste.sort((premier, second) =>
                premier.nom.localeCompare(second.nom, 'fr', {
                    sensitivity: 'base',
                }),
            )

            await db.eleves.bulkPut(
                liste.map((eleve, index) => ({
                    ...eleve,
                    ordre: index,
                })),
            )
        })
    }

    return {
        eleves: readonly(eleves),
        chargement: readonly(chargement),
        erreur: readonly(erreur),
        ajouterEleve,
        modifierEleve,
        supprimerEleve,
        deplacerEleve,
        trierAlphabetiquement,
    }
}
