<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEleves } from '../composables/useEleves'
import type { Eleve } from '../data/models'

const {
  eleves,
  chargement,
  erreur,
  ajouterEleve,
  modifierEleve,
  supprimerEleve,
  deplacerEleve,
  trierAlphabetiquement,
} = useEleves()

const nouveauNom = ref('')
const editionId = ref<number | null>(null)
const nomEdition = ref('')
const operationEnCours = ref(false)
const messageErreur = ref<string | null>(null)

const ajoutPossible = computed(() =>
  nouveauNom.value.trim().length > 0 && !operationEnCours.value,
)

function lireErreur(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Une erreur inattendue s'est produite"
}

async function ajouter(): Promise<void> {
  messageErreur.value = null
  operationEnCours.value = true

  try {
    await ajouterEleve(nouveauNom.value)
    nouveauNom.value = ''
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

function commencerModification(eleve: Eleve): void {
  if (eleve.id === undefined) return

  editionId.value = eleve.id
  nomEdition.value = eleve.nom
  messageErreur.value = null
}

function annulerModification(): void {
  editionId.value = null
  nomEdition.value = ''
}

async function enregistrerModification(): Promise<void> {
  if (editionId.value === null) return

  messageErreur.value = null
  operationEnCours.value = true

  try {
    await modifierEleve(editionId.value, nomEdition.value)
    annulerModification()
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function confirmerSuppression(eleve: Eleve): Promise<void> {
  if (eleve.id === undefined) return

  const confirmation = window.confirm(
    `Supprimer ${eleve.nom} ? Ses progressions seront également supprimées.`,
  )

  if (!confirmation) return

  messageErreur.value = null
  operationEnCours.value = true

  try {
    await supprimerEleve(eleve.id)

    if (editionId.value === eleve.id) {
      annulerModification()
    }
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function deplacer(
  eleve: Eleve,
  direction: 'haut' | 'bas',
): Promise<void> {
  if (eleve.id === undefined) return

  messageErreur.value = null
  operationEnCours.value = true

  try {
    await deplacerEleve(eleve.id, direction)
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function trier(): Promise<void> {
  messageErreur.value = null
  operationEnCours.value = true

  try {
    await trierAlphabetiquement()
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}
</script>

<template>
  <section>
    <header class="page-heading">
      <div>
        <h1>Ma classe</h1>
        <p>Ajouter, renommer et organiser les élèves.</p>
      </div>

      <span class="student-count">
        {{ eleves.length }} {{ eleves.length > 1 ? 'élèves' : 'élève' }}
      </span>
    </header>

    <div class="class-toolbar">
      <form class="student-form" @submit.prevent="ajouter">
        <label class="form-field" for="student-name">
          <span>Nom de l’élève</span>
          <input
            id="student-name"
            v-model="nouveauNom"
            class="text-input"
            type="text"
            maxlength="120"
            autocomplete="off"
            placeholder="Par exemple : Camille Dupont"
          />
        </label>

        <button
          class="primary-button"
          type="submit"
          :disabled="!ajoutPossible"
        >
          Ajouter
        </button>
      </form>

      <button
        class="secondary-button"
        type="button"
        :disabled="eleves.length < 2 || operationEnCours"
        @click="trier"
      >
        Trier de A à Z
      </button>
    </div>

    <p
      v-if="messageErreur || erreur"
      class="feedback feedback-error"
      role="alert"
    >
      {{ messageErreur ?? erreur }}
    </p>

    <p v-if="chargement" class="feedback" aria-live="polite">
      Chargement des élèves…
    </p>

    <div v-else-if="eleves.length === 0" class="empty-state">
      <h2>Aucun élève</h2>
      <p>Ajoute le premier élève pour commencer à préparer la classe.</p>
    </div>

    <ul v-else class="student-list">
      <li
        v-for="(eleve, index) in eleves"
        :key="eleve.id ?? eleve.nom"
        class="student-row"
      >
        <span class="student-position" aria-hidden="true">
          {{ index + 1 }}
        </span>

        <form
          v-if="editionId === eleve.id"
          class="edit-form"
          @submit.prevent="enregistrerModification"
        >
          <label class="form-field" :for="`student-${eleve.id}`">
            <span>Modifier le nom</span>
            <input
              :id="`student-${eleve.id}`"
              v-model="nomEdition"
              class="text-input"
              type="text"
              maxlength="120"
              autocomplete="off"
            />
          </label>

          <div class="edit-actions">
            <button
              class="primary-button"
              type="submit"
              :disabled="!nomEdition.trim() || operationEnCours"
            >
              Enregistrer
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="operationEnCours"
              @click="annulerModification"
            >
              Annuler
            </button>
          </div>
        </form>

        <template v-else>
          <strong class="student-name">{{ eleve.nom }}</strong>

          <div class="student-actions">
            <button
              class="icon-button"
              type="button"
              :disabled="index === 0 || operationEnCours"
              :aria-label="`Monter ${eleve.nom}`"
              title="Monter"
              @click="deplacer(eleve, 'haut')"
            >
              ↑
            </button>
            <button
              class="icon-button"
              type="button"
              :disabled="index === eleves.length - 1 || operationEnCours"
              :aria-label="`Descendre ${eleve.nom}`"
              title="Descendre"
              @click="deplacer(eleve, 'bas')"
            >
              ↓
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="operationEnCours"
              @click="commencerModification(eleve)"
            >
              Modifier
            </button>
            <button
              class="danger-button"
              type="button"
              :disabled="operationEnCours"
              @click="confirmerSuppression(eleve)"
            >
              Supprimer
            </button>
          </div>
        </template>
      </li>
    </ul>
  </section>
</template>
