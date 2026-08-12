import { db } from '../data/database'
import {
    CLE_NOM_BRANCHE,
    lireNomBranche,
    nomPourFichier,
} from '../data/configuration'
import type {
    Configuration,
    Eleve,
    Etat,
    Exercice,
    Progression,
    Session,
    Theme,
} from '../data/models'

export const CLE_DERNIERE_SAUVEGARDE = 'derniereSauvegarde'

type EleveSauvegarde = Eleve & { id: number }
type ThemeSauvegarde = Theme & { id: number }
type ExerciceSauvegarde = Exercice & { id: number }
type SessionSauvegarde = Session & { id: number }

interface DonneesSauvegarde {
    eleves: EleveSauvegarde[]
    themes: ThemeSauvegarde[]
    exercices: ExerciceSauvegarde[]
    progressions: Progression[]
    sessions: SessionSauvegarde[]
    configuration: Configuration[]
}

export interface SauvegardeJson {
    format: 'suivi-exercices'
    version: 1
    exporteLe: string
    donnees: DonneesSauvegarde
}

export interface ResumeSauvegarde {
    nomBranche: string
    eleves: number
    themes: number
    exercices: number
    progressions: number
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null
        && !Array.isArray(valeur)
}

function lireObjet(
    valeur: unknown,
    contexte: string,
): Record<string, unknown> {
    if (!estObjet(valeur)) {
        throw new Error(`${contexte} doit être un objet`)
    }

    return valeur
}

function lireTableau(
    objet: Record<string, unknown>,
    cle: string,
): unknown[] {
    const valeur = objet[cle]

    if (!Array.isArray(valeur)) {
        throw new Error(`La table « ${cle} » est absente ou invalide`)
    }

    return valeur
}

function lireEntier(
    objet: Record<string, unknown>,
    cle: string,
    contexte: string,
): number {
    const valeur = objet[cle]

    if (
        typeof valeur !== 'number'
        || !Number.isSafeInteger(valeur)
        || valeur < 0
    ) {
        throw new Error(`${contexte}.${cle} doit être un entier positif`)
    }

    return valeur
}

function lireNombre(
    objet: Record<string, unknown>,
    cle: string,
    contexte: string,
): number {
    const valeur = objet[cle]

    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
        throw new Error(`${contexte}.${cle} doit être un nombre`)
    }

    return valeur
}

function lireTexte(
    objet: Record<string, unknown>,
    cle: string,
    contexte: string,
): string {
    const valeur = objet[cle]

    if (typeof valeur !== 'string' || valeur.trim().length === 0) {
        throw new Error(`${contexte}.${cle} doit être un texte non vide`)
    }

    return valeur
}

function lireEtat(valeur: unknown, contexte: string): Etat {
    if (
        valeur !== 'rien'
        && valeur !== 'en cours'
        && valeur !== 'terminé'
    ) {
        throw new Error(`${contexte}.etat est invalide`)
    }

    return valeur
}

function verifierUnicite(
    valeurs: readonly string[],
    contexte: string,
): void {
    if (new Set(valeurs).size !== valeurs.length) {
        throw new Error(`${contexte} contient des identifiants en double`)
    }
}

function analyserSauvegarde(contenu: unknown): SauvegardeJson {
    const racine = lireObjet(contenu, 'Le fichier')

    if (racine.format !== 'suivi-exercices' || racine.version !== 1) {
        throw new Error('Ce fichier ne correspond pas à une sauvegarde compatible')
    }

    if (
        typeof racine.exporteLe !== 'string'
        || Number.isNaN(Date.parse(racine.exporteLe))
    ) {
        throw new Error("La date d'export de la sauvegarde est invalide")
    }

    const donneesBrutes = lireObjet(racine.donnees, 'Les données')

    const eleves: EleveSauvegarde[] = lireTableau(
        donneesBrutes,
        'eleves',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `eleves[${index}]`)

        return {
            id: lireEntier(objet, 'id', `eleves[${index}]`),
            nom: lireTexte(objet, 'nom', `eleves[${index}]`),
            ordre: lireNombre(objet, 'ordre', `eleves[${index}]`),
            creeLe: lireNombre(objet, 'creeLe', `eleves[${index}]`),
        }
    })

    const themes: ThemeSauvegarde[] = lireTableau(
        donneesBrutes,
        'themes',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `themes[${index}]`)

        return {
            id: lireEntier(objet, 'id', `themes[${index}]`),
            nom: lireTexte(objet, 'nom', `themes[${index}]`),
            ordre: lireNombre(objet, 'ordre', `themes[${index}]`),
            creeLe: lireNombre(objet, 'creeLe', `themes[${index}]`),
        }
    })

    const exercices: ExerciceSauvegarde[] = lireTableau(
        donneesBrutes,
        'exercices',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `exercices[${index}]`)

        return {
            id: lireEntier(objet, 'id', `exercices[${index}]`),
            themeId: lireEntier(
                objet,
                'themeId',
                `exercices[${index}]`,
            ),
            nom: lireTexte(objet, 'nom', `exercices[${index}]`),
            ordre: lireNombre(objet, 'ordre', `exercices[${index}]`),
            creeLe: lireNombre(objet, 'creeLe', `exercices[${index}]`),
        }
    })

    const progressions: Progression[] = lireTableau(
        donneesBrutes,
        'progressions',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `progressions[${index}]`)

        return {
            eleveId: lireEntier(
                objet,
                'eleveId',
                `progressions[${index}]`,
            ),
            exerciceId: lireEntier(
                objet,
                'exerciceId',
                `progressions[${index}]`,
            ),
            etat: lireEtat(objet.etat, `progressions[${index}]`),
        }
    })

    const sessions: SessionSauvegarde[] = lireTableau(
        donneesBrutes,
        'sessions',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `sessions[${index}]`)
        const exerciceIdsBruts = objet.exerciceIds

        if (!Array.isArray(exerciceIdsBruts)) {
            throw new Error(`sessions[${index}].exerciceIds est invalide`)
        }

        return {
            id: lireEntier(objet, 'id', `sessions[${index}]`),
            nom: lireTexte(objet, 'nom', `sessions[${index}]`),
            exerciceIds: exerciceIdsBruts.map((id, exerciceIndex) =>
                lireEntier(
                    { id },
                    'id',
                    `sessions[${index}].exerciceIds[${exerciceIndex}]`,
                ),
            ),
            creeLe: lireNombre(objet, 'creeLe', `sessions[${index}]`),
            modifieLe: lireNombre(
                objet,
                'modifieLe',
                `sessions[${index}]`,
            ),
        }
    })

    const configuration: Configuration[] = lireTableau(
        donneesBrutes,
        'configuration',
    ).map((valeur, index) => {
        const objet = lireObjet(valeur, `configuration[${index}]`)

        return {
            cle: lireTexte(objet, 'cle', `configuration[${index}]`),
            valeur: objet.valeur,
        }
    })

    verifierUnicite(eleves.map((eleve) => String(eleve.id)), 'eleves')
    verifierUnicite(themes.map((theme) => String(theme.id)), 'themes')
    verifierUnicite(
        exercices.map((exercice) => String(exercice.id)),
        'exercices',
    )
    verifierUnicite(sessions.map((session) => String(session.id)), 'sessions')
    verifierUnicite(
        configuration.map((element) => element.cle),
        'configuration',
    )
    verifierUnicite(
        progressions.map(
            (progression) =>
                `${progression.eleveId}:${progression.exerciceId}`,
        ),
        'progressions',
    )

    const eleveIds = new Set(eleves.map((eleve) => eleve.id))
    const themeIds = new Set(themes.map((theme) => theme.id))
    const exerciceIds = new Set(exercices.map((exercice) => exercice.id))
    const sessionIds = new Set(sessions.map((session) => session.id))

    for (const exercice of exercices) {
        if (!themeIds.has(exercice.themeId)) {
            throw new Error(`L'exercice « ${exercice.nom} » référence un thème absent`)
        }
    }

    for (const progression of progressions) {
        if (
            !eleveIds.has(progression.eleveId)
            || !exerciceIds.has(progression.exerciceId)
        ) {
            throw new Error('Une progression référence un élève ou un exercice absent')
        }
    }

    for (const session of sessions) {
        verifierUnicite(
            session.exerciceIds.map(String),
            `La session « ${session.nom} »`,
        )

        if (session.exerciceIds.some((id) => !exerciceIds.has(id))) {
            throw new Error(`La session « ${session.nom} » référence un exercice absent`)
        }
    }

    const sessionCourante = configuration.find(
        (element) => element.cle === 'sessionCouranteId',
    )

    if (
        sessionCourante !== undefined
        && (
            typeof sessionCourante.valeur !== 'number'
            || !sessionIds.has(sessionCourante.valeur)
        )
    ) {
        throw new Error('La session actuelle de la sauvegarde est invalide')
    }

    return {
        format: 'suivi-exercices',
        version: 1,
        exporteLe: racine.exporteLe,
        donnees: {
            eleves,
            themes,
            exercices,
            progressions,
            sessions,
            configuration,
        },
    }
}

function resume(sauvegarde: SauvegardeJson): ResumeSauvegarde {
    const configurationNom = sauvegarde.donnees.configuration.find(
        (element) => element.cle === CLE_NOM_BRANCHE,
    )

    return {
        nomBranche: lireNomBranche(configurationNom?.valeur),
        eleves: sauvegarde.donnees.eleves.length,
        themes: sauvegarde.donnees.themes.length,
        exercices: sauvegarde.donnees.exercices.length,
        progressions: sauvegarde.donnees.progressions.length,
    }
}

function nomFichier(nomBranche: string, date: Date): string {
    const annee = date.getFullYear()
    const mois = String(date.getMonth() + 1).padStart(2, '0')
    const jour = String(date.getDate()).padStart(2, '0')
    const heures = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${nomPourFichier(nomBranche)}-${annee}-${mois}-${jour}-${heures}${minutes}.suiviexos`
}

function telechargerJson(contenu: string, nom: string): void {
    const url = URL.createObjectURL(new Blob([contenu], {
        type: 'application/json;charset=utf-8',
    }))
    const lien = document.createElement('a')

    lien.href = url
    lien.download = nom
    document.body.append(lien)
    lien.click()
    lien.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function exporterSauvegardeJson(): Promise<void> {
    const horodatage = Date.now()
    const dateExport = new Date(horodatage)
    const donnees = await db.transaction(
        'r',
        [
            db.eleves,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            db.configuration,
        ],
        async () => {
            const [
                eleves,
                themes,
                exercices,
                progressions,
                sessions,
                configuration,
            ] = await Promise.all([
                db.eleves.toArray(),
                db.themes.toArray(),
                db.exercices.toArray(),
                db.progressions.toArray(),
                db.sessions.toArray(),
                db.configuration.toArray(),
            ])

            return {
                eleves: eleves as EleveSauvegarde[],
                themes: themes as ThemeSauvegarde[],
                exercices: exercices as ExerciceSauvegarde[],
                progressions,
                sessions: sessions as SessionSauvegarde[],
                configuration: [
                    ...configuration.filter(
                        (element) =>
                            element.cle !== CLE_DERNIERE_SAUVEGARDE,
                    ),
                    {
                        cle: CLE_DERNIERE_SAUVEGARDE,
                        valeur: horodatage,
                    },
                ],
            }
        },
    )

    const sauvegarde: SauvegardeJson = {
        format: 'suivi-exercices',
        version: 1,
        exporteLe: dateExport.toISOString(),
        donnees,
    }
    const configurationNom = donnees.configuration.find(
        (element) => element.cle === CLE_NOM_BRANCHE,
    )
    const nomBranche = lireNomBranche(configurationNom?.valeur)

    telechargerJson(
        JSON.stringify(sauvegarde, null, 2),
        nomFichier(nomBranche, dateExport),
    )

    await db.configuration.put({
        cle: CLE_DERNIERE_SAUVEGARDE,
        valeur: horodatage,
    })
}

export async function analyserFichierSauvegarde(
    fichier: File,
): Promise<{ sauvegarde: SauvegardeJson; resume: ResumeSauvegarde }> {
    let contenu: unknown

    try {
        contenu = JSON.parse(await fichier.text()) as unknown
    } catch {
        throw new Error("Le fichier sélectionné n'est pas une copie valide")
    }

    const sauvegarde = analyserSauvegarde(contenu)
    return { sauvegarde, resume: resume(sauvegarde) }
}

export async function restaurerSauvegarde(
    sauvegarde: SauvegardeJson,
): Promise<void> {
    const donnees = sauvegarde.donnees

    await db.transaction(
        'rw',
        [
            db.eleves,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            db.configuration,
        ],
        async () => {
            await db.progressions.clear()
            await db.sessions.clear()
            await db.exercices.clear()
            await db.themes.clear()
            await db.eleves.clear()
            await db.configuration.clear()

            if (donnees.eleves.length > 0) {
                await db.eleves.bulkPut(donnees.eleves)
            }
            if (donnees.themes.length > 0) {
                await db.themes.bulkPut(donnees.themes)
            }
            if (donnees.exercices.length > 0) {
                await db.exercices.bulkPut(donnees.exercices)
            }
            if (donnees.progressions.length > 0) {
                await db.progressions.bulkPut(donnees.progressions)
            }
            if (donnees.sessions.length > 0) {
                await db.sessions.bulkPut(donnees.sessions)
            }
            if (donnees.configuration.length > 0) {
                await db.configuration.bulkPut(donnees.configuration)
            }
        },
    )
}
