<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AppToolbar from "@/components/layout/AppToolbar.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import QueueBar from "@/components/layout/QueueBar.vue";
import JobTable from "@/components/layout/JobTable.vue";
import CompressDock from "@/components/layout/CompressDock.vue";
import EmptyDrop from "@/components/layout/EmptyDrop.vue";
import InspectPanel from "@/components/layout/InspectPanel.vue";
import StatusBar from "@/components/layout/StatusBar.vue";
import SettingsDialog from "@/components/dialogs/SettingsDialog.vue";
import ToastHost from "@/components/ui/ToastHost.vue";
import { useResizeHandle } from "@/composables/useResizeHandle";
import { useQueueStore } from "@/stores/queue";
import { useUiStore } from "@/stores/ui";

const ui = useUiStore();
const queue = useQueueStore();

const sidebarWidth = ref(ui.prefs.sidebarWidth);
const inspectWidth = ref(ui.prefs.inspectWidth);
const dockHeight = ref(ui.prefs.dockHeight);

watch(
  () => ui.prefs.sidebarWidth,
  (value) => (sidebarWidth.value = value),
);
watch(
  () => ui.prefs.inspectWidth,
  (value) => (inspectWidth.value = value),
);
watch(
  () => ui.prefs.dockHeight,
  (value) => (dockHeight.value = value),
);

const hasJobs = computed(() => queue.totals.count > 0);
const showDock = computed(() => hasJobs.value && ui.prefs.dockOpen);
const showInspect = computed(() => hasJobs.value && ui.prefs.inspectOpen);

const sidebarResize = useResizeHandle({
  axis: "x",
  direction: 1,
  current: () => sidebarWidth.value,
  min: 220,
  max: () => Math.min(420, window.innerWidth * 0.4),
  onChange: (value) => (sidebarWidth.value = value),
  onCommit: (value) => ui.setPrefs({ sidebarWidth: value }),
});

const inspectResize = useResizeHandle({
  axis: "x",
  direction: -1,
  current: () => inspectWidth.value,
  min: 300,
  max: () => Math.min(720, window.innerWidth * 0.55),
  onChange: (value) => (inspectWidth.value = value),
  onCommit: (value) => ui.setPrefs({ inspectWidth: value }),
});

const dockResize = useResizeHandle({
  axis: "y",
  direction: -1,
  current: () => dockHeight.value,
  min: 110,
  max: () => Math.min(360, window.innerHeight * 0.5),
  onChange: (value) => (dockHeight.value = value),
  onCommit: (value) => ui.setPrefs({ dockHeight: value }),
});

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

function onKeydown(event: KeyboardEvent): void {
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === "a" && !isTypingTarget(event.target)) {
    event.preventDefault();
    queue.selectAll();
    return;
  }
  if (mod && event.key === ",") {
    event.preventDefault();
    ui.settingsOpen = true;
    return;
  }
  if (mod && event.key.toLowerCase() === "o") {
    event.preventDefault();
    document.querySelector<HTMLInputElement>('[data-testid="file-input"]')?.click();
    return;
  }
  if (isTypingTarget(event.target)) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      queue.move(1);
      break;
    case "ArrowUp":
      event.preventDefault();
      queue.move(-1);
      break;
    case "Enter": {
      const current = queue.activeJob;
      if (!current) break;
      event.preventDefault();
      ui.setPrefs({ inspectOpen: true, inspectTab: "compare" });
      break;
    }
    case "Backspace":
    case "Delete": {
      if (!queue.selection.length) break;
      event.preventDefault();
      queue.remove([...queue.selection]);
      break;
    }
    case "Escape":
      queue.clearSelection();
      ui.settingsOpen = false;
      break;
    default:
      break;
  }
}

let dragDepth = 0;

function onDragEnter(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes("Files")) return;
  dragDepth += 1;
  ui.dragOver = true;
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) ui.dragOver = false;
}

function onDragOver(event: DragEvent): void {
  if (event.dataTransfer?.types.includes("Files")) event.preventDefault();
}

function onDrop(event: DragEvent): void {
  event.preventDefault();
  dragDepth = 0;
  ui.dragOver = false;
  if (event.dataTransfer?.files.length) void queue.addFiles(event.dataTransfer.files);
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("dragenter", onDragEnter);
  window.addEventListener("dragleave", onDragLeave);
  window.addEventListener("dragover", onDragOver);
  window.addEventListener("drop", onDrop);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("dragenter", onDragEnter);
  window.removeEventListener("dragleave", onDragLeave);
  window.removeEventListener("dragover", onDragOver);
  window.removeEventListener("drop", onDrop);
  queue.dispose();
  ui.stopSystemWatch();
});
</script>

<template>
  <div class="app-root">
    <AppToolbar />

    <div class="app-body" :data-layout="ui.prefs.layout">
      <div class="app-sidebar app-pane relative" :style="{ width: `${sidebarWidth}px` }">
        <AppSidebar />
        <div class="resize-handle resize-handle--right" @pointerdown="sidebarResize.onPointerDown" />
      </div>

      <main class="app-workspace app-pane">
        <EmptyDrop v-if="!hasJobs" />
        <template v-else>
          <QueueBar />
          <JobTable />
          <div v-if="showDock" class="relative shrink-0">
            <div class="resize-handle resize-handle--row resize-handle--row-top" @pointerdown="dockResize.onPointerDown" />
            <CompressDock />
          </div>
        </template>
      </main>

      <aside v-if="showInspect" class="app-details app-pane relative" :style="{ width: `${inspectWidth}px` }">
        <div class="resize-handle resize-handle--left" @pointerdown="inspectResize.onPointerDown" />
        <InspectPanel />
      </aside>
    </div>

    <StatusBar />
    <ToastHost />
    <SettingsDialog v-if="ui.settingsOpen" @close="ui.settingsOpen = false" />

    <div v-if="ui.dragOver" class="drag-overlay">{{ $t("queue.release") }}</div>
  </div>
</template>
