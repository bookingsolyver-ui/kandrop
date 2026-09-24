"use client";

import { useContext } from "react";
import { LiveContext, type LiveState } from "./LiveProvider";

export type { LiveStatus } from "./LiveProvider";

/** Real-time feed for the merchant area. Must be used under `LiveProvider` (the app shell). */
export function useDashboardLive(): LiveState {
  const live = useContext(LiveContext);
  if (!live) throw new Error("useDashboardLive must be used inside <LiveProvider>");
  return live;
}
