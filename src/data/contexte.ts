import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
    NOM_BRANCHE_PAR_DEFAUT,
    NOM_CLASSE_PAR_DEFAUT,
} from './configuration'
import { db } from './database'

function identifiant(valeur: unknown): number | null {
    return typeof valeur === 'number' && Number.isInteger(valeur)
        ? valeur
        : null
}

/** Garantit qu'une nouvelle installation possède un contexte utilisable. */
export async function initialiserContexteScolaire(): Promise<void> {
    await db.transaction(
        'rw',
        db.branches,
        db.classes,
        db.classeBranches,
        db.configuration,
        async () => {
            let branches = await db.branches.orderBy('ordre').toArray()
            let classes = await db.classes.orderBy('ordre').toArray()
            const maintenant = Date.now()

            if (branches.length === 0) {
                const id = await db.branches.add({
                    nom: NOM_BRANCHE_PAR_DEFAUT,
                    ordre: 0,
                    creeLe: maintenant,
                })
                branches = [(await db.branches.get(id))!]
            }

            if (classes.length === 0) {
                const id = await db.classes.add({
                    nom: NOM_CLASSE_PAR_DEFAUT,
                    ordre: 0,
                    creeLe: maintenant,
                })
                classes = [(await db.classes.get(id))!]
            }

            const brancheId = branches[0]!.id!
            const classeId = classes[0]!.id!
            if ((await db.classeBranches.count()) === 0) {
                await db.classeBranches.put({ classeId, brancheId })
            }

            const [brancheConfiguree, classeConfiguree] =
                await Promise.all([
                    db.configuration.get(CLE_BRANCHE_ACTIVE),
                    db.configuration.get(CLE_CLASSE_ACTIVE),
                ])
            const brancheValide = branches.some(
                (branche) =>
                    branche.id === identifiant(brancheConfiguree?.valeur),
            )
            const classeValide = classes.some(
                (classe) =>
                    classe.id === identifiant(classeConfiguree?.valeur),
            )

            await db.configuration.bulkPut([
                {
                    cle: CLE_BRANCHE_ACTIVE,
                    valeur: brancheValide
                        ? brancheConfiguree!.valeur
                        : brancheId,
                },
                {
                    cle: CLE_CLASSE_ACTIVE,
                    valeur: classeValide
                        ? classeConfiguree!.valeur
                        : classeId,
                },
            ])
        },
    )
}
