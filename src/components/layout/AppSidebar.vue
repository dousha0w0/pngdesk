<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/ui/Icon.vue";
import SwitchToggle from "@/components/ui/SwitchToggle.vue";
import { formatBytes } from "@/lib/format";
import { t } from "@/i18n";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";
import type { ViewKind } from "@/types";

const queue = useQueueStore();
const ui = useUiStore();

const views = computed<{ view: ViewKind; icon: string; label: string; count: number }[]>(() => [
  { view: "all", icon: "list", label: "nav.all", count: queue.totals.count },
  { view: "active", icon: "clock", label: "nav.active", count: queue.totals.running },
  { view: "done", icon: "check", label: "nav.done", count: queue.totals.done },
  { view: "failed", icon: "alert", label: "nav.failed", count: queue.totals.failed },
]);

const QUALITIES: { value: number | null }[] = [{ value: null }, { value: 85 }, { value: 90 }, { value: 95 }];

const parallelOptions = [0, 1, 2, 3, 4, 6, 8];
</script>

<template>
  <aside class="app-sidebar app-pane select-none" data-testid="sidebar">
    <button class="app-sidebar-toolbar flex w-full items-center gap-2 border-b px-2.5 pb-1.5 pt-2 text-left" @click="ui.settingsOpen = true">
      <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        <Icon name="palette" :size="13" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-[12px] font-medium text-foreground">{{ $t("nav.batch") }}</span>
        <span class="block truncate text-[10.5px] text-muted-foreground">
          {{ t("queue.files", { n: queue.totals.count }, queue.totals.count) }} ·
          {{ ui.prefs.quality === null ? $t("nav.auto") : `SSIMULACRA2 ≥ ${ui.prefs.quality}` }}
        </span>
      </span>
      <Icon name="chevron-down" :size="13" class="text-muted-foreground" />
    </button>

    <nav class="flex flex-col gap-0.5 px-2 pb-1 pt-1">
      <button
        v-for="item in views"
        :key="item.view"
        class="nav-row text-[12.5px]"
        :data-active="queue.view === item.view || undefined"
        :data-testid="`nav-${item.view}`"
        @click="queue.view = item.view"
      >
        <Icon :name="item.icon" :size="15" class="text-muted-foreground" />
        <span class="flex-1 text-left">{{ $t(item.label) }}</span>
        <span v-if="item.count" class="text-[10.5px] tabular-nums text-muted-foreground">{{ item.count }}</span>
      </button>
    </nav>

    <div class="mx-2 my-1 h-px bg-sidebar-border" />

    <div class="px-3 pb-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
      {{ $t("nav.options") }}
    </div>

    <div class="scroll-thin min-h-0 flex-1 overflow-auto px-2 pb-2">
      <div class="px-1 pb-1 pt-1.5 text-[11px] text-muted-foreground">{{ $t("nav.quality") }}</div>
      <div class="grid grid-cols-4 gap-1 px-1">
        <button
          v-for="option in QUALITIES"
          :key="String(option.value)"
          class="h-6 rounded-[5px] border text-[11.5px] transition-colors"
          :class="
            ui.prefs.quality === option.value
              ? 'border-border bg-accent font-medium text-foreground'
              : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
          "
          :aria-pressed="ui.prefs.quality === option.value"
          @click="ui.setPrefs({ quality: option.value })"
        >
          {{ option.value === null ? $t("nav.auto") : option.value }}
        </button>
      </div>
      <p class="px-1 pt-1.5 text-[10.5px] leading-snug text-muted-foreground">{{ $t("nav.qualityHint") }}</p>

      <div class="mt-2 border-t border-sidebar-border px-1 pt-1">
        <SwitchToggle
          :model-value="ui.prefs.thorough"
          :label="$t('nav.thorough')"
          @update:model-value="ui.setPrefs({ thorough: $event })"
        />
        <p class="pb-1 text-[10.5px] leading-snug text-muted-foreground">{{ $t("nav.thoroughHint") }}</p>
      </div>

      <div class="mt-1 border-t border-sidebar-border px-1 pt-2">
        <div class="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{{ $t("nav.parallel") }}</span>
          <select
            class="h-6 rounded-[5px] border border-border bg-card px-1 text-[11.5px] text-foreground"
            :value="ui.prefs.parallelism"
            :disabled="queue.mode === 'threaded'"
            :title="$t('nav.parallelHint')"
            @change="ui.setPrefs({ parallelism: Number(($event.target as HTMLSelectElement).value) })"
          >
            <option v-for="value in parallelOptions" :key="value" :value="value">
              {{ value === 0 ? $t("nav.auto") : value }}
            </option>
          </select>
        </div>
        <p class="pt-1 text-[10.5px] leading-snug text-muted-foreground">
          {{ queue.mode === "threaded" ? $t("toolbar.modeThreaded") + " · " + $t("nav.parallelHint") : $t("nav.parallelHint") }}
        </p>
      </div>
    </div>

    <div class="border-t px-2.5 py-2" :style="{ borderColor: 'var(--sidebar-border)' }">
      <div class="mb-1 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span class="inline-flex items-center gap-1"><Icon name="gauge" :size="12" />{{ $t("nav.saved") }}</span>
        <span class="tabular-nums">{{ queue.totals.percent.toFixed(1) }}%</span>
      </div>
      <div class="h-1 overflow-hidden rounded-full bg-sidebar-border">
        <div class="h-full rounded-full bg-primary transition-[width] duration-300" :style="{ width: `${Math.max(0, Math.min(100, queue.totals.percent))}%` }" />
      </div>
      <div class="mt-1.5 flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span class="tabular-nums">{{ formatBytes(queue.totals.before - queue.totals.after) }}</span>
        <span class="tabular-nums">{{ formatBytes(queue.totals.before) }} → {{ formatBytes(queue.totals.after) }}</span>
      </div>
      <div class="mt-1.5 text-[10.5px] text-muted-foreground">{{ $t("nav.hint") }}</div>
    </div>
  </aside>
</template>
