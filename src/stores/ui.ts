import { defineStore } from "pinia";
import { ref, watch } from "vue";
import type { Preferences } from "@/types";
import { applyAppearance, loadPreferences, sanitizePreferences, savePreferences, watchSystemTheme } from "@/lib/prefs";

export type ToastKind = "info" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

export const useUiStore = defineStore("ui", () => {
  const prefs = ref<Preferences>(loadPreferences());
  applyAppearance(prefs.value);
  const toasts = ref<Toast[]>([]);
  const settingsOpen = ref(false);
  /** Set while files are dragged over the window. */
  const dragOver = ref(false);
  let toastSequence = 0;

  function setPrefs(patch: Partial<Preferences>): void {
    prefs.value = sanitizePreferences({ ...prefs.value, ...patch });
    savePreferences(prefs.value);
  }

  function toast(message: string, kind: ToastKind = "info", timeout = 3600): void {
    const id = ++toastSequence;
    toasts.value.push({ id, message, kind });
    if (timeout > 0) window.setTimeout(() => dismissToast(id), timeout);
  }

  function dismissToast(id: number): void {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }

  const stopSystemWatch = watchSystemTheme(() => {
    if (prefs.value.themeMode === "system") applyAppearance(prefs.value);
  });

  watch(
    () => prefs.value,
    () => applyAppearance(prefs.value),
    { deep: true },
  );

  return {
    prefs,
    toasts,
    settingsOpen,
    dragOver,
    setPrefs,
    toast,
    dismissToast,
    stopSystemWatch,
  };
});
