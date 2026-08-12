<script setup lang="ts">
import { ref } from 'vue'
import ProgressionTable from '../components/ProgressionTable.vue'
import { exporterSuiviExcel } from '../services/exportExcel'

const exportEnCours = ref(false)
const erreurExport = ref<string | null>(null)

async function exporter(): Promise<void> {
  exportEnCours.value = true
  erreurExport.value = null

  try {
    await exporterSuiviExcel()
  } catch (cause: unknown) {
    erreurExport.value = cause instanceof Error
      ? cause.message
      : "Impossible de créer le fichier Excel"
  } finally {
    exportEnCours.value = false
  }
}
</script>

<template>
  <section>
    <header class="page-heading">
      <div>
        <h1>Suivi</h1>
        <p>
          Cliquer sur une case pour faire avancer l’état de progression.
        </p>
      </div>

      <button
        class="secondary-button"
        type="button"
        :disabled="exportEnCours"
        @click="exporter"
      >
        {{ exportEnCours ? 'Création du fichier…' : 'Exporter en Excel' }}
      </button>
    </header>

    <p
      v-if="erreurExport"
      class="feedback feedback-error"
      role="alert"
    >
      {{ erreurExport }}
    </p>

    <ProgressionTable mode-edition="clic" />
  </section>
</template>
