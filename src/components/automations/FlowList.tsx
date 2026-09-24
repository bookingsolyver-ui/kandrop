"use client";

import { useTranslations } from "next-intl";
import { Switch } from "@/components/form/Switch";
import { CartIcon, LogisticsIcon, OrdersIcon } from "@/components/shell/icons";
import type { PublicFlow } from "@/server/modules/automations/schema";
import type { FlowKey } from "@/shared/automations/schemas";

const ICON = {
  abandonedCart: CartIcon,
  paymentConfirmation: OrdersIcon,
  shippingUpdate: LogisticsIcon,
} as const;

export const NEEDS_CONNECTION_ID = "flows-need-connection";

/**
 * The three flows. Clicking a flow opens its message; the switch turns it on or off. Switches
 * stay disabled (and say why) until WhatsApp is connected: nothing can be sent without it.
 */
export function FlowList({
  flows,
  connected,
  canManage,
  busy,
  onToggle,
  onOpen,
}: {
  flows: PublicFlow[];
  connected: boolean;
  canManage: boolean;
  busy: ReadonlySet<FlowKey>;
  onToggle: (key: FlowKey, next: boolean) => void;
  onOpen: (key: FlowKey) => void;
}) {
  const t = useTranslations("Automations.flows");
  const locked = !connected || !canManage;

  return (
    <section aria-labelledby="flows-title" className="rounded-lg border border-line bg-surface">
      <header className="border-b border-line px-5 py-5 sm:px-7">
        <h2
          id="flows-title"
          className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
        >
          {t("title")}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        {!connected && (
          <p id={NEEDS_CONNECTION_ID} className="mt-3 text-sm text-series-2">
            {t("needConnection")}
          </p>
        )}
      </header>

      <ul className="divide-y divide-line">
        {flows.map((flow) => {
          const Icon = ICON[flow.key];
          const title = t(`items.${flow.key}.title`);
          return (
            <li key={flow.key} className="flex items-stretch">
              <button
                type="button"
                onClick={() => onOpen(flow.key)}
                className="flex min-w-0 flex-1 items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-ink/[0.03] sm:px-7"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-page text-ink-2">
                  <Icon size={22} />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{title}</span>
                  <span className="mt-0.5 block text-sm text-ink-2">
                    {t(`items.${flow.key}.description`)}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
                    <span className="rounded-full border border-line px-2.5 py-0.5">
                      {t(`items.${flow.key}.trigger`)}
                    </span>
                    <span className="underline underline-offset-4">{t("edit")}</span>
                    {!flow.isDefault && (
                      <span className="rounded-full border border-line px-2.5 py-0.5">
                        {t("customised")}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2 pr-4 sm:pr-6">
                <span
                  aria-hidden
                  className={`hidden w-16 text-right text-[13px] sm:block ${flow.enabled ? "text-accent" : "text-ink-muted"}`}
                >
                  {flow.enabled ? t("on") : t("off")}
                </span>
                <Switch
                  checked={flow.enabled}
                  onChange={(next) => onToggle(flow.key, next)}
                  label={t("toggle", { flow: title })}
                  disabled={locked && !flow.enabled}
                  busy={busy.has(flow.key)}
                  describedBy={connected ? undefined : NEEDS_CONNECTION_ID}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
