import { liveQuery } from 'dexie'
import { onScopeDispose, readonly, ref } from 'vue'
import {
    CLE_NOM_BRANCHE,
    lireNomBranche,
} from '../data/configuration'
import { db } from '../data/database'

export function useNomBranche() {
    const nomBranche = ref(lireNomBranche(undefined))

    const subscription = liveQuery(async () => {
        const configuration = await db.configuration.get(CLE_NOM_BRANCHE)
        return lireNomBranche(configuration?.valeur)
    }).subscribe({
        next: (nom) => {
            nomBranche.value = nom
        },
    })

    onScopeDispose(() => subscription.unsubscribe())

    async function enregistrerNomBranche(nom: string): Promise<void> {
        const nomNettoye = nom.trim()

        if (!nomNettoye) {
            throw new Error('Le nom de la branche est obligatoire')
        }

        await db.configuration.put({
            cle: CLE_NOM_BRANCHE,
            valeur: nomNettoye,
        })
    }

    return {
        nomBranche: readonly(nomBranche),
        enregistrerNomBranche,
    }
}
