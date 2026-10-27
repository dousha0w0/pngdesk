import { createI18n } from "vue-i18n";
import zhCN from "./locales/zh-CN";
import en from "./locales/en";
import type { Locale } from "@/types";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "zh-CN", label: "简体中文" },
  { value: "en", label: "English" },
];

const STORAGE_KEY = "pngdesk.locale";

function storedLocale(): Locale | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en") return saved;
  } catch {
    // storage unavailable
  }
  return null;
}

export const i18n = createI18n({
  legacy: false,
  locale: storedLocale() ?? ((navigator.language || "").toLowerCase().startsWith("zh") ? "zh-CN" : "en"),
  fallbackLocale: "en",
  messages: { "zh-CN": zhCN, en },
});

/**
 * Dynamic keys stay untyped on purpose: every key used here lives in both
 * locales. `count` selects the plural form when the message offers one.
 */
export function t(key: string, params?: Record<string, unknown>, count?: number): string {
  if (count !== undefined) return i18n.global.t(key, count, params ?? {});
  return params ? i18n.global.t(key, params) : i18n.global.t(key);
}

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore storage failures
  }
}

export function currentLocale(): Locale {
  return i18n.global.locale.value as Locale;
}
