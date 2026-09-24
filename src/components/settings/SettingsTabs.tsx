"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Tabs, panelId, tabId } from "@/components/data/Tabs";
import { SETTINGS_TABS, type SettingsTab } from "./tabs";

const PREFIX = "settings";

/**
 * The three sections of the settings, as tabs. Panels are rendered once and only hidden, so
 * something half-typed in the bank form is still there after a look at another tab. The current
 * tab is kept in the URL (`?tab=bank`) without a navigation, so it can be linked and reloaded.
 */
export function SettingsTabs({
  initial,
  panels,
}: {
  initial: SettingsTab;
  panels: Record<SettingsTab, ReactNode>;
}) {
  const t = useTranslations("Settings.tabs");
  const [tab, setTab] = useState(initial);

  function select(next: SettingsTab) {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  return (
    <div>
      <Tabs
        idPrefix={PREFIX}
        label={t("label")}
        value={tab}
        onChange={select}
        tabs={SETTINGS_TABS.map((id) => ({ id, label: t(id) }))}
      />
      {SETTINGS_TABS.map((id) => (
        <div
          key={id}
          id={panelId(PREFIX, id)}
          role="tabpanel"
          aria-labelledby={tabId(PREFIX, id)}
          hidden={id !== tab}
          className="pt-6"
        >
          {panels[id]}
        </div>
      ))}
    </div>
  );
}
