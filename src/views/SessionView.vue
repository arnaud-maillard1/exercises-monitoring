<script setup lang="ts">
import { computed, ref } from 'vue'
import ProgressionTable from '../components/ProgressionTable.vue'
import { useSessionActuelle } from '../composables/useSessionActuelle'

const {
  session,
  themes,
  exercices,
  chargement,
  erreur,
  enregistrerSession,
} = useSessionActuelle()

const dialogue = ref<HTMLDialogElement | null>(null)
const selectionBrouillon = ref<number[]>([])
const enregistrement = ref(false)
const messageErreur = ref<string | null>(null)

const exerciceIdsSession = computed<readonly number[]>(() =>
  session.value?.exerciceIds ?? [],
)

const tousLesExerciceIds = computed(() =>
  exercices.value.flatMap((exercice) =>
    exercice.id === undefined ? [] : [exercice.id],
  ),
)

const tousSelectionnes = computed(() =>
  tousLesExerciceIds.value.length > 0
  && tousLesExerciceIds.value.every(
    (id) => selectionBrouillon.value.includes(id),
  ),
)

const groupesSelection = computed(() =>
  themes.value
    .map((theme) => ({
      theme,
      exercices: exercicesDuTheme(theme.id),
    }))
    .filter((groupe) => groupe.exercices.length > 0),
)

function exercicesDuTheme(themeId: number | undefined) {
  if (themeId === undefined) return []
  return exercices.value.filter((exercice) => exercice.themeId === themeId)
}

function ouvrirSelection(): void {
  selectionBrouillon.value = [...exerciceIdsSession.value]
  messageErreur.value = null

  if (!dialogue.value?.open) {
    dialogue.value?.showModal()
  }
}

function fermerSelection(): void {
  dialogue.value?.close()
}

function annulerSelection(): void {
  selectionBrouillon.value = [...exerciceIdsSession.value]
  messageErreur.value = null
}

function basculerSelectionComplete(): void {
  selectionBrouillon.value = tousSelectionnes.value
    ? []
    : [...tousLesExerciceIds.value]
}

async function sauvegarderSelection(): Promise<void> {
  enregistrement.value = true
  messageErreur.value = null

  try {
    await enregistrerSession(selectionBrouillon.value)
    fermerSelection()
  } catch (cause: unknown) {
    messageErreur.value = cause instanceof Error
      ? cause.message
      : "Impossible d'enregistrer l’espace élèves"
  } finally {
    enregistrement.value = false
  }
}
</script>

<template>
  <section>
    <header class="page-heading session-heading">
      <div>
        <h1>Espace élèves</h1>
        <p>Les élèves renseignent leur progression pour les exercices sélectionnés.</p>
      </div>

      <button
        class="primary-button"
        type="button"
        :disabled="chargement"
        @click="ouvrirSelection"
      >
        Choisir les exercices
      </button>
    </header>

    <p v-if="erreur" class="feedback feedback-error" role="alert">
      {{ erreur }}
    </p>

    <p v-if="chargement" class="feedback" aria-live="polite">
      Chargement de l’espace élèves…
    </p>

    <template v-else>
      <p class="session-summary">
        {{ exerciceIdsSession.length }}
        {{ exerciceIdsSession.length !== 1 ? 'exercices sélectionnés' : 'exercice sélectionné' }}
      </p>

      <ProgressionTable
        mode-edition="menu"
        :exercice-ids="exerciceIdsSession"
      />
    </template>

    <dialog
      ref="dialogue"
      class="session-dialog"
      @cancel="annulerSelection"
    >
      <form class="session-dialog-form" @submit.prevent="sauvegarderSelection">
        <header class="dialog-heading">
          <div>
            <h2>Choisir les exercices visibles</h2>
            <p>Choisir les exercices visibles par les élèves.</p>
          </div>

          <button
            class="dialog-close"
            type="button"
            aria-label="Fermer"
            title="Fermer"
            @click="fermerSelection"
          >
            ×
          </button>
        </header>

        <div class="dialog-toolbar">
          <span>
            {{ selectionBrouillon.length }} sélectionnés sur
            {{ tousLesExerciceIds.length }}
          </span>
          <button
            class="secondary-button"
            type="button"
            :disabled="tousLesExerciceIds.length === 0"
            @click="basculerSelectionComplete"
          >
            {{ tousSelectionnes ? 'Tout désélectionner' : 'Tout sélectionner' }}
          </button>
        </div>

        <div class="session-selection">
          <div v-if="exercices.length === 0" class="empty-state">
            <h3>Aucun exercice</h3>
            <p>Ajoute d’abord des exercices dans « Thèmes & exercices ».</p>
          </div>

          <template v-else>
            <fieldset
              v-for="groupe in groupesSelection"
              :key="groupe.theme.id"
              class="session-theme"
            >
              <legend>{{ groupe.theme.nom }}</legend>

              <label
                v-for="exercice in groupe.exercices"
                :key="exercice.id"
                class="session-exercise"
              >
                <input
                  v-model="selectionBrouillon"
                  type="checkbox"
                  :value="exercice.id"
                />
                <span>{{ exercice.nom }}</span>
              </label>
            </fieldset>
          </template>
        </div>

        <p
          v-if="messageErreur"
          class="feedback feedback-error dialog-feedback"
          role="alert"
        >
          {{ messageErreur }}
        </p>

        <footer class="dialog-actions">
          <button
            class="secondary-button"
            type="button"
            :disabled="enregistrement"
            @click="fermerSelection"
          >
            Annuler
          </button>
          <button
            class="primary-button"
            type="submit"
            :disabled="enregistrement"
          >
            {{ enregistrement ? 'Enregistrement…' : 'Enregistrer la sélection' }}
          </button>
        </footer>
      </form>
    </dialog>
  </section>
</template>
