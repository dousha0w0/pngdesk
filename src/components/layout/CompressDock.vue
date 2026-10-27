<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/ui/Icon.vue";
import { formatBytes, formatDelta, formatMs, formatSpeed, savingPercent } from "@/lib/format";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";
import type { Job } from "@/types";

const queue = useQueueStore();
const ui = useUiStore();

const rows = computed<Job[]>(() => {
  const active = queue.jobs.filter((job) => job.status === "running" || job.status === "queued");
  const finished = queue.jobs
    .filter((job) => job.status === "done" || job.status === "error")
    .sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0));
  return [...active, ...finished].slice(0, 40);
});

const throughput = computed(() => (queue.totals.doneMs ? formatSpeed(queue.totals.before, queue.totals.doneMs) : null));

function elapsed(job: Job): string | null {
  if (!job.startedAt) return null;
  return formatMs((job.endedAt ?? queue.now) - job.startedAt);
}

function statusIcon(job: Job): string {
  if (job.status === "running") return "spinner";
  if (job.status === "queued") return "clock";
  if (job.status === "error") return "alert";
  return "check";
}
</script>

<template>
  <section class="flex shrink-0 flex-col border-t border-border bg-background" :style="{ height: `${ui.prefs.dockHeight}px` }" data-testid="compress-dock">
    <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border px-3 text-[11.5px]">
      <Icon name="sliders" :size="13" class="text-muted-foreground" />
      <span class="font-medium">{{ $t("dock.title") }}</span>
      <span v-if="queue.totals.running" class="badge" data-tone="accent">{{ queue.totals.running }}</span>
      <span v-if="throughput" class="text-muted-foreground">{{ $t("dock.throughput") }} {{ throughput }}</span>
      <div class="flex-1" />
      <button
        v-if="queue.totals.done || queue.totals.failed"
        class="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        @click="queue.clearFinished()"
      >
        {{ $t("dock.clearFinished") }}
      </button>
      <button class="rounded p-1 text-muted-foreground hover:bg-muted" :title="$t('actions.close')" @click="ui.setPrefs({ dockOpen: false })">
        <Icon name="chevron-down" :size="13" />
      </button>
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-auto px-2 py-1">
      <div v-if="!rows.length" class="flex h-full flex-col items-center justify-center gap-1 text-center">
        <span class="text-[12px] text-muted-foreground">{{ $t("dock.idle") }}</span>
        <span class="text-[11px] text-muted-foreground/80">{{ $t("dock.idleHint") }}</span>
      </div>

      <div
        v-for="job in rows"
        :key="job.id"
        class="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/60"
        :data-testid="`activity-${job.name}`"
      >
        <Icon
          :name="statusIcon(job)"
          :size="13"
          class="shrink-0"
          :class="[
            job.status === 'running' ? 'spin text-foreground' : '',
            job.status === 'error' ? 'text-destructive' : '',
            job.status === 'done' ? 'text-success' : '',
            job.status === 'queued' ? 'text-muted-foreground' : '',
          ]"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-baseline gap-2">
            <span class="truncate text-[11.5px]" :title="job.error ?? job.name">{{ job.name }}</span>
            <span class="ml-auto shrink-0 text-[10.5px] tabular-nums text-muted-foreground">
              {{ formatBytes(job.bytes.byteLength) }}
              <template v-if="job.png"> → {{ formatBytes(job.png.byteLength) }}</template>
            </span>
            <span
              v-if="job.png"
              class="w-[46px] shrink-0 text-right text-[10.5px] tabular-nums"
              :class="savingPercent(job.bytes.byteLength, job.png.byteLength) > 0 ? 'text-success' : 'text-muted-foreground'"
            >
              {{ formatDelta(savingPercent(job.bytes.byteLength, job.png.byteLength)) }}
            </span>
            <span v-else class="w-[46px] shrink-0 text-right text-[10.5px] tabular-nums text-muted-foreground">
              {{ job.status === "error" ? $t("job.error") : job.status === "queued" ? $t("job.queued") : "…" }}
            </span>
            <span class="w-[58px] shrink-0 text-right text-[10.5px] tabular-nums text-muted-foreground">{{ elapsed(job) ?? "—" }}</span>
            <button
              v-if="job.status === 'error'"
              class="shrink-0 rounded px-1.5 py-0.5 text-[10.5px] text-muted-foreground hover:bg-muted hover:text-foreground"
              @click="queue.retry(job)"
            >
              {{ $t("actions.retry") }}
            </button>
          </div>
          <div v-if="job.status === 'running'" class="meter mt-1" />
          <div v-else-if="job.status === 'error'" class="mt-0.5 truncate text-[10.5px] text-destructive">{{ job.error }}</div>
        </div>
      </div>
    </div>
  </section>
</template>
