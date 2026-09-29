import { useSyncExternalStore } from "react";

export const APP_TAB_PATHS = {
  simulation: "/simulation",
  randomwalksim: "/random-walk",
  quantumwalk: "/quantum-walk",
  "quantumwalk-refactored": "/quantum-walk-framework",
  analysis: "/analysis",
  labdemo: "/lab-demo",
  simplicialgrowth: "/simplicial-growth",
  spheroidwalk: "/spheroid-walk",
  memorybank: "/memory-bank",
} as const;

export type AppTab = keyof typeof APP_TAB_PATHS;

const PATH_TABS = Object.fromEntries(
  Object.entries(APP_TAB_PATHS).map(([tab, path]) => [path, tab]),
) as Record<string, AppTab>;

const URL_CHANGE_EVENT = "app:urlchange";

function getLocationSnapshot(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function subscribeToLocation(callback: () => void): () => void {
  window.addEventListener("popstate", callback);
  window.addEventListener(URL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(URL_CHANGE_EVENT, callback);
  };
}

export function useUrlLocation(): string {
  return useSyncExternalStore(subscribeToLocation, getLocationSnapshot, () => "/");
}

export function navigateToUrl(target: string | URL, replace = false): void {
  const url = new URL(target.toString(), window.location.href);
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next === getLocationSnapshot()) return;

  if (replace) window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
  window.dispatchEvent(new Event(URL_CHANGE_EVENT));
}

export function getAppTabForLocation(location: string | URL): AppTab | null {
  const url = new URL(location.toString(), window.location.origin);
  if (url.pathname === "/") {
    // Old Random Walk share links used the site root with a ?data= payload.
    return url.searchParams.has("data") ? "randomwalksim" : "simulation";
  }

  const normalizedPath = url.pathname.replace(/\/$/, "");
  const exactTab = PATH_TABS[normalizedPath];
  if (exactTab) return exactTab;
  if (normalizedPath.startsWith(`${APP_TAB_PATHS.simplicialgrowth}/`)) return "simplicialgrowth";
  return null;
}

export function navigateToAppTab(tab: AppTab, replace = false): void {
  const currentUrl = new URL(window.location.href);
  const nextUrl = new URL(APP_TAB_PATHS[tab], currentUrl.origin);
  const legacyRunData = currentUrl.searchParams.get("data");
  if (legacyRunData) nextUrl.searchParams.set("data", legacyRunData);
  navigateToUrl(nextUrl, replace);
}

export function setUrlSearchParam(key: string, value: string | null, replace = false): void {
  setUrlSearchParams({ [key]: value }, replace);
}

export function setUrlSearchParams(values: Record<string, string | null>, replace = false): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === "") url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  navigateToUrl(url, replace);
}

export function setUrlPath(pathname: string, replace = false): void {
  const url = new URL(window.location.href);
  url.pathname = pathname;
  navigateToUrl(url, replace);
}

export function setUrlHash(hash: string, replace = false): void {
  const url = new URL(window.location.href);
  url.hash = hash ? `#${hash.replace(/^#/, "")}` : "";
  navigateToUrl(url, replace);
}
