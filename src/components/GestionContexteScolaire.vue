<script setup lang="ts">
import { computed, ref } from 'vue'
import { useContexteScolaire } from '../composables/useContexteScolaire'

const dialogue = ref<HTMLDialogElement | null>(null)
const nomNouvelleBranche = ref('')
const nomNouvelleClasse = ref('')
const classesNouvelleBranche = ref<number[]>([])
const branchesNouvelleClasse = ref<number[]>([])
const message = ref<string | null>(null)
const actionEnCours = ref(false)

const {
  branches,
  classes,
  associations,
  brancheActiveId,
  classeActiveId,
  brancheActive,
  classeActive,
  branchesPourClasse,
  chargement,
  selectionnerBranche,
  selectionnerClasse,
  ajouterBranche,
  ajouterClasse,
  renommerBranche,
  renommerClasse,
  definirBranchesClasse,
  supprimerBranche,
  supprimerClasse,
} = useContexteScolaire()

const contexteDisponible = computed(
  () => brancheActive.value !== null && classeActive.value !== null,
)

function ouvrirGestion(): void {
  message.value = null
  classesNouvelleBranche.value = classeActiveId.value
    ? [classeActiveId.value]
    : []
  branchesNouvelleClasse.value = brancheActiveId.value
    ? [brancheActiveId.value]
    : []
  dialogue.value?.showModal()
}

function fermerGestion(): void {
  dialogue.value?.close()
}

function erreurDe(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : 'Une erreur inattendue est survenue.'
}

async function executer(action: () => Promise<unknown>): Promise<boolean> {
  actionEnCours.value = true
  message.value = null
  try {
    await action()
    return true
  } catch (cause) {
    message.value = erreurDe(cause)
    return false
  } finally {
    actionEnCours.value = false
  }
}

async function creerBranche(): Promise<void> {
  const reussi = await executer(() =>
    ajouterBranche(
      nomNouvelleBranche.value,
      classesNouvelleBranche.value,
    ),
  )
  if (reussi) {
    nomNouvelleBranche.value = ''
    classesNouvelleBranche.value = []
  }
}

async function creerClasse(): Promise<void> {
  const reussi = await executer(() =>
    ajouterClasse(
      nomNouvelleClasse.value,
      branchesNouvelleClasse.value,
    ),
  )
  if (reussi) {
    nomNouvelleClasse.value = ''
    branchesNouvelleClasse.value = []
  }
}

function brancheLiee(classeId: number, brancheId: number): boolean {
  return associations.value.some(
    (association) =>
      association.classeId === classeId &&
      association.brancheId === brancheId,
  )
}

async function modifierAssociation(
  classeId: number,
  brancheId: number,
  caseACocher: HTMLInputElement,
): Promise<void> {
  const active = caseACocher.checked
  const ids = associations.value
    .filter((association) => association.classeId === classeId)
    .map((association) => association.brancheId)
  const nouveauxIds = active
    ? [...new Set([...ids, brancheId])]
    : ids.filter((id) => id !== brancheId)
  const reussi = await executer(() =>
    definirBranchesClasse(classeId, nouveauxIds),
  )
  if (!reussi) caseACocher.checked = !active
}

async function demanderRenommageBranche(id: number, nom: string): Promise<void> {
  const nouveauNom = window.prompt('Nouveau nom de la branche', nom)
  if (nouveauNom === null || nouveauNom.trim() === nom) return
  await executer(() => renommerBranche(id, nouveauNom))
}

async function demanderRenommageClasse(id: number, nom: string): Promise<void> {
  const nouveauNom = window.prompt('Nouveau nom de la classe', nom)
  if (nouveauNom === null || nouveauNom.trim() === nom) return
  await executer(() => renommerClasse(id, nouveauNom))
}

async function demanderSuppressionBranche(id: number, nom: string): Promise<void> {
  const confirme = window.confirm(
    `Supprimer la branche « ${nom} » ?\n\nSes thèmes, exercices, sessions et progressions seront définitivement supprimés.`,
  )
  if (confirme) await executer(() => supprimerBranche(id))
}

async function demanderSuppressionClasse(id: number, nom: string): Promise<void> {
  const confirme = window.confirm(
    `Supprimer la classe « ${nom} » ?\n\nSes élèves, sessions et progressions seront définitivement supprimés.`,
  )
  if (confirme) await executer(() => supprimerClasse(id))
}

function nombreClasses(brancheId: number): number {
  return associations.value.filter(
    (association) => association.brancheId === brancheId,
  ).length
}

function idDe(element: { id?: number }): number {
  if (element.id === undefined) {
    throw new Error('Identifiant manquant')
  }
  return element.id
}
</script>

<template>
  <div class="school-context" aria-label="Contexte de travail">
    <div class="context-selectors">
      <label class="context-field">
        <span>Classe</span>
        <select
          :value="classeActiveId ?? ''"
          :disabled="chargement || classes.length === 0"
          @change="selectionnerClasse(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="classe in classes" :key="classe.id" :value="classe.id">
            {{ classe.nom }}
          </option>
        </select>
      </label>

      <label class="context-field">
        <span>Branche</span>
        <select
          :value="brancheActiveId ?? ''"
          :disabled="chargement || branchesPourClasse.length === 0"
          @change="selectionnerBranche(Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-if="branchesPourClasse.length === 0" value="">
            Aucune branche liée
          </option>
          <option v-for="branche in branchesPourClasse" :key="branche.id" :value="branche.id">
            {{ branche.nom }}
          </option>
        </select>
      </label>
    </div>

    <p v-if="!chargement && !contexteDisponible" class="context-warning">
      Lie une branche à cette classe pour commencer.
    </p>

    <button class="context-manage-button" type="button" @click="ouvrirGestion">
      Gérer les classes et branches
    </button>
  </div>

  <dialog ref="dialogue" class="context-dialog" @click.self="fermerGestion">
    <div class="context-dialog-header">
      <div>
        <h2>Classes et branches</h2>
        <p>Les exercices appartiennent aux branches et les élèves aux classes.</p>
      </div>
      <button class="icon-button context-close-button" type="button" @click="fermerGestion">
        Fermer
      </button>
    </div>

    <p v-if="message" class="context-message feedback-error" role="alert">
      {{ message }}
    </p>

    <div class="context-management-grid">
      <section class="context-management-section">
        <div class="management-heading">
          <div>
            <h3>Branches</h3>
            <p>Une branche contient ses propres thèmes et exercices.</p>
          </div>
          <span>{{ branches.length }}</span>
        </div>

        <ul class="management-list">
          <li v-for="branche in branches" :key="branche.id" class="management-row">
            <div class="management-name">
              <strong>{{ branche.nom }}</strong>
              <small>{{ nombreClasses(idDe(branche)) }} classe(s)</small>
            </div>
            <div class="management-actions">
              <button
                class="secondary-button compact-button"
                type="button"
                :disabled="actionEnCours"
                @click="demanderRenommageBranche(idDe(branche), branche.nom)"
              >
                Renommer
              </button>
              <button
                class="danger-button compact-button"
                type="button"
                :disabled="actionEnCours || branches.length <= 1"
                @click="demanderSuppressionBranche(idDe(branche), branche.nom)"
              >
                Supprimer
              </button>
            </div>
          </li>
        </ul>

        <form class="management-create" @submit.prevent="creerBranche">
          <h4>Nouvelle branche</h4>
          <label class="form-field">
            Nom
            <input v-model="nomNouvelleBranche" class="text-input" placeholder="Mathématiques" />
          </label>
          <fieldset class="association-fieldset">
            <legend>Classes qui utilisent cette branche</legend>
            <label v-for="classe in classes" :key="classe.id" class="checkbox-label">
              <input v-model="classesNouvelleBranche" type="checkbox" :value="classe.id" />
              <span>{{ classe.nom }}</span>
            </label>
          </fieldset>
          <button class="primary-button" type="submit" :disabled="actionEnCours">
            Ajouter la branche
          </button>
        </form>
      </section>

      <section class="context-management-section">
        <div class="management-heading">
          <div>
            <h3>Classes</h3>
            <p>Chaque classe possède sa propre liste d’élèves.</p>
          </div>
          <span>{{ classes.length }}</span>
        </div>

        <ul class="management-list">
          <li v-for="classe in classes" :key="classe.id" class="management-row class-management-row">
            <div class="management-name">
              <strong>{{ classe.nom }}</strong>
              <small>Branches accessibles</small>
            </div>
            <div class="association-list">
              <label v-for="branche in branches" :key="branche.id" class="checkbox-label">
                <input
                  type="checkbox"
                  :checked="brancheLiee(idDe(classe), idDe(branche))"
                  :disabled="actionEnCours"
                  @change="modifierAssociation(idDe(classe), idDe(branche), ($event.target as HTMLInputElement))"
                />
                <span>{{ branche.nom }}</span>
              </label>
            </div>
            <div class="management-actions">
              <button
                class="secondary-button compact-button"
                type="button"
                :disabled="actionEnCours"
                @click="demanderRenommageClasse(idDe(classe), classe.nom)"
              >
                Renommer
              </button>
              <button
                class="danger-button compact-button"
                type="button"
                :disabled="actionEnCours || classes.length <= 1"
                @click="demanderSuppressionClasse(idDe(classe), classe.nom)"
              >
                Supprimer
              </button>
            </div>
          </li>
        </ul>

        <form class="management-create" @submit.prevent="creerClasse">
          <h4>Nouvelle classe</h4>
          <label class="form-field">
            Nom
            <input v-model="nomNouvelleClasse" class="text-input" placeholder="9VG1" />
          </label>
          <fieldset class="association-fieldset">
            <legend>Branches utilisées par cette classe</legend>
            <label v-for="branche in branches" :key="branche.id" class="checkbox-label">
              <input v-model="branchesNouvelleClasse" type="checkbox" :value="branche.id" />
              <span>{{ branche.nom }}</span>
            </label>
          </fieldset>
          <button class="primary-button" type="submit" :disabled="actionEnCours">
            Ajouter la classe
          </button>
        </form>
      </section>
    </div>
  </dialog>
</template>
