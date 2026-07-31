"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";

type WeightUnit = "kg" | "lb";

interface UnitContextValue {
  unit: WeightUnit;
  toggleUnit: () => void;
}

const UnitContext = createContext<UnitContextValue>({
  unit: "kg",
  toggleUnit: () => {},
});

const STORAGE_KEY = "hevy-insights-unit";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): WeightUnit {
  return window.localStorage.getItem(STORAGE_KEY) === "lb" ? "lb" : "kg";
}

function getServerSnapshot(): WeightUnit {
  return "kg";
}

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const unit = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleUnit = useCallback(() => {
    const next: WeightUnit = unit === "kg" ? "lb" : "kg";
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event("storage"));
  }, [unit]);

  return (
    <UnitContext.Provider value={{ unit, toggleUnit }}>{children}</UnitContext.Provider>
  );
}

export function useUnit() {
  return useContext(UnitContext);
}
