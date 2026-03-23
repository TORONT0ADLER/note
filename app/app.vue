<script setup lang="ts">
useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "ru",
  },
});

const title = "Noteforge - Приложение для заметок";
const description =
  "Приложение для заметок типа Obsidian и OneNote на Vue и Nuxt UI.";

useSeoMeta({
  title,
  description,
});
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
