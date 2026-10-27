<script setup lang="ts">
import { computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { t } from "@/i18n";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";

const queue = useQueueStore();
const ui = useUiStore();

const viewLabel = computed(() =>
  queue.view === "all"
    ? "nav.all"
    : queue.view === "active"
      ? "nav.active"
      : queue.view === "done"
        ? "nav.done"
        : "nav.failed",
);
</script>

<template>
  <div class="app-queuebar flex h-8 shrink-0 items-center gap-2 border-b px-2.5 text-[11.5px]">
    <Icon name="list" :size="13" class="text-muted-foreground" />
    <button class="text-muted-foreground hover:text-foreground" @click="queue.view = 'all'">{{ $t("queue.crumb") }}</button>
    <Icon name="chevron-right" :size="11" class="text-muted-foreground/60" />
    <span class="font-medium">{{ $t(viewLabel) }}</span>
    <span class="text-muted-foreground">· {{ t("queue.files", { n: queue.visibleJobs.length }, queue.visibleJobs.length) }}</span>
    <span v-if="queue.selection.length" class="text-muted-foreground">· {{ t("queue.selected", { n: queue.selection.length }, queue.selection.length) }}</span>

    <div class="flex-1" />

    <span class="badge">{{ ui.prefs.quality === null ? $t("nav.auto") : `SSIMULACRA2 ≥ ${ui.prefs.quality}` }}</span>
    <span v-if="ui.prefs.thorough" class="badge" data-tone="accent">{{ $t("nav.thorough") }}</span>
    <span v-if="queue.mode" class="badge" :data-tone="queue.isolated ? 'success' : undefined">
      <Icon name="cpu" :size="10" />
      {{ queue.mode === "threaded" ? $t("toolbar.modeThreaded") : $t("toolbar.modeWorkers", { n: queue.workerCount }) }}
    </span>

    <div class="mx-1 h-4 w-px bg-border" />

    <AppButton
      size="xs"
      variant="ghost"
      icon="refresh"
      :title="$t('toolbar.recompress')"
      :disabled="!queue.totals.done && !queue.totals.failed"
      @click="queue.recompressAll()"
    >
      <span class="hidden lg:inline">{{ $t("toolbar.recompress") }}</span>
    </AppButton>
    <AppButton size="xs" variant="secondary" icon="download" :disabled="!queue.totals.done" @click="queue.downloadAll()">
      <span class="hidden sm:inline">{{ $t("toolbar.downloadAll") }}</span>
    </AppButton>
  </div>
</template>
