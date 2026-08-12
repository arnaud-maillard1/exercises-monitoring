<script setup lang="ts">
import { computed, ref } from 'vue'
import { useProgressions } from '../composables/useProgressions'
import type { Eleve, Etat, Exercice, Theme } from '../data/models'

type ModeEdition = 'clic' | 'menu'

interface GroupeTheme {
  theme: Theme
  exercices: Exercice[]
}

const props = withDefaults(defineProps<{
  exerciceIds?: readonly number[] | null
  modeEdition?: ModeEdition
}>(), {
  exerciceIds: null,
  modeEdition: 'clic',
})

const {
  eleves,
  themes,
  exercices,
  progressions,
  chargement,
  erreur,
  definirEtat,
} = useProgressions()

const celluleEnCours = ref<string | null>(null)
const messageErreur = ref<string | null>(null)

const etats: readonly { valeur: Etat; libelle: string }[] = [
  { valeur: 'rien', libelle: 'Rien' },
  { valeur: 'en cours', libelle: 'En cours' },
  { valeur: 'terminé', libelle: 'Terminé' },
]

const etatSuivant: Record<Etat, Etat> = {
  rien: 'en cours',
  'en cours': 'terminé',
  terminé: 'rien',
}

const libelles: Record<Etat, string> = {
  rien: 'Rien',
  'en cours': 'En cours',
  terminé: 'Terminé',
}

const exercicesAffiches = computed(() => {
  if (props.exerciceIds === null) {
    return exercices.value
  }

  const idsAffiches = new Set(props.exerciceIds)
  return exercices.value.filter(
    (exercice) => exercice.id !== undefined && idsAffiches.has(exercice.id),
  )
})

const groupes = computed<GroupeTheme[]>(() =>
  themes.value
    .map((theme) => ({
      theme,
      exercices: exercicesAffiches.value.filter(
        (exercice) => exercice.themeId === theme.id,
      ),
    }))
    .filter((groupe) => groupe.exercices.length > 0),
)

const progressionParCellule = computed(() => {
  const index = new Map<string, Etat>()

  for (const progression of progressions.value) {
    index.set(
      cleCellule(progression.eleveId, progression.exerciceId),
      progression.etat,
    )
  }

  return index
})

function cleCellule(eleveId: number, exerciceId: number): string {
  return `${eleveId}:${exerciceId}`
}

function etatPour(eleve: Eleve, exercice: Exercice): Etat {
  if (eleve.id === undefined || exercice.id === undefined) return 'rien'

  return progressionParCellule.value.get(
    cleCellule(eleve.id, exercice.id),
  ) ?? 'rien'
}

function classeEtat(etat: Etat): string {
  if (etat === 'en cours') return 'progress-state-in-progress'
  if (etat === 'terminé') return 'progress-state-done'
  return 'progress-state-empty'
}

function estUnEtat(valeur: string): valeur is Etat {
  return etats.some((etat) => etat.valeur === valeur)
}

function estEnCours(eleve: Eleve, exercice: Exercice): boolean {
  if (eleve.id === undefined || exercice.id === undefined) return false
  return celluleEnCours.value === cleCellule(eleve.id, exercice.id)
}

async function enregistrerEtat(
  eleve: Eleve,
  exercice: Exercice,
  etat: Etat,
): Promise<void> {
  if (eleve.id === undefined || exercice.id === undefined) return

  const cle = cleCellule(eleve.id, exercice.id)
  celluleEnCours.value = cle
  messageErreur.value = null

  try {
    await definirEtat(eleve.id, exercice.id, etat)
  } catch (cause: unknown) {
    messageErreur.value = cause instanceof Error
      ? cause.message
      : "Impossible d'enregistrer la progression"
  } finally {
    celluleEnCours.value = null
  }
}

async function faireDefilerEtat(
  eleve: Eleve,
  exercice: Exercice,
): Promise<void> {
  const etatActuel = etatPour(eleve, exercice)
  await enregistrerEtat(eleve, exercice, etatSuivant[etatActuel])
}

async function selectionnerEtat(
  eleve: Eleve,
  exercice: Exercice,
  evenement: Event,
): Promise<void> {
  const valeur = (evenement.target as HTMLSelectElement).value

  if (!estUnEtat(valeur)) return
  await enregistrerEtat(eleve, exercice, valeur)
}
</script>

<template>
  <div class="progression-workspace">
    <div class="progress-legend" aria-label="Légende des progressions">
      <span
        v-for="etat in etats"
        :key="etat.valeur"
        class="legend-item"
      >
        <span
          class="legend-swatch"
          :class="classeEtat(etat.valeur)"
          aria-hidden="true"
        />
        {{ etat.libelle }}
      </span>
    </div>

    <p
      v-if="messageErreur || erreur"
      class="feedback feedback-error"
      role="alert"
    >
      {{ messageErreur ?? erreur }}
    </p>

    <p v-if="chargement" class="feedback" aria-live="polite">
      Chargement du tableau…
    </p>

    <div v-else-if="eleves.length === 0" class="empty-state">
      <h2>Aucun élève</h2>
      <p>Ajoute des élèves dans « Ma classe » pour afficher le suivi.</p>
    </div>

    <div v-else-if="exercicesAffiches.length === 0" class="empty-state">
      <h2>Aucun exercice</h2>
      <p>Ajoute ou sélectionne des exercices pour afficher le suivi.</p>
    </div>

    <div
      v-else
      class="progress-table-scroll"
      role="region"
      aria-label="Tableau de progression"
      tabindex="0"
    >
      <table class="progress-table">
        <caption class="visually-hidden">
          Progression des élèves par thème et exercice
        </caption>
        <thead>
          <tr>
            <th class="student-column" scope="col" rowspan="2">
              Élève
            </th>
            <th
              v-for="groupe in groupes"
              :key="groupe.theme.id"
              class="theme-column"
              scope="colgroup"
              :colspan="groupe.exercices.length"
            >
              {{ groupe.theme.nom }}
            </th>
          </tr>
          <tr>
            <template
              v-for="groupe in groupes"
              :key="groupe.theme.id"
            >
              <th
                v-for="exercice in groupe.exercices"
                :key="exercice.id"
                class="exercise-column"
                scope="col"
              >
                {{ exercice.nom }}
              </th>
            </template>
          </tr>
        </thead>

        <tbody>
          <tr v-for="eleve in eleves" :key="eleve.id">
            <th class="student-column student-row-name" scope="row">
              {{ eleve.nom }}
            </th>

            <template
              v-for="groupe in groupes"
              :key="groupe.theme.id"
            >
              <td
                v-for="exercice in groupe.exercices"
                :key="exercice.id"
                class="progress-cell"
              >
                <button
                  v-if="modeEdition === 'clic'"
                  class="progress-button"
                  :class="classeEtat(etatPour(eleve, exercice))"
                  type="button"
                  :disabled="estEnCours(eleve, exercice)"
                  :aria-label="`${eleve.nom}, ${exercice.nom} : ${libelles[etatPour(eleve, exercice)]}. Cliquer pour changer.`"
                  @click="faireDefilerEtat(eleve, exercice)"
                >
                  {{ libelles[etatPour(eleve, exercice)] }}
                </button>

                <select
                  v-else
                  class="progress-select"
                  :class="classeEtat(etatPour(eleve, exercice))"
                  :value="etatPour(eleve, exercice)"
                  :disabled="estEnCours(eleve, exercice)"
                  :aria-label="`Progression de ${eleve.nom} pour ${exercice.nom}`"
                  @change="selectionnerEtat(eleve, exercice, $event)"
                >
                  <option
                    v-for="etat in etats"
                    :key="etat.valeur"
                    :value="etat.valeur"
                    :class="classeEtat(etat.valeur)"
                  >
                    {{ etat.libelle }}
                  </option>
                </select>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
