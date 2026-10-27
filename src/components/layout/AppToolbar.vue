<script setup lang="ts">
import { ref } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";

const queue = useQueueStore();
const ui = useUiStore();
const filesInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);

function pick(input: HTMLInputElement | null): void {
  input?.click();
}

async function onPicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) await queue.addFiles(input.files);
  input.value = "";
}

function downloadSelection(): void {
  const ready = queue.selectedJobs.filter((job) => job.status === "done");
  if (!ready.length) return;
  ready.forEach((job, index) => window.setTimeout(() => queue.download(job), index * 250));
}
</script>

<template>
  <header class="app-toolbar flex h-10 shrink-0 items-center gap-1 border-b px-2">
    <div class="flex select-none items-center gap-1.5 pl-1 pr-2">
      <svg width="17" height="17" viewBox="0 0 20 20" aria-hidden="true" class="text-foreground">
        <rect x="1.5" y="1.5" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="10.5" y="1.5" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
        <rect x="1.5" y="10.5" width="8" height="8" rx="2" fill="currentColor" opacity="0.45" />
        <rect x="10.5" y="10.5" width="8" height="8" rx="2" fill="currentColor" opacity="0.18" />
      </svg>
      <span class="text-[13px] font-semibold tracking-tight">{{ $t("app.name") }}</span>
      <span class="hidden text-[11px] text-muted-foreground lg:inline">{{ $t("app.tagline") }}</span>
    </div>

    <div class="mx-1 h-4 w-px bg-border" />

    <AppButton variant="primary" size="sm" icon="plus" :title="$t('toolbar.addFiles')" @click="pick(filesInput)">
      <span class="hidden sm:inline">{{ $t("toolbar.addFiles") }}</span>
    </AppButton>
    <AppButton size="sm" variant="ghost" icon="folder-plus" :title="$t('toolbar.addFolder')" @click="pick(folderInput)">
      <span class="hidden md:inline">{{ $t("toolbar.addFolder") }}</span>
    </AppButton>

    <div class="flex min-w-0 flex-1 justify-center px-3">
      <div class="flex h-7 w-full max-w-[380px] items-center gap-2 rounded-[6px] border border-border bg-card px-2 transition-colors focus-within:border-ring">
        <Icon name="search" :size="13" class="text-muted-foreground" />
        <input
          :value="queue.filter"
          class="h-full min-w-0 flex-1 border-0 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
          :placeholder="$t('toolbar.filterPlaceholder')"
          :title="$t('toolbar.filterTitle')"
          spellcheck="false"
          data-testid="filter-input"
          @input="queue.filter = ($event.target as HTMLInputElement).value"
        />
        <button v-if="queue.filter" class="rounded p-0.5 text-muted-foreground hover:bg-muted" :aria-label="$t('actions.close')" @click="queue.filter = ''">
          <Icon name="x" :size="12" />
        </button>
      </div>
    </div>

    <AppButton
      size="sm"
      variant="ghost"
      icon="download"
      :title="$t('toolbar.download')"
      :disabled="!queue.selectedJobs.some((job) => job.status === 'done')"
      @click="downloadSelection"
    >
      <span class="hidden md:inline">{{ $t("toolbar.download") }}</span>
    </AppButton>

    <button
      class="relative flex h-7 items-center gap-1 rounded-[6px] px-2 text-[12px] hover:bg-muted"
      :class="ui.prefs.dockOpen ? 'bg-accent text-foreground' : 'text-muted-foreground'"
      :title="$t('toolbar.dock')"
      @click="ui.setPrefs({ dockOpen: !ui.prefs.dockOpen })"
    >
      <Icon name="sliders" :size="14" />
      <span v-if="queue.totals.running" class="badge" data-tone="accent">{{ queue.totals.running }}</span>
    </button>

    <AppButton
      size="icon-sm"
      :variant="ui.prefs.inspectOpen ? 'secondary' : 'ghost'"
      icon="panel-right"
      :title="$t('toolbar.inspect')"
      @click="ui.setPrefs({ inspectOpen: !ui.prefs.inspectOpen })"
    />
    <AppButton size="icon-sm" variant="ghost" icon="settings" :title="$t('toolbar.settings')" data-testid="settings-button" @click="ui.settingsOpen = true" />

    <input ref="filesInput" type="file" accept="image/png,image/apng" multiple hidden data-testid="file-input" @change="onPicked" />
    <input ref="folderInput" type="file" multiple hidden webkitdirectory @change="onPicked" />
  </header>
</template>
