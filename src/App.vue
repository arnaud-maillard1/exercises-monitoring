<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

const navigation = [
  { label: 'Ma classe', to: '/' },
  { label: 'Thèmes & exercices', to: '/themes' },
  { label: 'Suivi', to: '/suivi' },
  { label: 'Session actuelle', to: '/session' },
]
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <RouterLink class="app-name" to="/">
        Suivi d’exercices
      </RouterLink>

      <nav class="app-navigation" aria-label="Navigation principale">
        <RouterLink v-for="lien in navigation" :key="lien.to" :to="lien.to" class="navigation-link">
          {{ lien.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>
