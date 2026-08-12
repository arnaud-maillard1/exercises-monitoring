<script setup lang="ts">
import { liveQuery } from 'dexie'
import { computed, onScopeDispose, ref } from 'vue'
import { db } from '../data/database'
import {
  analyserFichierSauvegarde,
  CLE_DERNIERE_SAUVEGARDE,
  exporterSauvegardeJson,
  restaurerSauvegarde,
} from '../services/sauvegardeJson'

const UNE_SEMAINE = 7 * 24 * 60 * 60 * 1000

const dialogue = ref<HTMLDialogElement | null>(null)
const derniereSauvegarde = ref<number | null>(null)
const operationEnCours = ref(false)
const message = ref<string | null>(null)
const messageErreur = ref<string | null>(null)

const subscription = liveQuery(async () => {
  const configuration = await db.configuration.get(
    CLE_DERNIERE_SAUVEGARDE,
  )

  return typeof configuration?.valeur === 'number'
    ? configuration.valeur
    : null
}).subscribe({
  next: (horodatage) => {
    derniereSauvegarde.value = horodatage
  },
  error: () => {
    derniereSauvegarde.value = null
  },
})

onScopeDispose(() => subscription.unsubscribe())

const sauvegardeRecommandee = computed(() =>
  derniereSauvegarde.value === null
  || Date.now() - derniereSauvegarde.value > UNE_SEMAINE,
)

const libelleDerniereSauvegarde = computed(() => {
  if (derniereSauvegarde.value === null) {
    return 'Aucune copie externe enregistrée'
  }

  return `Dernière copie externe : ${new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(derniereSauvegarde.value)}`
})

function ouvrir(): void {
  message.value = null
  messageErreur.value = null

  if (!dialogue.value?.open) {
    dialogue.value?.showModal()
  }
}

function fermer(): void {
  dialogue.value?.close()
}

function lireErreur(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Une erreur inattendue s'est produite"
}

async function exporter(): Promise<void> {
  operationEnCours.value = true
  message.value = null
  messageErreur.value = null

  try {
    await exporterSauvegardeJson()
    message.value = 'La copie de la branche a été téléchargée.'
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function selectionnerFichier(evenement: Event): Promise<void> {
  const input = evenement.target as HTMLInputElement
  const fichier = input.files?.[0]
  input.value = ''

  if (!fichier) return

  operationEnCours.value = true
  message.value = null
  messageErreur.value = null

  try {
    const resultat = await analyserFichierSauvegarde(fichier)
    const detail = resultat.resume
    const confirmation = window.confirm(
      `Ouvrir la copie de la branche « ${detail.nomBranche} » ?\n\n`
      + `${detail.eleves} élève(s), ${detail.themes} thème(s), `
      + `${detail.exercices} exercice(s) et `
      + `${detail.progressions} progression(s).\n\n`
      + 'Toutes les données actuellement présentes seront remplacées.',
    )

    if (!confirmation) return

    await restaurerSauvegarde(resultat.sauvegarde)
    message.value = `La branche « ${detail.nomBranche} » est maintenant ouverte.`
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}
</script>

<template>
  <div class="backup-control">
    <button
      class="backup-trigger"
      :class="{ 'backup-needed': sauvegardeRecommandee }"
      type="button"
      :aria-label="sauvegardeRecommandee
        ? 'Sauvegarde externe recommandée'
        : 'Gérer les sauvegardes'"
      @click="ouvrir"
    >
      Sauvegarde
    </button>

    <dialog ref="dialogue" class="session-dialog backup-dialog">
      <div class="backup-dialog-content">
        <header class="dialog-heading">
          <div>
            <h2>Sauvegardes de la branche</h2>
            <p>Conserver ou ouvrir une copie en dehors du navigateur.</p>
          </div>

          <button
            class="dialog-close"
            type="button"
            aria-label="Fermer"
            title="Fermer"
            @click="fermer"
          >
            ×
          </button>
        </header>

        <div class="backup-dialog-body">
          <p
            class="backup-status"
            :class="{ 'backup-status-warning': sauvegardeRecommandee }"
          >
            {{ libelleDerniereSauvegarde }}
          </p>

          <section class="backup-action-section">
            <div>
              <h3>Sauvegarder une copie</h3>
              <p>
                Télécharge une copie complète de la branche dans un fichier
                <code>.suiviexos</code>.
              </p>
            </div>
            <button
              class="primary-button"
              type="button"
              :disabled="operationEnCours"
              @click="exporter"
            >
              Télécharger une copie
            </button>
          </section>

          <section class="backup-action-section">
            <div>
              <h3>Ouvrir une copie</h3>
              <p>
                Remplace la branche actuellement ouverte par celle du fichier
                sélectionné, après confirmation.
              </p>
            </div>
            <label class="secondary-button backup-file-button">
              Choisir un fichier .suiviexos
              <input
                class="visually-hidden"
                type="file"
                accept="application/json,.json,.suiviexos"
                :disabled="operationEnCours"
                @change="selectionnerFichier"
              />
            </label>
          </section>

          <p
            v-if="messageErreur"
            class="feedback feedback-error backup-feedback"
            role="alert"
          >
            {{ messageErreur }}
          </p>
          <p
            v-if="message"
            class="feedback backup-feedback backup-feedback-success"
            role="status"
          >
            {{ message }}
          </p>
        </div>
      </div>
    </dialog>
  </div>
</template>
