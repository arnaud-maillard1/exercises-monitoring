<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useThemesExercices } from '../composables/useThemesExercices'
import { useContexteScolaire } from '../composables/useContexteScolaire'
import type { Exercice, Theme } from '../data/models'

const {
  themes,
  exercices,
  chargement,
  erreur,
  ajouterTheme,
  modifierTheme,
  supprimerTheme,
  deplacerTheme,
  trierThemesAlphabetiquement,
  ajouterExercice,
  modifierExercice,
  supprimerExercice,
  deplacerExercice,
  trierExercicesAlphabetiquement,
} = useThemesExercices()

const { brancheActive } = useContexteScolaire()

const nouveauThemeNom = ref('')
const nouvelExerciceNom = ref('')
const themeSelectionneId = ref<number | ''>('')
const themeEditionId = ref<number | null>(null)
const themeEditionNom = ref('')
const exerciceEditionId = ref<number | null>(null)
const exerciceEditionNom = ref('')
const operationEnCours = ref(false)
const messageErreur = ref<string | null>(null)

const nombreExercices = computed(() => exercices.value.length)

const ajoutThemePossible = computed(() =>
  nouveauThemeNom.value.trim().length > 0 && !operationEnCours.value,
)

const ajoutExercicePossible = computed(() =>
  nouvelExerciceNom.value.trim().length > 0
  && typeof themeSelectionneId.value === 'number'
  && !operationEnCours.value,
)

watch(themes, (liste) => {
  const selectionExiste = liste.some(
    (theme) => theme.id === themeSelectionneId.value,
  )

  if (!selectionExiste) {
    themeSelectionneId.value = liste[0]?.id ?? ''
  }
})

function exercicesDuTheme(themeId: number | undefined): Exercice[] {
  if (themeId === undefined) return []
  return exercices.value.filter((exercice) => exercice.themeId === themeId)
}

function lireErreur(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "Une erreur inattendue s'est produite"
}

async function executerOperation(
  operation: () => Promise<void>,
): Promise<void> {
  operationEnCours.value = true
  messageErreur.value = null

  try {
    await operation()
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function creerTheme(): Promise<void> {
  messageErreur.value = null
  operationEnCours.value = true

  try {
    const id = await ajouterTheme(nouveauThemeNom.value)
    nouveauThemeNom.value = ''
    themeSelectionneId.value = id
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

async function creerExercice(): Promise<void> {
  if (typeof themeSelectionneId.value !== 'number') return

  messageErreur.value = null
  operationEnCours.value = true

  try {
    await ajouterExercice(
      themeSelectionneId.value,
      nouvelExerciceNom.value,
    )
    nouvelExerciceNom.value = ''
  } catch (cause: unknown) {
    messageErreur.value = lireErreur(cause)
  } finally {
    operationEnCours.value = false
  }
}

function commencerModificationTheme(theme: Theme): void {
  if (theme.id === undefined) return

  themeEditionId.value = theme.id
  themeEditionNom.value = theme.nom
  exerciceEditionId.value = null
  messageErreur.value = null
}

function annulerModificationTheme(): void {
  themeEditionId.value = null
  themeEditionNom.value = ''
}

async function enregistrerTheme(): Promise<void> {
  if (themeEditionId.value === null) return

  await executerOperation(async () => {
    await modifierTheme(themeEditionId.value!, themeEditionNom.value)
    annulerModificationTheme()
  })
}

async function confirmerSuppressionTheme(theme: Theme): Promise<void> {
  if (theme.id === undefined) return

  const confirmation = window.confirm(
    `Supprimer le thème « ${theme.nom} » ? Ses exercices et toutes leurs progressions seront également supprimés.`,
  )

  if (!confirmation) return

  const id = theme.id
  await executerOperation(async () => {
    await supprimerTheme(id)

    if (themeEditionId.value === id) {
      annulerModificationTheme()
    }
  })
}

async function demanderDeplacementTheme(
  theme: Theme,
  direction: 'haut' | 'bas',
): Promise<void> {
  if (theme.id === undefined) return
  const id = theme.id
  await executerOperation(() => deplacerTheme(id, direction))
}

function commencerModificationExercice(exercice: Exercice): void {
  if (exercice.id === undefined) return

  exerciceEditionId.value = exercice.id
  exerciceEditionNom.value = exercice.nom
  themeEditionId.value = null
  messageErreur.value = null
}

function annulerModificationExercice(): void {
  exerciceEditionId.value = null
  exerciceEditionNom.value = ''
}

async function enregistrerExercice(): Promise<void> {
  if (exerciceEditionId.value === null) return

  await executerOperation(async () => {
    await modifierExercice(
      exerciceEditionId.value!,
      exerciceEditionNom.value,
    )
    annulerModificationExercice()
  })
}

async function confirmerSuppressionExercice(
  exercice: Exercice,
): Promise<void> {
  if (exercice.id === undefined) return

  const confirmation = window.confirm(
    `Supprimer l'exercice « ${exercice.nom} » ? Toutes ses progressions seront également supprimées.`,
  )

  if (!confirmation) return

  const id = exercice.id
  await executerOperation(async () => {
    await supprimerExercice(id)

    if (exerciceEditionId.value === id) {
      annulerModificationExercice()
    }
  })
}

async function demanderDeplacementExercice(
  exercice: Exercice,
  direction: 'haut' | 'bas',
): Promise<void> {
  if (exercice.id === undefined) return
  const id = exercice.id
  await executerOperation(() => deplacerExercice(id, direction))
}

async function demanderTriExercices(theme: Theme): Promise<void> {
  if (theme.id === undefined) return
  const id = theme.id
  await executerOperation(() => trierExercicesAlphabetiquement(id))
}
</script>

<template>
  <section>
    <header class="page-heading">
      <div>
        <h1>Thèmes & exercices</h1>
        <p>
          Catalogue partagé de la branche
          <strong v-if="brancheActive">« {{ brancheActive.nom }} »</strong>.
        </p>
      </div>

      <span class="student-count">
        {{ themes.length }} {{ themes.length !== 1 ? 'thèmes' : 'thème' }} ·
        {{ nombreExercices }}
        {{ nombreExercices !== 1 ? 'exercices' : 'exercice' }}
      </span>
    </header>

    <div class="catalog-toolbar">
      <form class="catalog-form" @submit.prevent="creerTheme">
        <label class="form-field" for="theme-name">
          <span>Nouveau thème</span>
          <input
            id="theme-name"
            v-model="nouveauThemeNom"
            class="text-input"
            type="text"
            maxlength="120"
            autocomplete="off"
            placeholder="Par exemple : Fractions"
          />
        </label>
        <button
          class="primary-button"
          type="submit"
          :disabled="!ajoutThemePossible"
        >
          Ajouter le thème
        </button>
      </form>

      <form class="catalog-form exercise-create-form" @submit.prevent="creerExercice">
        <label class="form-field" for="exercise-name">
          <span>Nouvel exercice</span>
          <input
            id="exercise-name"
            v-model="nouvelExerciceNom"
            class="text-input"
            type="text"
            maxlength="120"
            autocomplete="off"
            placeholder="Par exemple : Exercice 1"
            :disabled="themes.length === 0"
          />
        </label>

        <label class="form-field theme-select-field" for="exercise-theme">
          <span>Thème</span>
          <select
            id="exercise-theme"
            v-model="themeSelectionneId"
            class="text-input"
            :disabled="themes.length === 0"
          >
            <option disabled value="">Choisir un thème</option>
            <option
              v-for="theme in themes"
              :key="theme.id"
              :value="theme.id"
            >
              {{ theme.nom }}
            </option>
          </select>
        </label>

        <button
          class="primary-button"
          type="submit"
          :disabled="!ajoutExercicePossible"
        >
          Ajouter l’exercice
        </button>
      </form>

      <button
        class="secondary-button catalog-sort-button"
        type="button"
        :disabled="themes.length < 2 || operationEnCours"
        @click="executerOperation(trierThemesAlphabetiquement)"
      >
        Trier les thèmes de A à Z
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
      Chargement des thèmes et exercices…
    </p>

    <div v-else-if="themes.length === 0" class="empty-state">
      <h2>Aucun thème</h2>
      <p>Crée un premier thème avant d’y ajouter des exercices.</p>
    </div>

    <div v-else class="theme-list">
      <article
        v-for="(theme, themeIndex) in themes"
        :key="theme.id"
        class="theme-section"
      >
        <header class="theme-header">
          <span class="student-position" aria-hidden="true">
            {{ themeIndex + 1 }}
          </span>

          <form
            v-if="themeEditionId === theme.id"
            class="edit-form theme-edit-form"
            @submit.prevent="enregistrerTheme"
          >
            <label class="form-field" :for="`theme-${theme.id}`">
              <span>Modifier le thème</span>
              <input
                :id="`theme-${theme.id}`"
                v-model="themeEditionNom"
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
                :disabled="!themeEditionNom.trim() || operationEnCours"
              >
                Enregistrer
              </button>
              <button
                class="secondary-button"
                type="button"
                :disabled="operationEnCours"
                @click="annulerModificationTheme"
              >
                Annuler
              </button>
            </div>
          </form>

          <template v-else>
            <div class="theme-title">
              <h2>{{ theme.nom }}</h2>
              <span>
                {{ exercicesDuTheme(theme.id).length }}
                {{ exercicesDuTheme(theme.id).length !== 1 ? 'exercices' : 'exercice' }}
              </span>
            </div>

            <div class="theme-actions">
              <button
                class="icon-button"
                type="button"
                :disabled="themeIndex === 0 || operationEnCours"
                :aria-label="`Monter le thème ${theme.nom}`"
                title="Monter"
                @click="demanderDeplacementTheme(theme, 'haut')"
              >
                ↑
              </button>
              <button
                class="icon-button"
                type="button"
                :disabled="themeIndex === themes.length - 1 || operationEnCours"
                :aria-label="`Descendre le thème ${theme.nom}`"
                title="Descendre"
                @click="demanderDeplacementTheme(theme, 'bas')"
              >
                ↓
              </button>
              <button
                class="secondary-button"
                type="button"
                :disabled="operationEnCours"
                @click="commencerModificationTheme(theme)"
              >
                Modifier
              </button>
              <button
                class="danger-button"
                type="button"
                :disabled="operationEnCours"
                @click="confirmerSuppressionTheme(theme)"
              >
                Supprimer
              </button>
            </div>
          </template>
        </header>

        <div class="exercise-heading">
          <h3>Exercices</h3>
          <button
            class="secondary-button"
            type="button"
            :disabled="exercicesDuTheme(theme.id).length < 2 || operationEnCours"
            @click="demanderTriExercices(theme)"
          >
            Trier de A à Z
          </button>
        </div>

        <p
          v-if="exercicesDuTheme(theme.id).length === 0"
          class="theme-empty"
        >
          Aucun exercice dans ce thème.
        </p>

        <ul v-else class="exercise-list">
          <li
            v-for="(exercice, exerciceIndex) in exercicesDuTheme(theme.id)"
            :key="exercice.id"
            class="exercise-row"
          >
            <span class="student-position" aria-hidden="true">
              {{ exerciceIndex + 1 }}
            </span>

            <form
              v-if="exerciceEditionId === exercice.id"
              class="edit-form"
              @submit.prevent="enregistrerExercice"
            >
              <label class="form-field" :for="`exercise-${exercice.id}`">
                <span>Modifier l’exercice</span>
                <input
                  :id="`exercise-${exercice.id}`"
                  v-model="exerciceEditionNom"
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
                  :disabled="!exerciceEditionNom.trim() || operationEnCours"
                >
                  Enregistrer
                </button>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="operationEnCours"
                  @click="annulerModificationExercice"
                >
                  Annuler
                </button>
              </div>
            </form>

            <template v-else>
              <strong class="exercise-name">{{ exercice.nom }}</strong>
              <div class="student-actions">
                <button
                  class="icon-button"
                  type="button"
                  :disabled="exerciceIndex === 0 || operationEnCours"
                  :aria-label="`Monter l'exercice ${exercice.nom}`"
                  title="Monter"
                  @click="demanderDeplacementExercice(exercice, 'haut')"
                >
                  ↑
                </button>
                <button
                  class="icon-button"
                  type="button"
                  :disabled="exerciceIndex === exercicesDuTheme(theme.id).length - 1 || operationEnCours"
                  :aria-label="`Descendre l'exercice ${exercice.nom}`"
                  title="Descendre"
                  @click="demanderDeplacementExercice(exercice, 'bas')"
                >
                  ↓
                </button>
                <button
                  class="secondary-button"
                  type="button"
                  :disabled="operationEnCours"
                  @click="commencerModificationExercice(exercice)"
                >
                  Modifier
                </button>
                <button
                  class="danger-button"
                  type="button"
                  :disabled="operationEnCours"
                  @click="confirmerSuppressionExercice(exercice)"
                >
                  Supprimer
                </button>
              </div>
            </template>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>
