<script setup lang="ts">
import Icon from "./Icon.vue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
</script>

<template>
  <div class="toast-stack" role="status" aria-live="polite">
    <div v-for="toast in ui.toasts" :key="toast.id" class="toast" :data-kind="toast.kind">
      <Icon
        :name="toast.kind === 'error' ? 'alert' : toast.kind === 'success' ? 'check' : 'info'"
        :size="14"
        class="mt-0.5 shrink-0"
        :class="toast.kind === 'error' ? 'text-destructive' : toast.kind === 'success' ? 'text-success' : 'text-muted-foreground'"
      />
      <span class="flex-1 select-text">{{ toast.message }}</span>
      <button class="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted" :aria-label="$t('actions.dismiss')" @click="ui.dismissToast(toast.id)">
        <Icon name="x" :size="12" />
      </button>
    </div>
  </div>
</template>
