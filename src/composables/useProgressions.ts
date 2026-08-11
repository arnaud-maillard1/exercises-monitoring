import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import { db } from '../data/database'
import type {
    Eleve,
    Etat,
    Exercice,
    Progression,
    Theme,
} from '../data/models'

export function useProgressions() {
    const eleves = ref<Eleve[]>([])
    const themes = ref<Theme[]>([])
    const exercices = ref<Exercice[]>([])
    const progressions = ref<Progression[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const [
            elevesStockes,
            themesStockes,
            exercicesStockes,
            progressionsStockees,
        ] = await Promise.all([
            db.eleves.orderBy('ordre').toArray(),
            db.themes.orderBy('ordre').toArray(),
            db.exercices.toArray(),
            db.progressions.toArray(),
        ])

        exercicesStockes.sort((premier, second) => {
            if (premier.themeId !== second.themeId) {
                return premier.themeId - second.themeId
            }

            return premier.ordre - second.ordre
        })

        return {
            eleves: elevesStockes,
            themes: themesStockes,
            exercices: exercicesStockes,
            progressions: progressionsStockees,
        }
    }).subscribe({
        next: (resultat) => {
            eleves.value = resultat.eleves
            themes.value = resultat.themes
            exercices.value = resultat.exercices
            progressions.value = resultat.progressions
            chargement.value = false
            erreur.value = null
        },
        error: (cause: unknown) => {
            chargement.value = false
            erreur.value = cause instanceof Error
                ? cause.message
                : "Impossible de charger le tableau de progression"
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function definirEtat(
        eleveId: number,
        exerciceId: number,
        etat: Etat,
    ): Promise<void> {
        const cle: [number, number] = [eleveId, exerciceId]

        if (etat === 'rien') {
            await db.progressions.delete(cle)
            return
        }

        await db.progressions.put({
            eleveId,
            exerciceId,
            etat,
        })
    }

    return {
        eleves: readonly(eleves),
        themes: readonly(themes),
        exercices: readonly(exercices),
        progressions: readonly(progressions),
        chargement: readonly(chargement),
        erreur: readonly(erreur),
        definirEtat,
    }
}
