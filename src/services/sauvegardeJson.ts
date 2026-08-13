import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
    CLE_NOM_BRANCHE,
    lireNomBranche,
    NOM_CLASSE_PAR_DEFAUT,
} from '../data/configuration'
import { initialiserContexteScolaire } from '../data/contexte'
import { db } from '../data/database'
import type {
    Branche,
    Classe,
    ClasseBranche,
    Configuration,
    Eleve,
    Etat,
    Exercice,
    Progression,
    Session,
    Theme,
} from '../data/models'

export const CLE_DERNIERE_SAUVEGARDE = 'derniereSauvegarde'

type AvecId<T> = T & { id: number }

interface DonneesSauvegarde {
    branches: AvecId<Branche>[]
    classes: AvecId<Classe>[]
    classeBranches: ClasseBranche[]
    eleves: AvecId<Eleve>[]
    themes: AvecId<Theme>[]
    exercices: AvecId<Exercice>[]
    progressions: Progression[]
    sessions: AvecId<Session>[]
    configuration: Configuration[]
}

export interface SauvegardeJson {
    format: 'suivi-exercices'
    version: 2
    exporteLe: string
    donnees: DonneesSauvegarde
}

export interface ResumeSauvegarde {
    branches: number
    classes: number
    eleves: number
    themes: number
    exercices: number
    progressions: number
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
    return typeof valeur === 'object' && valeur !== null
        && !Array.isArray(valeur)
}

function objet(valeur: unknown, contexte: string): Record<string, unknown> {
    if (!estObjet(valeur)) throw new Error(`${contexte} doit être un objet`)
    return valeur
}

function tableau(
    source: Record<string, unknown>,
    cle: string,
): unknown[] {
    const valeur = source[cle]
    if (!Array.isArray(valeur)) {
        throw new Error(`La table « ${cle} » est absente ou invalide`)
    }
    return valeur
}

function entier(
    source: Record<string, unknown>,
    cle: string,
    contexte: string,
): number {
    const valeur = source[cle]
    if (
        typeof valeur !== 'number'
        || !Number.isSafeInteger(valeur)
        || valeur < 0
    ) {
        throw new Error(`${contexte}.${cle} doit être un entier positif`)
    }
    return valeur
}

function nombre(
    source: Record<string, unknown>,
    cle: string,
    contexte: string,
): number {
    const valeur = source[cle]
    if (typeof valeur !== 'number' || !Number.isFinite(valeur)) {
        throw new Error(`${contexte}.${cle} doit être un nombre`)
    }
    return valeur
}

function texte(
    source: Record<string, unknown>,
    cle: string,
    contexte: string,
): string {
    const valeur = source[cle]
    if (typeof valeur !== 'string' || !valeur.trim()) {
        throw new Error(`${contexte}.${cle} doit être un texte non vide`)
    }
    return valeur.trim()
}

function etat(valeur: unknown, contexte: string): Etat {
    if (valeur !== 'rien' && valeur !== 'en cours' && valeur !== 'terminé') {
        throw new Error(`${contexte}.etat est invalide`)
    }
    return valeur
}

function unicite(valeurs: string[], contexte: string): void {
    if (new Set(valeurs).size !== valeurs.length) {
        throw new Error(`${contexte} contient des identifiants en double`)
    }
}

function lireConfiguration(source: Record<string, unknown>): Configuration[] {
    const resultat = tableau(source, 'configuration').map((valeur, index) => {
        const ligne = objet(valeur, `configuration[${index}]`)
        return {
            cle: texte(ligne, 'cle', `configuration[${index}]`),
            valeur: ligne.valeur,
        }
    })
    unicite(resultat.map((element) => element.cle), 'configuration')
    return resultat
}

function lireProgressions(source: Record<string, unknown>): Progression[] {
    const resultat = tableau(source, 'progressions').map((valeur, index) => {
        const ligne = objet(valeur, `progressions[${index}]`)
        return {
            eleveId: entier(ligne, 'eleveId', `progressions[${index}]`),
            exerciceId: entier(
                ligne,
                'exerciceId',
                `progressions[${index}]`,
            ),
            etat: etat(ligne.etat, `progressions[${index}]`),
        }
    })
    unicite(
        resultat.map((item) => `${item.eleveId}:${item.exerciceId}`),
        'progressions',
    )
    return resultat
}

function analyserVersion2(racine: Record<string, unknown>): SauvegardeJson {
    const source = objet(racine.donnees, 'Les données')

    const branches = tableau(source, 'branches').map((valeur, index) => {
        const ligne = objet(valeur, `branches[${index}]`)
        return {
            id: entier(ligne, 'id', `branches[${index}]`),
            nom: texte(ligne, 'nom', `branches[${index}]`),
            ordre: nombre(ligne, 'ordre', `branches[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `branches[${index}]`),
        }
    })
    const classes = tableau(source, 'classes').map((valeur, index) => {
        const ligne = objet(valeur, `classes[${index}]`)
        return {
            id: entier(ligne, 'id', `classes[${index}]`),
            nom: texte(ligne, 'nom', `classes[${index}]`),
            ordre: nombre(ligne, 'ordre', `classes[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `classes[${index}]`),
        }
    })
    const classeBranches = tableau(source, 'classeBranches').map(
        (valeur, index) => {
            const ligne = objet(valeur, `classeBranches[${index}]`)
            return {
                classeId: entier(
                    ligne,
                    'classeId',
                    `classeBranches[${index}]`,
                ),
                brancheId: entier(
                    ligne,
                    'brancheId',
                    `classeBranches[${index}]`,
                ),
            }
        },
    )
    const eleves = tableau(source, 'eleves').map((valeur, index) => {
        const ligne = objet(valeur, `eleves[${index}]`)
        return {
            id: entier(ligne, 'id', `eleves[${index}]`),
            classeId: entier(ligne, 'classeId', `eleves[${index}]`),
            nom: texte(ligne, 'nom', `eleves[${index}]`),
            ordre: nombre(ligne, 'ordre', `eleves[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `eleves[${index}]`),
        }
    })
    const themes = tableau(source, 'themes').map((valeur, index) => {
        const ligne = objet(valeur, `themes[${index}]`)
        return {
            id: entier(ligne, 'id', `themes[${index}]`),
            brancheId: entier(ligne, 'brancheId', `themes[${index}]`),
            nom: texte(ligne, 'nom', `themes[${index}]`),
            ordre: nombre(ligne, 'ordre', `themes[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `themes[${index}]`),
        }
    })
    const exercices = tableau(source, 'exercices').map((valeur, index) => {
        const ligne = objet(valeur, `exercices[${index}]`)
        return {
            id: entier(ligne, 'id', `exercices[${index}]`),
            themeId: entier(ligne, 'themeId', `exercices[${index}]`),
            nom: texte(ligne, 'nom', `exercices[${index}]`),
            ordre: nombre(ligne, 'ordre', `exercices[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `exercices[${index}]`),
        }
    })
    const sessions = tableau(source, 'sessions').map((valeur, index) => {
        const ligne = objet(valeur, `sessions[${index}]`)
        if (!Array.isArray(ligne.exerciceIds)) {
            throw new Error(`sessions[${index}].exerciceIds est invalide`)
        }
        return {
            id: entier(ligne, 'id', `sessions[${index}]`),
            classeId: entier(ligne, 'classeId', `sessions[${index}]`),
            brancheId: entier(ligne, 'brancheId', `sessions[${index}]`),
            nom: texte(ligne, 'nom', `sessions[${index}]`),
            exerciceIds: ligne.exerciceIds.map((id, exerciceIndex) =>
                entier(
                    { id },
                    'id',
                    `sessions[${index}].exerciceIds[${exerciceIndex}]`,
                ),
            ),
            creeLe: nombre(ligne, 'creeLe', `sessions[${index}]`),
            modifieLe: nombre(ligne, 'modifieLe', `sessions[${index}]`),
        }
    })

    const donnees: DonneesSauvegarde = {
        branches,
        classes,
        classeBranches,
        eleves,
        themes,
        exercices,
        progressions: lireProgressions(source),
        sessions,
        configuration: lireConfiguration(source),
    }
    verifierReferences(donnees)

    return {
        format: 'suivi-exercices',
        version: 2,
        exporteLe: racine.exporteLe as string,
        donnees,
    }
}

/** Convertit les anciennes copies à branche et classe uniques. */
function analyserVersion1(racine: Record<string, unknown>): SauvegardeJson {
    const source = objet(racine.donnees, 'Les données')
    const configurationAncienne = lireConfiguration(source)
    const nomBranche = lireNomBranche(
        configurationAncienne.find((item) => item.cle === CLE_NOM_BRANCHE)
            ?.valeur,
    )
    const maintenant = Date.parse(racine.exporteLe as string)
    const brancheId = 1
    const classeId = 1

    const eleves = tableau(source, 'eleves').map((valeur, index) => {
        const ligne = objet(valeur, `eleves[${index}]`)
        return {
            id: entier(ligne, 'id', `eleves[${index}]`),
            classeId,
            nom: texte(ligne, 'nom', `eleves[${index}]`),
            ordre: nombre(ligne, 'ordre', `eleves[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `eleves[${index}]`),
        }
    })
    const themes = tableau(source, 'themes').map((valeur, index) => {
        const ligne = objet(valeur, `themes[${index}]`)
        return {
            id: entier(ligne, 'id', `themes[${index}]`),
            brancheId,
            nom: texte(ligne, 'nom', `themes[${index}]`),
            ordre: nombre(ligne, 'ordre', `themes[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `themes[${index}]`),
        }
    })
    const exercices = tableau(source, 'exercices').map((valeur, index) => {
        const ligne = objet(valeur, `exercices[${index}]`)
        return {
            id: entier(ligne, 'id', `exercices[${index}]`),
            themeId: entier(ligne, 'themeId', `exercices[${index}]`),
            nom: texte(ligne, 'nom', `exercices[${index}]`),
            ordre: nombre(ligne, 'ordre', `exercices[${index}]`),
            creeLe: nombre(ligne, 'creeLe', `exercices[${index}]`),
        }
    })
    const sessions = tableau(source, 'sessions').map((valeur, index) => {
        const ligne = objet(valeur, `sessions[${index}]`)
        if (!Array.isArray(ligne.exerciceIds)) {
            throw new Error(`sessions[${index}].exerciceIds est invalide`)
        }
        return {
            id: entier(ligne, 'id', `sessions[${index}]`),
            classeId,
            brancheId,
            nom: texte(ligne, 'nom', `sessions[${index}]`),
            exerciceIds: ligne.exerciceIds.map((id, exerciceIndex) =>
                entier(
                    { id },
                    'id',
                    `sessions[${index}].exerciceIds[${exerciceIndex}]`,
                ),
            ),
            creeLe: nombre(ligne, 'creeLe', `sessions[${index}]`),
            modifieLe: nombre(ligne, 'modifieLe', `sessions[${index}]`),
        }
    })
    const configuration = configurationAncienne.filter(
        (item) =>
            item.cle !== CLE_NOM_BRANCHE
            && item.cle !== 'sessionCouranteId',
    )
    configuration.push(
        { cle: CLE_BRANCHE_ACTIVE, valeur: brancheId },
        { cle: CLE_CLASSE_ACTIVE, valeur: classeId },
    )

    const donnees: DonneesSauvegarde = {
        branches: [{
            id: brancheId,
            nom: nomBranche,
            ordre: 0,
            creeLe: maintenant,
        }],
        classes: [{
            id: classeId,
            nom: NOM_CLASSE_PAR_DEFAUT,
            ordre: 0,
            creeLe: maintenant,
        }],
        classeBranches: [{ classeId, brancheId }],
        eleves,
        themes,
        exercices,
        progressions: lireProgressions(source),
        sessions,
        configuration,
    }
    verifierReferences(donnees)

    return {
        format: 'suivi-exercices',
        version: 2,
        exporteLe: racine.exporteLe as string,
        donnees,
    }
}

function verifierReferences(donnees: DonneesSauvegarde): void {
    if (donnees.branches.length === 0 || donnees.classes.length === 0) {
        throw new Error('La copie doit contenir au moins une classe et une branche')
    }
    const brancheIds = new Set(donnees.branches.map((item) => item.id))
    const classeIds = new Set(donnees.classes.map((item) => item.id))
    const eleveIds = new Set(donnees.eleves.map((item) => item.id))
    const themeIds = new Set(donnees.themes.map((item) => item.id))
    const exerciceIds = new Set(donnees.exercices.map((item) => item.id))

    unicite(donnees.branches.map((item) => String(item.id)), 'branches')
    unicite(donnees.classes.map((item) => String(item.id)), 'classes')
    unicite(donnees.eleves.map((item) => String(item.id)), 'eleves')
    unicite(donnees.themes.map((item) => String(item.id)), 'themes')
    unicite(donnees.exercices.map((item) => String(item.id)), 'exercices')
    unicite(donnees.sessions.map((item) => String(item.id)), 'sessions')
    unicite(
        donnees.classeBranches.map(
            (item) => `${item.classeId}:${item.brancheId}`,
        ),
        'classeBranches',
    )

    for (const association of donnees.classeBranches) {
        if (
            !classeIds.has(association.classeId)
            || !brancheIds.has(association.brancheId)
        ) {
            throw new Error('Une association référence une classe ou une branche absente')
        }
    }
    for (const classe of donnees.classes) {
        if (!donnees.classeBranches.some(
            (association) => association.classeId === classe.id,
        )) {
            throw new Error(`La classe « ${classe.nom} » ne possède aucune branche`)
        }
    }
    for (const eleve of donnees.eleves) {
        if (!classeIds.has(eleve.classeId)) {
            throw new Error(`L’élève « ${eleve.nom} » référence une classe absente`)
        }
    }
    for (const theme of donnees.themes) {
        if (!brancheIds.has(theme.brancheId)) {
            throw new Error(`Le thème « ${theme.nom} » référence une branche absente`)
        }
    }
    for (const exercice of donnees.exercices) {
        if (!themeIds.has(exercice.themeId)) {
            throw new Error(`L’exercice « ${exercice.nom} » référence un thème absent`)
        }
    }
    for (const progression of donnees.progressions) {
        if (
            !eleveIds.has(progression.eleveId)
            || !exerciceIds.has(progression.exerciceId)
        ) {
            throw new Error('Une progression référence un élève ou un exercice absent')
        }
    }
    for (const session of donnees.sessions) {
        if (
            !classeIds.has(session.classeId)
            || !brancheIds.has(session.brancheId)
            || session.exerciceIds.some((id) => !exerciceIds.has(id))
        ) {
            throw new Error(`La session « ${session.nom} » contient une référence absente`)
        }
    }
}

function analyserSauvegarde(contenu: unknown): SauvegardeJson {
    const racine = objet(contenu, 'Le fichier')
    if (racine.format !== 'suivi-exercices') {
        throw new Error('Ce fichier ne correspond pas à une copie compatible')
    }
    if (
        typeof racine.exporteLe !== 'string'
        || Number.isNaN(Date.parse(racine.exporteLe))
    ) {
        throw new Error('La date de la copie est invalide')
    }
    if (racine.version === 1) return analyserVersion1(racine)
    if (racine.version === 2) return analyserVersion2(racine)
    throw new Error('Cette version de copie n’est pas prise en charge')
}

function nomFichier(date: Date): string {
    const datePart = date.toISOString().slice(0, 10)
    const heurePart = `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`
    return `suivi-exercices-${datePart}-${heurePart}.suiviexos`
}

function telecharger(contenu: string, nom: string): void {
    const url = URL.createObjectURL(
        new Blob([contenu], { type: 'application/json;charset=utf-8' }),
    )
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
    const date = new Date(horodatage)
    const donnees = await db.transaction(
        'r',
        [
            db.branches,
            db.classes,
            db.classeBranches,
            db.eleves,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            db.configuration,
        ],
        async (): Promise<DonneesSauvegarde> => {
            const [
                branches,
                classes,
                classeBranches,
                eleves,
                themes,
                exercices,
                progressions,
                sessions,
                configuration,
            ] = await Promise.all([
                db.branches.toArray(),
                db.classes.toArray(),
                db.classeBranches.toArray(),
                db.eleves.toArray(),
                db.themes.toArray(),
                db.exercices.toArray(),
                db.progressions.toArray(),
                db.sessions.toArray(),
                db.configuration.toArray(),
            ])
            return {
                branches: branches as AvecId<Branche>[],
                classes: classes as AvecId<Classe>[],
                classeBranches,
                eleves: eleves as AvecId<Eleve>[],
                themes: themes as AvecId<Theme>[],
                exercices: exercices as AvecId<Exercice>[],
                progressions,
                sessions: sessions as AvecId<Session>[],
                configuration: [
                    ...configuration.filter(
                        (item) => item.cle !== CLE_DERNIERE_SAUVEGARDE,
                    ),
                    { cle: CLE_DERNIERE_SAUVEGARDE, valeur: horodatage },
                ],
            }
        },
    )
    const sauvegarde: SauvegardeJson = {
        format: 'suivi-exercices',
        version: 2,
        exporteLe: date.toISOString(),
        donnees,
    }
    telecharger(JSON.stringify(sauvegarde, null, 2), nomFichier(date))
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
        throw new Error('Le fichier sélectionné n’est pas une copie valide')
    }
    const sauvegarde = analyserSauvegarde(contenu)
    return {
        sauvegarde,
        resume: {
            branches: sauvegarde.donnees.branches.length,
            classes: sauvegarde.donnees.classes.length,
            eleves: sauvegarde.donnees.eleves.length,
            themes: sauvegarde.donnees.themes.length,
            exercices: sauvegarde.donnees.exercices.length,
            progressions: sauvegarde.donnees.progressions.length,
        },
    }
}

export async function restaurerSauvegarde(
    sauvegarde: SauvegardeJson,
): Promise<void> {
    const donnees = sauvegarde.donnees
    await db.transaction(
        'rw',
        [
            db.branches,
            db.classes,
            db.classeBranches,
            db.eleves,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            db.configuration,
        ],
        async () => {
            await Promise.all([
                db.progressions.clear(),
                db.sessions.clear(),
                db.exercices.clear(),
                db.themes.clear(),
                db.eleves.clear(),
                db.classeBranches.clear(),
                db.branches.clear(),
                db.classes.clear(),
                db.configuration.clear(),
            ])
            await db.branches.bulkPut(donnees.branches)
            await db.classes.bulkPut(donnees.classes)
            await db.classeBranches.bulkPut(donnees.classeBranches)
            await db.eleves.bulkPut(donnees.eleves)
            await db.themes.bulkPut(donnees.themes)
            await db.exercices.bulkPut(donnees.exercices)
            await db.progressions.bulkPut(donnees.progressions)
            await db.sessions.bulkPut(donnees.sessions)
            await db.configuration.bulkPut(donnees.configuration)
        },
    )
    await initialiserContexteScolaire()
}

export async function recommencerAZero(): Promise<void> {
    await db.transaction(
        'rw',
        [
            db.branches,
            db.classes,
            db.classeBranches,
            db.eleves,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
            db.configuration,
        ],
        async () => {
            await Promise.all([
                db.progressions.clear(),
                db.sessions.clear(),
                db.exercices.clear(),
                db.themes.clear(),
                db.eleves.clear(),
                db.classeBranches.clear(),
                db.branches.clear(),
                db.classes.clear(),
                db.configuration.clear(),
            ])
        },
    )
    await initialiserContexteScolaire()
}
