import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import { db } from '../data/database'
import type { Eleve } from '../data/models'

export function useEleves() {
    const eleves = ref<Eleve[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(() =>
        db.eleves.orderBy('ordre').toArray(),
    ).subscribe({
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

        return db.transaction('rw', db.eleves, async () => {
            const dernier = await db.eleves.orderBy('ordre').last()

            return db.eleves.add({
                nom: nomNettoye,
                ordre: (dernier?.ordre ?? -1) + 1,
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
            const liste = await db.eleves.orderBy('ordre').toArray()
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
            const liste = await db.eleves.toArray()

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
