"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ListMessage, primaryButton } from "@/components/data/ListStates";
import { useRouter } from "@/i18n/navigation";
import type { ApiErrorCode } from "@/server/http/errors";
import type { PublicAutomations } from "@/server/modules/automations/schema";
import type { FlowKey } from "@/shared/automations/schemas";
import { connectWhatsApp, disconnectWhatsApp, getAutomations, updateFlow } from "./automationsApi";
import { ConnectionCard } from "./ConnectionCard";
import { FlowEditor } from "./FlowEditor";
import { FlowList } from "./FlowList";

/** How often to look again while the (simulated) phone has not scanned the code yet. */
const PAIRING_POLL_MS = 2000;

export function AutomationsView({
  storeName,
  canManage,
}: {
  storeName: string;
  canManage: boolean;
}) {
  const t = useTranslations("Automations");
  const errors = useTranslations("Errors");
  const router = useRouter();
  const [data, setData] = useState<PublicAutomations | null>(null);
  const [loadError, setLoadError] = useState<ApiErrorCode | null>(null);
  const [actionError, setActionError] = useState<ApiErrorCode | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<FlowKey>>(new Set());
  const [editing, setEditing] = useState<FlowKey | null>(null);

  // One counter drives every refetch: the retry button and the pairing poll both bump it.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAutomations(controller.signal)
      .then((result) => {
        if (result.ok) {
          setData(result.data);
          setLoadError(null);
        } else {
          setLoadError(result.code);
        }
      })
      .catch(() => {
        /* aborted: a newer request replaced it */
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    if (loadError === "unauthenticated") router.replace("/login");
  }, [loadError, router]);

  const pairing = data?.connection.status === "pending";
  useEffect(() => {
    if (!pairing) return;
    const timer = setTimeout(() => setReload((n) => n + 1), PAIRING_POLL_MS);
    return () => clearTimeout(timer);
  }, [pairing, data]);

  async function onConnect(phone: string): Promise<ApiErrorCode | null> {
    setActionError(null);
    const result = await connectWhatsApp(phone);
    if (!result.ok) return result.code;
    setData(result.data);
    return null;
  }

  async function onDisconnect() {
    setActionError(null);
    const result = await disconnectWhatsApp();
    if (result.ok) setData(result.data);
    else setActionError(result.code);
  }

  async function onToggle(key: FlowKey, next: boolean) {
    if (!data) return;
    setActionError(null);
    setBusy((s) => new Set(s).add(key));
    // Optimistic: the switch moves at once and goes back if the server says no.
    const previous = data;
    setData({
      ...data,
      flows: data.flows.map((f) => (f.key === key ? { ...f, enabled: next } : f)),
    });
    const result = await updateFlow(key, { enabled: next });
    setBusy((s) => {
      const copy = new Set(s);
      copy.delete(key);
      return copy;
    });
    if (result.ok) {
      setData((d) => d && { ...d, flows: d.flows.map((f) => (f.key === key ? result.data : f)) });
    } else {
      setData(previous);
      setActionError(result.code);
    }
  }

  if (!data) {
    return loadError ? (
      <ListMessage
        title={t("loadError.title")}
        body={errors(loadError)}
        action={
          <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
            {t("loadError.retry")}
          </button>
        }
      />
    ) : (
      <div aria-hidden className="space-y-6">
        <div className="pulse h-56 rounded-lg border border-line bg-surface" />
        <div className="pulse h-72 rounded-lg border border-line bg-surface" />
      </div>
    );
  }

  const editingFlow = data.flows.find((f) => f.key === editing);

  return (
    <div className="space-y-6">
      {actionError && (
        <p role="alert" className="rounded-md border border-down px-4 py-3 text-sm text-down">
          {errors(actionError)}
        </p>
      )}

      <ConnectionCard
        connection={data.connection}
        canManage={canManage}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />

      <FlowList
        flows={data.flows}
        connected={data.connection.status === "connected"}
        canManage={canManage}
        busy={busy}
        onToggle={onToggle}
        onOpen={setEditing}
      />

      <p className="text-[13px] leading-relaxed text-ink-muted">{t("sandbox")}</p>

      {editingFlow && (
        <FlowEditor
          key={editingFlow.key}
          flow={editingFlow}
          storeName={storeName}
          canManage={canManage}
          onClose={() => setEditing(null)}
          onSaved={(flow) =>
            setData(
              (d) => d && { ...d, flows: d.flows.map((f) => (f.key === flow.key ? flow : f)) }
            )
          }
        />
      )}
    </div>
  );
}
