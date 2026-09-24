"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** TLS is a property of how the page is served, so only claim it when it is true. */
export const useIsHttps = () =>
  useSyncExternalStore(
    subscribe,
    () => window.location.protocol === "https:",
    () => false
  );
