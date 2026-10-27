<script setup lang="ts">
import Icon from "@/components/ui/Icon.vue";
import { t } from "@/i18n";
import { useQueueStore } from "@/stores/queue";

const queue = useQueueStore();
const VERSION = "0.1.0";
</script>

<template>
  <footer class="flex h-[26px] shrink-0 items-center gap-3 border-t border-border bg-chrome px-3 text-[10.5px] text-muted-foreground" data-testid="status-bar">
    <span class="flex items-center gap-1">
      <Icon name="lock" :size="11" />
      <span>{{ $t("statusbar.localOnly") }}</span>
    </span>
    <span>{{ t("statusbar.files", { n: queue.totals.count }, queue.totals.count) }}</span>
    <span v-if="queue.selection.length">{{ t("statusbar.selected", { n: queue.selection.length }, queue.selection.length) }}</span>
    <span v-if="queue.totals.running" class="flex items-center gap-1">
      <Icon name="spinner" :size="10" class="spin" />
      {{ queue.totals.running }}
    </span>
    <span v-if="queue.poolError" class="max-w-[320px] truncate text-destructive" :title="queue.poolError">
      {{ $t("statusbar.poolError") }} · {{ queue.poolError }}
    </span>
    <div class="flex-1" />
    <span v-if="queue.totals.done" class="tabular-nums">{{ $t("statusbar.saved", { n: queue.totals.percent.toFixed(1) }) }}</span>
    <span class="badge" :data-tone="queue.isolated ? 'success' : undefined">
      <Icon name="cpu" :size="10" />
      {{ queue.isolated ? $t("statusbar.isolated") : $t("statusbar.notIsolated") }}
    </span>
    <span v-if="queue.mode" class="badge">
      {{ queue.mode === "threaded" ? $t("toolbar.modeThreaded") : $t("statusbar.workers", { n: queue.workerCount }) }}
    </span>
    <span class="text-muted-foreground/60">{{ $t("statusbar.version", { version: VERSION }) }}</span>
  </footer>
</template>
