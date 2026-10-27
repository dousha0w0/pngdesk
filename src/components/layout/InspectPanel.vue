<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { formatBytes, formatMs, savingPercent } from "@/lib/format";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";
import { t } from "@/i18n";

const queue = useQueueStore();
const ui = useUiStore();

const job = computed(() => queue.activeJob);
const surface = ref<HTMLElement | null>(null);
const stage = ref<HTMLElement | null>(null);
const box = ref({ width: 0, height: 0 });
const zoom = ref<"fit" | "1" | "2">("fit");
const background = ref<"grid" | "white" | "dark">("grid");
const split = ref(50);
const dragging = ref(false);
let observer: ResizeObserver | null = null;

const done = computed(() => job.value?.status === "done" && Boolean(job.value.resultUrl));
const savedPercent = computed(() => {
  const current = job.value;
  if (!current?.png) return 0;
  return savingPercent(current.bytes.byteLength, current.png.byteLength);
});

/** Fit snaps down to a whole device-pixel multiple from 2× up, so pixels stay square. */
const stageStyle = computed(() => {
  const current = job.value;
  if (!current?.width || !current.height) return { width: "0px", height: "0px" };
  const dpr = window.devicePixelRatio || 1;
  const padding = 20;
  const availableWidth = Math.max(40, box.value.width - padding * 2);
  const availableHeight = Math.max(40, box.value.height - padding * 2);
  const fit = Math.min(availableWidth / current.width, availableHeight / current.height, 4 / dpr);
  const explicit = zoom.value === "fit" ? null : Number(zoom.value) / dpr;
  const scale = explicit ?? (fit * dpr >= 2 ? Math.floor(fit * dpr) / dpr : fit);
  return {
    width: `${Math.max(1, Math.round(current.width * scale))}px`,
    height: `${Math.max(1, Math.round(current.height * scale))}px`,
  };
});

const pixelated = computed(() => {
  const current = job.value;
  if (!current?.width) return false;
  const dpr = window.devicePixelRatio || 1;
  const rendered = (Number.parseFloat(stageStyle.value.width) * dpr) / current.width;
  return rendered > 1.99 && Math.abs(rendered - Math.round(rendered)) < 0.01;
});

const facts = computed(() => {
  const current = job.value;
  if (!current) return [];
  const report = current.report;
  const rows = [
    { label: "inspect.dimensions", value: current.width ? `${current.width} × ${current.height}` : "—" },
    { label: "inspect.originalSize", value: formatBytes(current.bytes.byteLength) },
    { label: "inspect.resultSize", value: current.png ? formatBytes(current.png.byteLength) : "—" },
    { label: "inspect.time", value: formatMs(current.ms) },
  ];
  if (report) {
    rows.push(
      { label: "inspect.target", value: report.target.toFixed(2) },
      { label: "inspect.score", value: report.score.toFixed(2) },
      { label: "inspect.evals", value: String(report.evals) },
      { label: "inspect.checks", value: String(report.checks) },
      { label: "inspect.preview", value: report.preview > 1 ? `1/${report.preview}` : "1:1" },
      { label: "inspect.variant", value: report.variant },
    );
  }
  return rows;
});

const TIMINGS = [
  { key: "reference", label: "inspect.tReference" },
  { key: "quantize", label: "inspect.tQuantize" },
  { key: "remap", label: "inspect.tRemap" },
  { key: "score", label: "inspect.tScore" },
  { key: "encode", label: "inspect.tEncode" },
  { key: "optimize", label: "inspect.tOptimize" },
] as const;

const timings = computed(() => {
  const report = job.value?.report;
  if (!report) return [];
  const values = TIMINGS.map((entry) => report.ms[entry.key]);
  const max = Math.max(1, ...values);
  return TIMINGS.map((entry) => ({
    label: entry.label,
    ms: report.ms[entry.key],
    percent: (report.ms[entry.key] / max) * 100,
  }));
});

function setSplit(percent: number): void {
  split.value = Math.min(100, Math.max(0, percent));
  stage.value?.style.setProperty("--split", `${split.value}%`);
}

function moveTo(event: PointerEvent): void {
  const element = stage.value;
  if (!element) return;
  const rect = element.getBoundingClientRect();
  setSplit(((event.clientX - rect.left) / rect.width) * 100);
}

function onPointerDown(event: PointerEvent): void {
  if (!done.value) return;
  dragging.value = true;
  stage.value?.setPointerCapture(event.pointerId);
  moveTo(event);
}

function onPointerMove(event: PointerEvent): void {
  if (dragging.value) moveTo(event);
}

function onKeydown(event: KeyboardEvent): void {
  const delta = { ArrowLeft: -4, ArrowRight: 4, Home: -100, End: 100 }[event.key];
  if (delta === undefined) return;
  event.preventDefault();
  setSplit(split.value + delta);
}

/** A short look left and right when a result arrives, so the handle explains itself. */
function sweep(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const keys: [number, number][] = [
    [0, 50],
    [420, 28],
    [900, 68],
    [1300, 50],
  ];
  const start = performance.now();
  const step = (now: number) => {
    if (dragging.value) return;
    const elapsed = Math.max(0, now - start);
    const next = keys.findIndex(([at]) => at > elapsed);
    if (next < 0) {
      setSplit(50);
      return;
    }
    const [fromAt, fromValue] = keys[next - 1] ?? [0, 50];
    const [toAt, toValue] = keys[next] ?? [1300, 50];
    const progress = (elapsed - fromAt) / (toAt - fromAt);
    setSplit(fromValue + (toValue - fromValue) * progress * progress * (3 - 2 * progress));
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function copyReport(): Promise<void> {
  const current = job.value;
  if (!current?.report) return;
  await navigator.clipboard.writeText(
    JSON.stringify({ name: current.name, dimensions: `${current.width}×${current.height}`, ...current.report }, null, 2),
  );
  ui.toast(t("toast.copied"), "success", 1600);
}

function download(): void {
  if (job.value) queue.download(job.value);
}

onMounted(() => {
  if (surface.value) {
    box.value = { width: surface.value.clientWidth, height: surface.value.clientHeight };
    observer = new ResizeObserver(() => {
      if (!surface.value) return;
      box.value = { width: surface.value.clientWidth, height: surface.value.clientHeight };
    });
    observer.observe(surface.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());

watch(
  () => job.value?.id,
  () => {
    setSplit(50);
    if (job.value?.status === "done") sweep();
  },
);

watch(
  () => job.value?.status,
  (status, previous) => {
    if (status === "done" && previous !== "done") sweep();
  },
);
</script>

<template>
  <aside class="app-details app-pane" data-testid="inspect-panel">
    <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border px-2">
      <button
        class="h-6 rounded-[5px] px-2 text-[11.5px]"
        :class="ui.prefs.inspectTab === 'compare' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'"
        :aria-pressed="ui.prefs.inspectTab === 'compare'"
        @click="ui.setPrefs({ inspectTab: 'compare' })"
      >
        {{ $t("inspect.compare") }}
      </button>
      <button
        class="h-6 rounded-[5px] px-2 text-[11.5px]"
        :class="ui.prefs.inspectTab === 'report' ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'"
        :aria-pressed="ui.prefs.inspectTab === 'report'"
        @click="ui.setPrefs({ inspectTab: 'report' })"
      >
        {{ $t("inspect.report") }}
      </button>
      <div class="flex-1" />
      <AppButton
        size="icon-sm"
        variant="ghost"
        icon="copy"
        :title="$t('inspect.report')"
        :disabled="!job?.report"
        @click="copyReport"
      />
      <AppButton size="icon-sm" variant="ghost" icon="download" :title="$t('inspect.download')" :disabled="!done" @click="download" />
    </div>

    <div v-if="!job" class="panel-empty">
      <Icon name="eye" :size="24" class="text-muted-foreground/60" />
      <span class="text-[12px]">{{ $t("inspect.noSelection") }}</span>
    </div>

    <template v-else-if="ui.prefs.inspectTab === 'compare'">
      <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-2 py-1.5 text-[11px]">
        <span class="max-w-[150px] truncate font-medium" :title="job.name">{{ job.name }}</span>
        <span class="text-muted-foreground">{{ job.width }}×{{ job.height }}</span>
        <span v-if="done" class="badge" data-tone="success">−{{ Math.round(savedPercent) }}%</span>
        <span v-else class="badge">{{ $t(`job.${job.status}`) }}</span>
      </div>

      <div ref="surface" class="stage-surface flex-1 min-h-0 overflow-auto" :data-bg="background">
        <div
          v-if="job.width && job.height"
          ref="stage"
          class="compare-stage"
          :class="{ pixelated }"
          :style="stageStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="dragging = false"
          @pointercancel="dragging = false"
        >
          <img class="after" :src="job.resultUrl ?? job.sourceUrl" alt="" draggable="false" />
          <img class="before" :src="job.sourceUrl" alt="" draggable="false" />
          <div class="divider" />
          <button
            class="knob"
            type="button"
            role="slider"
            :aria-label="$t('inspect.compare')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="Math.round(split)"
            :disabled="!done"
            @keydown="onKeydown"
          >
            <Icon name="chevron-left" :size="11" />
            <Icon name="chevron-right" :size="11" />
          </button>
        </div>
        <div v-else class="flex h-full w-full items-center justify-center text-[11.5px] text-muted-foreground">
          {{ $t("inspect.noResult") }}
        </div>
      </div>

      <div class="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border px-2 py-1.5">
        <div class="seg" role="group" :aria-label="$t('inspect.zoom')">
          <button type="button" :aria-pressed="zoom === 'fit'" @click="zoom = 'fit'">{{ $t("inspect.fit") }}</button>
          <button type="button" :aria-pressed="zoom === '1'" @click="zoom = '1'">{{ $t("inspect.actual") }}</button>
          <button type="button" :aria-pressed="zoom === '2'" @click="zoom = '2'">{{ $t("inspect.double") }}</button>
        </div>
        <div class="seg" role="group" :aria-label="$t('inspect.background')">
          <button type="button" :aria-pressed="background === 'grid'" @click="background = 'grid'">{{ $t("inspect.grid") }}</button>
          <button type="button" :aria-pressed="background === 'white'" @click="background = 'white'">{{ $t("inspect.white") }}</button>
          <button type="button" :aria-pressed="background === 'dark'" @click="background = 'dark'">{{ $t("inspect.dark") }}</button>
        </div>
        <div class="flex-1" />
        <span class="text-[10.5px] text-muted-foreground">{{ $t("inspect.before") }} / {{ $t("inspect.after") }}</span>
      </div>
    </template>

    <div v-else class="scroll-thin flex-1 overflow-auto px-3 py-2">
      <div class="mb-2 flex items-center gap-2">
        <span class="badge" :data-tone="job.report?.outcome === 'hit' || job.report?.outcome === 'exact' ? 'success' : undefined">
          {{ job.report ? $t(`outcome.${job.report.outcome}`) : $t(`job.${job.status}`) }}
        </span>
        <span v-if="job.report" class="text-[11px] text-muted-foreground">
          SSIMULACRA2 {{ job.report.score.toFixed(2) }} · {{ $t("inspect.scoreHint") }}
        </span>
      </div>

      <div v-if="job.error" class="mb-2 rounded-[var(--dr-sm)] border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] text-destructive">
        {{ job.error }}
      </div>

      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11.5px]">
        <template v-for="fact in facts" :key="fact.label">
          <dt class="text-muted-foreground">{{ $t(fact.label) }}</dt>
          <dd class="text-right font-mono text-[11px] tabular-nums">{{ fact.value }}</dd>
        </template>
      </dl>

      <template v-if="job.png">
        <div class="mt-3 border-t border-border pt-2">
          <div class="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{{ $t("inspect.palette", { n: job.palette.length }) }}</span>
            <span class="tabular-nums">{{ formatBytes(job.png.byteLength) }}</span>
          </div>
          <div class="swatches mt-1.5">
            <i
              v-for="(swatch, index) in job.palette"
              :key="index"
              :style="{ background: `rgba(${swatch.r},${swatch.g},${swatch.b},${(swatch.a / 255).toFixed(3)})` }"
              :title="`rgb(${swatch.r} ${swatch.g} ${swatch.b})`"
            />
          </div>
        </div>
      </template>

      <template v-if="job.report">
        <div class="mt-3 border-t border-border pt-2">
          <div class="mb-1.5 text-[11px] text-muted-foreground">{{ $t("inspect.timings") }}</div>
          <div class="flex flex-col gap-1">
            <div v-for="timing in timings" :key="timing.label" class="timing-row">
              <span>{{ $t(timing.label) }}</span>
              <div class="track"><div class="fill" :style="{ width: `${Math.max(2, timing.percent)}%` }" /></div>
              <span class="text-right tabular-nums">{{ formatMs(timing.ms) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </aside>
</template>
