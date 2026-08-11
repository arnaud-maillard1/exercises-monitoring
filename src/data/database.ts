import Dexie, { type Table } from 'dexie'
import type {
    Configuration,
    Eleve,
    Exercice,
    Progression,
    Session,
    Theme,
} from './models'

class SuiviExercicesDatabase extends Dexie {
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
    }
}

export const db = new SuiviExercicesDatabase()
