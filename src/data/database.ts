import Dexie, { type Table } from 'dexie'
import type {
    Branche,
    Classe,
    ClasseBranche,
    Configuration,
    Eleve,
    Exercice,
    Progression,
    Session,
    Theme,
} from './models'
import {
    CLE_BRANCHE_ACTIVE,
    CLE_CLASSE_ACTIVE,
    CLE_NOM_BRANCHE,
    lireNomBranche,
    NOM_CLASSE_PAR_DEFAUT,
} from './configuration'

class SuiviExercicesDatabase extends Dexie {
    branches!: Table<Branche, number>
    classes!: Table<Classe, number>
    classeBranches!: Table<ClasseBranche, [number, number]>
    eleves!: Table<Eleve, number>
    themes!: Table<Theme, number>
    exercices!: Table<Exercice, number>
    progressions!: Table<Progression, [number, number]>
    sessions!: Table<Session, number>
    configuration!: Table<Configuration, string>

    constructor() {
        super('suivi-exercices')

        // ++ : clé primaire -> auto-increémentation
        // [ ] : clé composée -> il ne peut donc exister qu’une progression pour un même élève et un même exercice
        this.version(1).stores({
            eleves: '++id, nom, ordre',
            themes: '++id, nom, ordre',
            exercices: '++id, themeId, nom, ordre',
            progressions:
                '[eleveId+exerciceId], eleveId, exerciceId',
            sessions: '++id, creeLe',
            configuration: 'cle',
        })

        this.version(2)
            .stores({
                branches: '++id, nom, ordre',
                classes: '++id, nom, ordre',
                classeBranches:
                    '[classeId+brancheId], classeId, brancheId',
                eleves: '++id, classeId, nom, ordre',
                themes: '++id, brancheId, nom, ordre',
                exercices: '++id, themeId, nom, ordre',
                progressions:
                    '[eleveId+exerciceId], eleveId, exerciceId',
                sessions:
                    '++id, [classeId+brancheId], classeId, brancheId, creeLe',
                configuration: 'cle',
            })
            .upgrade(async (transaction) => {
                const maintenant = Date.now()
                const configuration = transaction.table<
                    Configuration,
                    string
                >('configuration')
                const ancienNom = await configuration.get(
                    CLE_NOM_BRANCHE,
                )

                const brancheId = await transaction
                    .table<Branche, number>('branches')
                    .add({
                        nom: lireNomBranche(ancienNom?.valeur),
                        ordre: 0,
                        creeLe: maintenant,
                    })
                const classeId = await transaction
                    .table<Classe, number>('classes')
                    .add({
                        nom: NOM_CLASSE_PAR_DEFAUT,
                        ordre: 0,
                        creeLe: maintenant,
                    })

                await transaction
                    .table<ClasseBranche, [number, number]>(
                        'classeBranches',
                    )
                    .add({ classeId, brancheId })

                await transaction
                    .table<Eleve, number>('eleves')
                    .toCollection()
                    .modify((eleve) => {
                        eleve.classeId = classeId
                    })
                await transaction
                    .table<Theme, number>('themes')
                    .toCollection()
                    .modify((theme) => {
                        theme.brancheId = brancheId
                    })
                await transaction
                    .table<Session, number>('sessions')
                    .toCollection()
                    .modify((session) => {
                        session.classeId = classeId
                        session.brancheId = brancheId
                    })

                await configuration.bulkPut([
                    {
                        cle: CLE_BRANCHE_ACTIVE,
                        valeur: brancheId,
                    },
                    {
                        cle: CLE_CLASSE_ACTIVE,
                        valeur: classeId,
                    },
                ])
                await configuration.delete(CLE_NOM_BRANCHE)
            })
    }
}

export const db = new SuiviExercicesDatabase()
