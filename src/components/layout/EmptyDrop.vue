<script setup lang="ts">
import { ref } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";

const queue = useQueueStore();
const ui = useUiStore();
const input = ref<HTMLInputElement | null>(null);
const loadingSamples = ref(false);

async function onPicked(event: Event): Promise<void> {
  const element = event.target as HTMLInputElement;
  if (element.files?.length) await queue.addFiles(element.files);
  element.value = "";
}

async function loadSamples(): Promise<void> {
  loadingSamples.value = true;
  try {
    await queue.loadSamples();
  } finally {
    loadingSamples.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col p-4">
    <div
      class="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--dr-lg)] border-2 border-dashed px-6 py-10 text-center transition-colors"
      :class="ui.dragOver ? 'border-ring bg-selection/40' : 'border-border'"
      data-testid="empty-drop"
    >
      <span class="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
        <Icon name="image" :size="22" />
      </span>
      <h1 class="text-[17px] font-semibold tracking-tight">{{ $t("queue.dropTitle") }}</h1>
      <p class="max-w-[420px] text-[12px] leading-relaxed text-muted-foreground">{{ $t("queue.dropBody") }}</p>
      <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
        <AppButton size="md" variant="primary" icon="plus" data-testid="choose-files" @click="input?.click()">
          {{ $t("queue.choose") }}
        </AppButton>
        <AppButton size="md" variant="secondary" icon="image" :disabled="loadingSamples" data-testid="load-samples" @click="loadSamples">
          {{ $t("queue.samples") }}
        </AppButton>
      </div>
      <div class="mt-2 flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
        <span class="inline-flex items-center gap-1.5"><Icon name="lock" :size="11" />{{ $t("statusbar.localOnly") }}</span>
        <span>{{ $t("queue.limit") }}</span>
        <span class="text-muted-foreground/80">{{ $t("queue.dropHint") }}</span>
      </div>
    </div>
    <input ref="input" type="file" accept="image/png,image/apng" multiple hidden @change="onPicked" />
  </div>
</template>
