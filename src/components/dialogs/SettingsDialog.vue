<script setup lang="ts">
import { computed } from "vue";
import AppModal from "@/components/ui/AppModal.vue";
import SegmentedControl from "@/components/ui/SegmentedControl.vue";
import SwitchToggle from "@/components/ui/SwitchToggle.vue";
import { LOCALES, currentLocale, setLocale } from "@/i18n";
import { useUiStore } from "@/stores/ui";
import { useQueueStore } from "@/stores/queue";
import type { CornerStyle, Density, LayoutMode, Locale, Palette, ThemeMode } from "@/types";

const ui = useUiStore();
const queue = useQueueStore();

const locale = computed<Locale>({
  get: () => currentLocale(),
  set: (value) => setLocale(value),
});

const quality = computed<string>({
  get: () => (ui.prefs.quality === null ? "auto" : String(ui.prefs.quality)),
  set: (value) => ui.setPrefs({ quality: value === "auto" ? null : Number(value) }),
});

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "settings.light" },
  { value: "dark", label: "settings.dark" },
  { value: "system", label: "settings.system" },
];

const paletteOptions: { value: Palette; label: string }[] = [
  { value: "neutral", label: "settings.paletteNeutral" },
  { value: "graphite", label: "settings.paletteGraphite" },
  { value: "vscode", label: "settings.paletteVscode" },
];

const cornerOptions: { value: CornerStyle; label: string }[] = [
  { value: "default", label: "settings.cornersDefault" },
  { value: "small", label: "settings.cornersSmall" },
  { value: "none", label: "settings.cornersNone" },
];

const densityOptions: { value: Density; label: string }[] = [
  { value: "comfortable", label: "settings.comfortable" },
  { value: "compact", label: "settings.compact" },
];

const layoutOptions: { value: LayoutMode; label: string }[] = [
  { value: "classic", label: "settings.classic" },
  { value: "separated", label: "settings.separated" },
];

const localeOptions = LOCALES.map((entry) => ({ value: entry.value, label: entry.label }));

const qualityOptions = [
  { value: "auto", label: "settings.qualityAuto" },
  { value: "85", label: "85" },
  { value: "90", label: "90" },
  { value: "95", label: "95" },
];
</script>

<template>
  <AppModal :title="$t('settings.title')" wide @close="ui.settingsOpen = false">
    <div class="pb-2">
      <div class="pb-1 pt-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {{ $t("settings.appearance") }}
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.theme") }}</span>
        <SegmentedControl
          :model-value="ui.prefs.themeMode"
          :label="$t('settings.theme')"
          :options="themeOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="ui.setPrefs({ themeMode: $event as ThemeMode })"
        />
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.palette") }}</span>
        <SegmentedControl
          :model-value="ui.prefs.palette"
          :label="$t('settings.palette')"
          :options="paletteOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="ui.setPrefs({ palette: $event as Palette })"
        />
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.corners") }}</span>
        <SegmentedControl
          :model-value="ui.prefs.corners"
          :label="$t('settings.corners')"
          :options="cornerOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="ui.setPrefs({ corners: $event as CornerStyle })"
        />
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.density") }}</span>
        <SegmentedControl
          :model-value="ui.prefs.density"
          :label="$t('settings.density')"
          :options="densityOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="ui.setPrefs({ density: $event as Density })"
        />
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.layout") }}</span>
        <SegmentedControl
          :model-value="ui.prefs.layout"
          :label="$t('settings.layout')"
          :options="layoutOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="ui.setPrefs({ layout: $event as LayoutMode })"
        />
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.language") }}</span>
        <SegmentedControl
          :model-value="locale"
          :label="$t('settings.language')"
          :options="localeOptions"
          @update:model-value="locale = $event as Locale"
        />
      </div>

      <div class="mt-2 border-t border-border pb-1 pt-3 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {{ $t("settings.compression") }}
      </div>

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.quality") }}</span>
        <SegmentedControl
          :model-value="quality"
          :label="$t('settings.quality')"
          :options="qualityOptions.map((option) => ({ value: option.value, label: $t(option.label) }))"
          @update:model-value="quality = $event"
        />
      </div>
      <p class="pb-1 text-[11px] leading-relaxed text-muted-foreground">{{ $t("settings.qualityHint") }}</p>

      <SwitchToggle
        :model-value="ui.prefs.thorough"
        :label="$t('settings.thorough')"
        :hint="$t('settings.thoroughHint')"
        @update:model-value="ui.setPrefs({ thorough: $event })"
      />

      <div class="flex items-center justify-between gap-3 py-1.5">
        <span class="text-[12.5px]">{{ $t("settings.parallelism") }}</span>
        <select
          class="h-7 rounded-[6px] border border-border bg-card px-1.5 text-[12px]"
          :value="ui.prefs.parallelism"
          :disabled="queue.mode === 'threaded'"
          @change="ui.setPrefs({ parallelism: Number(($event.target as HTMLSelectElement).value) })"
        >
          <option v-for="value in [0, 1, 2, 3, 4, 6, 8]" :key="value" :value="value">
            {{ value === 0 ? $t("settings.auto") : value }}
          </option>
        </select>
      </div>

      <div class="mt-2 border-t border-border pb-1 pt-3 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {{ $t("settings.about") }}
      </div>
      <p class="text-[11.5px] leading-relaxed text-muted-foreground">{{ $t("settings.aboutBody") }}</p>
      <div class="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{{ $t("settings.version") }} 0.1.0</span>
        <span>·</span>
        <span>{{ $t("settings.license") }}</span>
        <a
          class="inline-flex items-center gap-1 text-foreground underline decoration-border underline-offset-2 hover:decoration-current"
          href="https://github.com/heydeer/pngdeer"
          target="_blank"
          rel="noreferrer"
        >
          {{ $t("settings.source") }}
        </a>
      </div>
    </div>
  </AppModal>
</template>
