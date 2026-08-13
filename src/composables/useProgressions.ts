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
import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
} from '../data/configuration'

export function useProgressions() {
    const eleves = ref<Eleve[]>([])
    const themes = ref<Theme[]>([])
    const exercices = ref<Exercice[]>([])
    const progressions = ref<Progression[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const configuration = await db.configuration.bulkGet([
            CLE_BRANCHE_ACTIVE,
            CLE_CLASSE_ACTIVE,
        ])
        const brancheId = typeof configuration[0]?.valeur === 'number'
            ? configuration[0].valeur
            : null
        const classeId = typeof configuration[1]?.valeur === 'number'
            ? configuration[1].valeur
            : null
        if (brancheId === null || classeId === null) {
            return {
                eleves: [],
                themes: [],
                exercices: [],
                progressions: [],
            }
        }

        const elevesStockes = await db.eleves
            .where('classeId')
            .equals(classeId)
            .toArray()
        elevesStockes.sort((a, b) => a.ordre - b.ordre)
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
        const eleveIds = elevesStockes.map((eleve) => eleve.id!)
        const exerciceIds = exercicesStockes.map(
            (exercice) => exercice.id!,
        )
        const progressionsStockees =
            eleveIds.length && exerciceIds.length
                ? (await db.progressions
                      .where('eleveId')
                      .anyOf(eleveIds)
                      .toArray()
                  ).filter((progression) =>
                      exerciceIds.includes(progression.exerciceId),
                  )
                : []

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
