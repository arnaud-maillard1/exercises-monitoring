import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import { db } from '../data/database'
import type { Exercice, Session, Theme } from '../data/models'

const CLE_SESSION_COURANTE = 'sessionCouranteId'

function lireIdentifiantSession(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isInteger(valeur)
        ? valeur
        : null
}

export function useSessionActuelle() {
    const session = ref<Session | null>(null)
    const themes = ref<Theme[]>([])
    const exercices = ref<Exercice[]>([])
    const chargement = ref(true)
    const erreur = ref<string | null>(null)

    const subscription = liveQuery(async () => {
        const [configuration, themesStockes, exercicesStockes] =
            await Promise.all([
                db.configuration.get(CLE_SESSION_COURANTE),
                db.themes.orderBy('ordre').toArray(),
                db.exercices.toArray(),
            ])

        const sessionId = lireIdentifiantSession(configuration?.valeur)
        const sessionStockee = sessionId === null
            ? null
            : await db.sessions.get(sessionId) ?? null

        exercicesStockes.sort((premier, second) => {
            if (premier.themeId !== second.themeId) {
                return premier.themeId - second.themeId
            }

            return premier.ordre - second.ordre
        })

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
            erreur.value = cause instanceof Error
                ? cause.message
                : "Impossible de charger la session actuelle"
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function enregistrerSession(
        exerciceIds: number[],
    ): Promise<void> {
        const idsUniques = [...new Set(exerciceIds)]

        await db.transaction(
            'rw',
            db.sessions,
            db.configuration,
            db.exercices,
            async () => {
                const exercicesExistants = await db.exercices.bulkGet(idsUniques)
                const idsValides = idsUniques.filter(
                    (_id, index) => exercicesExistants[index] !== undefined,
                )
                const configuration = await db.configuration.get(
                    CLE_SESSION_COURANTE,
                )
                const sessionId = lireIdentifiantSession(
                    configuration?.valeur,
                )
                const sessionExistante = sessionId === null
                    ? undefined
                    : await db.sessions.get(sessionId)
                const maintenant = Date.now()

                let id: number

                if (sessionExistante?.id !== undefined) {
                    id = sessionExistante.id
                    await db.sessions.update(id, {
                        exerciceIds: idsValides,
                        modifieLe: maintenant,
                    })
                } else {
                    id = await db.sessions.add({
                        nom: 'Session actuelle',
                        exerciceIds: idsValides,
                        creeLe: maintenant,
                        modifieLe: maintenant,
                    })
                }

                await db.configuration.put({
                    cle: CLE_SESSION_COURANTE,
                    valeur: id,
                })
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
