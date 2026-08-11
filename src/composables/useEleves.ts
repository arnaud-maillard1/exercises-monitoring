import { db } from '../data/database'

export function useEleves() {
    async function ajouterEleve(nom: string): Promise<number> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error("Le nom de l'élève est obligatoire")
        }

        const dernier = await db.eleves.orderBy('ordre').last()

        return db.eleves.add({
            nom: nomNettoye,
            ordre: (dernier?.ordre ?? -1) + 1,
            creeLe: Date.now(),
        })
    }

    async function listerEleves() {
        return db.eleves.orderBy('ordre').toArray()
    }

    return {
        ajouterEleve,
        listerEleves,
    }
}
