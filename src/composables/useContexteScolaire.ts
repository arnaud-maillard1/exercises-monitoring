import { liveQuery } from 'dexie'
import {
    computed,
    readonly,
    ref,
} from 'vue'
import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
} from '../data/configuration'
import { db } from '../data/database'
import type {
    Branche,
    Classe,
    ClasseBranche,
} from '../data/models'

const branches = ref<Branche[]>([])
const classes = ref<Classe[]>([])
const associations = ref<ClasseBranche[]>([])
const brancheActiveId = ref<number | null>(null)
const classeActiveId = ref<number | null>(null)
const chargement = ref(true)
const erreur = ref<string | null>(null)
let fluxInitialise = false

function identifiant(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isInteger(valeur)
        ? valeur
        : null
}

function messageErreur(cause: unknown): string {
    return cause instanceof Error
        ? cause.message
        : 'Une erreur inattendue est survenue.'
}

function initialiserFlux(): void {
    if (fluxInitialise) return
    fluxInitialise = true

    liveQuery(async () => {
        const [listeBranches, listeClasses, listeAssociations, config] =
            await Promise.all([
                db.branches.orderBy('ordre').toArray(),
                db.classes.orderBy('ordre').toArray(),
                db.classeBranches.toArray(),
                db.configuration.bulkGet([
                    CLE_BRANCHE_ACTIVE,
                    CLE_CLASSE_ACTIVE,
                ]),
            ])
        return {
            listeBranches,
            listeClasses,
            listeAssociations,
            brancheConfiguree: identifiant(config[0]?.valeur),
            classeConfiguree: identifiant(config[1]?.valeur),
        }
    }).subscribe({
        next: (donnees) => {
            branches.value = donnees.listeBranches
            classes.value = donnees.listeClasses
            associations.value = donnees.listeAssociations

            const classeId = donnees.listeClasses.some(
                (classe) => classe.id === donnees.classeConfiguree,
            )
                ? donnees.classeConfiguree
                : (donnees.listeClasses[0]?.id ?? null)
            const branchesLiees = donnees.listeAssociations
                .filter(
                    (association) =>
                        association.classeId === classeId,
                )
                .map((association) => association.brancheId)
            const brancheId = branchesLiees.includes(
                donnees.brancheConfiguree ?? -1,
            )
                ? donnees.brancheConfiguree
                : (donnees.listeBranches.find((branche) =>
                      branchesLiees.includes(branche.id!),
                  )?.id ?? null)

            brancheActiveId.value = brancheId
            classeActiveId.value = classeId
            chargement.value = false
            erreur.value = null

            if (
                brancheId !== donnees.brancheConfiguree
                || classeId !== donnees.classeConfiguree
            ) {
                void db.transaction('rw', db.configuration, async () => {
                    if (brancheId === null) {
                        await db.configuration.delete(CLE_BRANCHE_ACTIVE)
                    } else {
                        await db.configuration.put({
                            cle: CLE_BRANCHE_ACTIVE,
                            valeur: brancheId,
                        })
                    }
                    if (classeId === null) {
                        await db.configuration.delete(CLE_CLASSE_ACTIVE)
                    } else {
                        await db.configuration.put({
                            cle: CLE_CLASSE_ACTIVE,
                            valeur: classeId,
                        })
                    }
                }).catch((cause: unknown) => {
                    erreur.value = messageErreur(cause)
                })
            }
        },
        error: (cause) => {
            erreur.value = messageErreur(cause)
            chargement.value = false
        },
    })
}

async function selectionnerBranche(id: number): Promise<void> {
    if (classeActiveId.value === null) return
    const branche = await db.branches.get(id)
    if (!branche) throw new Error('Cette branche n’existe plus.')
    const association = await db.classeBranches.get([
        classeActiveId.value,
        id,
    ])
    if (!association) {
        throw new Error('Cette branche n’est pas liée à la classe choisie.')
    }
    await db.configuration.put({
        cle: CLE_BRANCHE_ACTIVE,
        valeur: id,
    })
}

async function selectionnerClasse(id: number): Promise<void> {
    const classe = await db.classes.get(id)
    if (!classe) throw new Error('Cette classe n’existe plus.')

    const branchesLiees = await db.classeBranches
        .where('classeId')
        .equals(id)
        .toArray()
    const brancheActuelleToujoursLiee = branchesLiees.some(
        (association) => association.brancheId === brancheActiveId.value,
    )
    const prochaineBrancheId = brancheActuelleToujoursLiee
        ? brancheActiveId.value
        : (branchesLiees[0]?.brancheId ?? null)

    await db.transaction('rw', db.configuration, async () => {
        await db.configuration.put({
            cle: CLE_CLASSE_ACTIVE,
            valeur: id,
        })
        if (prochaineBrancheId === null) {
            await db.configuration.delete(CLE_BRANCHE_ACTIVE)
        } else {
            await db.configuration.put({
                cle: CLE_BRANCHE_ACTIVE,
                valeur: prochaineBrancheId,
            })
        }
    })
}

function nettoyerNom(nom: string, type: string): string {
    const nomNettoye = nom.trim()
    if (!nomNettoye) throw new Error(`Le nom de ${type} est obligatoire.`)
    return nomNettoye
}

async function ajouterBranche(
    nom: string,
    classeIds: number[],
): Promise<number> {
    const ids = [...new Set(classeIds)]
    if (ids.length === 0) {
        throw new Error('Choisis au moins une classe pour cette branche.')
    }
    const nomNettoye = nettoyerNom(nom, 'la branche')

    return db.transaction(
        'rw',
        db.branches,
        db.classes,
        db.classeBranches,
        db.configuration,
        async () => {
            const classesExistantes = await db.classes.bulkGet(ids)
            if (classesExistantes.some((classe) => !classe)) {
                throw new Error('Une classe sélectionnée n’existe plus.')
            }
            const derniere = await db.branches.orderBy('ordre').last()
            const id = await db.branches.add({
                nom: nomNettoye,
                ordre: (derniere?.ordre ?? -1) + 1,
                creeLe: Date.now(),
            })
            await db.classeBranches.bulkAdd(
                ids.map((classeId) => ({ classeId, brancheId: id })),
            )
            await db.configuration.bulkPut([
                { cle: CLE_BRANCHE_ACTIVE, valeur: id },
                { cle: CLE_CLASSE_ACTIVE, valeur: ids[0] },
            ])
            return id
        },
    )
}

async function ajouterClasse(
    nom: string,
    brancheIds: number[],
): Promise<number> {
    const ids = [...new Set(brancheIds)]
    if (ids.length === 0) {
        throw new Error('Choisis au moins une branche pour cette classe.')
    }
    const nomNettoye = nettoyerNom(nom, 'la classe')

    return db.transaction(
        'rw',
        db.branches,
        db.classes,
        db.classeBranches,
        db.configuration,
        async () => {
            const branchesExistantes = await db.branches.bulkGet(ids)
            if (branchesExistantes.some((branche) => !branche)) {
                throw new Error('Une branche sélectionnée n’existe plus.')
            }
            const derniere = await db.classes.orderBy('ordre').last()
            const id = await db.classes.add({
                nom: nomNettoye,
                ordre: (derniere?.ordre ?? -1) + 1,
                creeLe: Date.now(),
            })
            await db.classeBranches.bulkAdd(
                ids.map((brancheId) => ({ classeId: id, brancheId })),
            )
            await db.configuration.bulkPut([
                { cle: CLE_BRANCHE_ACTIVE, valeur: ids[0] },
                { cle: CLE_CLASSE_ACTIVE, valeur: id },
            ])
            return id
        },
    )
}

async function renommerBranche(id: number, nom: string): Promise<void> {
    await db.branches.update(id, {
        nom: nettoyerNom(nom, 'la branche'),
    })
}

async function renommerClasse(id: number, nom: string): Promise<void> {
    await db.classes.update(id, {
        nom: nettoyerNom(nom, 'la classe'),
    })
}

async function definirBranchesClasse(
    classeId: number,
    brancheIds: number[],
): Promise<void> {
    const ids = [...new Set(brancheIds)]
    if (ids.length === 0) {
        throw new Error('Une classe doit garder au moins une branche.')
    }
    await db.transaction(
        'rw',
        db.branches,
        db.classes,
        db.classeBranches,
        async () => {
            if (!(await db.classes.get(classeId))) {
                throw new Error('Cette classe n’existe plus.')
            }
            const branchesExistantes = await db.branches.bulkGet(ids)
            if (branchesExistantes.some((branche) => !branche)) {
                throw new Error('Une branche sélectionnée n’existe plus.')
            }
            await db.classeBranches
                .where('classeId')
                .equals(classeId)
                .delete()
            await db.classeBranches.bulkAdd(
                ids.map((brancheId) => ({ classeId, brancheId })),
            )
        },
    )
}

async function supprimerBranche(id: number): Promise<void> {
    if ((await db.branches.count()) <= 1) {
        throw new Error('Il faut conserver au moins une branche.')
    }
    const associationsDeLaBranche = await db.classeBranches
        .where('brancheId')
        .equals(id)
        .toArray()
    for (const association of associationsDeLaBranche) {
        const nombreBranches = await db.classeBranches
            .where('classeId')
            .equals(association.classeId)
            .count()
        if (nombreBranches <= 1) {
            const classe = await db.classes.get(association.classeId)
            throw new Error(
                `« ${classe?.nom ?? 'Cette classe'} » utilise uniquement cette branche. Associe-lui d’abord une autre branche.`,
            )
        }
    }
    await db.transaction(
        'rw',
        [
            db.branches,
            db.classeBranches,
            db.themes,
            db.exercices,
            db.progressions,
            db.sessions,
        ],
        async () => {
            const themes = await db.themes
                .where('brancheId')
                .equals(id)
                .toArray()
            const themeIds = themes.map((theme) => theme.id!)
            const exercices = themeIds.length
                ? await db.exercices.where('themeId').anyOf(themeIds).toArray()
                : []
            const exerciceIds = exercices.map((exercice) => exercice.id!)
            if (exerciceIds.length) {
                await db.progressions
                    .where('exerciceId')
                    .anyOf(exerciceIds)
                    .delete()
                await db.exercices.bulkDelete(exerciceIds)
            }
            if (themeIds.length) await db.themes.bulkDelete(themeIds)
            await db.sessions.where('brancheId').equals(id).delete()
            await db.classeBranches.where('brancheId').equals(id).delete()
            await db.branches.delete(id)
        },
    )
}

async function supprimerClasse(id: number): Promise<void> {
    if ((await db.classes.count()) <= 1) {
        throw new Error('Il faut conserver au moins une classe.')
    }
    await db.transaction(
        'rw',
        db.classes,
        db.classeBranches,
        db.eleves,
        db.progressions,
        db.sessions,
        async () => {
            const eleves = await db.eleves
                .where('classeId')
                .equals(id)
                .toArray()
            const eleveIds = eleves.map((eleve) => eleve.id!)
            if (eleveIds.length) {
                await db.progressions
                    .where('eleveId')
                    .anyOf(eleveIds)
                    .delete()
                await db.eleves.bulkDelete(eleveIds)
            }
            await db.sessions.where('classeId').equals(id).delete()
            await db.classeBranches.where('classeId').equals(id).delete()
            await db.classes.delete(id)
        },
    )
}

export function useContexteScolaire() {
    initialiserFlux()
    const brancheActive = computed(
        () =>
            branches.value.find(
                (branche) => branche.id === brancheActiveId.value,
            ) ?? null,
    )
    const classeActive = computed(
        () =>
            classes.value.find(
                (classe) => classe.id === classeActiveId.value,
            ) ?? null,
    )
    const branchesPourClasse = computed(() => {
        const ids = new Set(
            associations.value
                .filter(
                    (association) =>
                        association.classeId === classeActiveId.value,
                )
                .map((association) => association.brancheId),
        )
        return branches.value.filter((branche) => ids.has(branche.id!))
    })

    return {
        branches: readonly(branches),
        classes: readonly(classes),
        associations: readonly(associations),
        brancheActiveId: readonly(brancheActiveId),
        classeActiveId: readonly(classeActiveId),
        brancheActive,
        classeActive,
        branchesPourClasse,
        chargement: readonly(chargement),
        erreur: readonly(erreur),
        selectionnerBranche,
        selectionnerClasse,
        ajouterBranche,
        ajouterClasse,
        renommerBranche,
        renommerClasse,
        definirBranchesClasse,
        supprimerBranche,
        supprimerClasse,
    }
}
