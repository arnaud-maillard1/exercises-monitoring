import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { db } from './data/database'
import { demanderStockagePersistant } from './data/persistence'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')

async function initialiserStockage() {
    await db.open()

    const persistant = await demanderStockagePersistant()
    console.info(
        persistant
            ? 'Stockage persistant activé'
            : 'Stockage persistant non garanti',
    )
}

void initialiserStockage().catch((erreur: unknown) => {
    console.error(
        "Impossible d'initialiser le stockage local",
        erreur,
    )
})

