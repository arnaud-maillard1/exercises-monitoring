<script setup lang="ts">
import ProgressionTable from '../components/ProgressionTable.vue'
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
    </header>

    <ProgressionTable mode-edition="clic" />
  </section>
</template>
