<script setup lang="ts">
import { ICONS } from "@/lib/icons";

withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="ICONS[name] ?? ICONS.file" />
  </svg>
</template>
