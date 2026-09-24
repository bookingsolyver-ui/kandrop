/**
 * Plain module (no "use client") on purpose: the server page calls `isSettingsTab`, and a
 * function exported from a client module cannot be called from server code.
 */
export const SETTINGS_TABS = ["profile", "store", "bank"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const isSettingsTab = (value: unknown): value is SettingsTab =>
  (SETTINGS_TABS as readonly unknown[]).includes(value);
