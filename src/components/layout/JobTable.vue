<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Icon from "@/components/ui/Icon.vue";
import { formatBytes, formatDelta, savingPercent } from "@/lib/format";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";
import type { Job, SortKey } from "@/types";

const queue = useQueueStore();
const ui = useUiStore();

const viewport = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(600);
const rowHeight = ref(32);
const OVERSCAN = 8;
let observer: ResizeObserver | null = null;

const COLUMNS: { key: SortKey; label: string; className: string; align: "left" | "right" }[] = [
  { key: "name", label: "table.name", className: "job-col-name", align: "left" },
  { key: "original", label: "table.original", className: "job-col-original", align: "right" },
  { key: "result", label: "table.result", className: "job-col-result", align: "right" },
  { key: "saved", label: "table.saved", className: "job-col-saved", align: "right" },
  { key: "score", label: "table.score", className: "job-col-score", align: "right" },
];

const range = computed(() => {
  const height = rowHeight.value;
  const first = Math.max(0, Math.floor(scrollTop.value / height) - OVERSCAN);
  const count = Math.ceil(viewportHeight.value / height) + OVERSCAN * 2;
  return { first, last: Math.min(queue.visibleJobs.length, first + count) };
});

const windowJobs = computed(() =>
  queue.visibleJobs.slice(range.value.first, range.value.last).map((job, offset) => ({
    job,
    index: range.value.first + offset,
  })),
);

function readRowHeight(): void {
  if (!viewport.value) return;
  const parsed = Number.parseFloat(getComputedStyle(viewport.value).getPropertyValue("--dr-row"));
  if (Number.isFinite(parsed) && parsed > 0) rowHeight.value = parsed;
}

function onScroll(): void {
  scrollTop.value = viewport.value?.scrollTop ?? 0;
}

function onRowClick(event: MouseEvent, job: Job): void {
  queue.select(job.id, { toggle: event.metaKey || event.ctrlKey, range: event.shiftKey });
}

function onRowDoubleClick(job: Job): void {
  if (job.status === "done") queue.download(job);
}

function statusIcon(job: Job): string {
  if (job.status === "running") return "spinner";
  if (job.status === "queued") return "clock";
  if (job.status === "error") return "alert";
  return "check";
}

function statusTone(job: Job): string {
  if (job.status === "error") return "text-destructive";
  if (job.status === "done") return "text-success";
  return "text-muted-foreground";
}

function scrollToActive(): void {
  const index = queue.visibleJobs.findIndex((job) => job.id === queue.activeId);
  const element = viewport.value;
  if (index < 0 || !element) return;
  const top = index * rowHeight.value;
  if (top < element.scrollTop) element.scrollTop = top;
  else if (top + rowHeight.value > element.scrollTop + viewportHeight.value) {
    element.scrollTop = top + rowHeight.value - viewportHeight.value;
  }
}

onMounted(() => {
  readRowHeight();
  viewportHeight.value = viewport.value?.clientHeight ?? 600;
  observer = new ResizeObserver(() => {
    viewportHeight.value = viewport.value?.clientHeight ?? 600;
  });
  if (viewport.value) observer.observe(viewport.value);
});

onBeforeUnmount(() => observer?.disconnect());

watch(
  () => ui.prefs.density,
  async () => {
    await nextTick();
    readRowHeight();
  },
);

watch(() => queue.activeId, scrollToActive);
</script>

<template>
  <div class="job-table" :class="`row-density-${ui.prefs.density}`" data-testid="job-table">
    <div class="job-table__head job-grid">
      <button
        v-for="column in COLUMNS"
        :key="column.key"
        class="job-table__head-cell"
        :class="[column.className, column.align === 'right' ? 'justify-end' : '']"
        data-sortable="true"
        @click="queue.toggleSort(column.key)"
      >
        <span>{{ $t(column.label) }}</span>
        <Icon
          v-if="queue.sortKey === column.key"
          :name="queue.sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'"
          :size="11"
        />
      </button>
      <div class="job-table__head-cell job-col-status justify-end">{{ $t("table.status") }}</div>
    </div>

    <div ref="viewport" class="job-table__viewport scroll-thin" @scroll.passive="onScroll">
      <div
        v-if="!queue.visibleJobs.length"
        class="flex h-full flex-col items-center justify-center gap-2 px-8 text-center"
      >
        <Icon name="image" :size="28" class="text-muted-foreground/70" />
        <div class="text-[13px] font-medium">
          {{ queue.filter || queue.view !== "all" ? $t("queue.filtered") : $t("queue.dropTitle") }}
        </div>
        <div class="max-w-[380px] text-[11.5px] leading-relaxed text-muted-foreground">
          {{ queue.filter || queue.view !== "all" ? "" : $t("queue.dropHint") }}
        </div>
      </div>

      <div v-else class="job-table__spacer" :style="{ height: `${queue.visibleJobs.length * rowHeight}px` }">
        <div
          v-for="item in windowJobs"
          :key="item.job.id"
          class="job-table__row job-grid group"
          role="row"
          :aria-selected="queue.selection.includes(item.job.id)"
          :data-selected="queue.selection.includes(item.job.id) || undefined"
          :data-testid="`row-${item.job.name}`"
          :style="{ transform: `translateY(${item.index * rowHeight}px)` }"
          @click="onRowClick($event, item.job)"
          @dblclick="onRowDoubleClick(item.job)"
        >
          <div class="job-table__cell job-table__name job-col-name">
            <img class="job-table__thumb" :src="item.job.resultUrl ?? item.job.sourceUrl" alt="" loading="lazy" />
            <span class="truncate" :title="`${item.job.name} · ${item.job.width}×${item.job.height}`">{{ item.job.name }}</span>
            <span class="hidden shrink-0 text-[10.5px] tabular-nums text-muted-foreground xl:inline">
              {{ item.job.width }}×{{ item.job.height }}
            </span>
          </div>
          <div class="job-table__cell job-table__cell--num job-col-original">{{ formatBytes(item.job.bytes.byteLength) }}</div>
          <div class="job-table__cell job-table__cell--num job-col-result">
            {{ item.job.png ? formatBytes(item.job.png.byteLength) : "—" }}
          </div>
          <div
            class="job-table__cell job-table__cell--num job-col-saved"
            :class="item.job.png && savingPercent(item.job.bytes.byteLength, item.job.png.byteLength) > 0 ? 'text-success' : ''"
          >
            {{ item.job.png ? formatDelta(savingPercent(item.job.bytes.byteLength, item.job.png.byteLength)) : "—" }}
          </div>
          <div class="job-table__cell job-table__cell--num job-col-score" :title="$t('inspect.scoreHint')">{{ item.job.report ? item.job.report.score.toFixed(1) : "—" }}</div>
          <div class="job-table__cell job-col-status justify-end gap-1.5">
            <span class="flex items-center gap-1.5 text-[11.5px]" :class="statusTone(item.job)">
              <Icon :name="statusIcon(item.job)" :size="12" :class="item.job.status === 'running' ? 'spin' : ''" />
              <span class="truncate" :title="item.job.error">{{ $t(`job.${item.job.status}`) }}</span>
            </span>
            <button
              class="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              :title="$t('actions.remove')"
              :aria-label="$t('actions.remove')"
              @click.stop="queue.remove([item.job.id])"
            >
              <Icon name="x" :size="11" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
