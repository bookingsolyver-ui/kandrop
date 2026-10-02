"use client";

import { createContext, useContext, ReactNode } from "react";

type LaunchMode = "waitlist" | "launched";

interface LaunchModeContextType {
  mode: LaunchMode;
}

const LaunchModeContext = createContext<LaunchModeContextType>({ mode: "waitlist" });

export function LaunchModeProvider({ children, initialMode }: { children: ReactNode; initialMode: LaunchMode }) {
  return (
    <LaunchModeContext.Provider value={{ mode: initialMode }}>
      {children}
    </LaunchModeContext.Provider>
  );
}

export function useLaunchMode(): LaunchMode {
  return useContext(LaunchModeContext).mode;
}