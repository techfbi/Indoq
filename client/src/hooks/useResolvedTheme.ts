"use client";

import { useSyncExternalStore } from "react";
import { useUIStore } from "@/store/ui.store";

/*
  Resolves the theme the user actually sees, light or dark.
  The UI store holds the preference ("system", "light", "dark").
  When it is "system" the OS setting decides, so we subscribe to
  the color scheme media query and update when it changes.
  This mirrors the selectors in globals.css exactly.
*/
const DARK_QUERY = "(prefers-color-scheme: dark)";

const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getSnapshot = () => window.matchMedia(DARK_QUERY).matches;

// Server render has no media query, assume light until hydration
const getServerSnapshot = () => false;

export const useResolvedTheme = (): "light" | "dark" => {
  const preference = useUIStore((s) => s.theme);
  const systemPrefersDark = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
};
