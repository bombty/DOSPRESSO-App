import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "chunk_reload_attempted";

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    error.name === "ChunkLoadError" ||
    msg.includes("loading chunk") ||
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("error loading dynamically imported module")
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
): React.LazyExoticComponent<T> {
  return lazy(() => retryImport(importFn, retries));
}

async function retryImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries: number,
): Promise<{ default: T }> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      if (!isChunkLoadError(error)) {
        throw error;
      }

      if (attempt < retries - 1) {
        await wait(Math.pow(2, attempt) * 500);
        continue;
      }

      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, "true");
        window.location.reload();
        return new Promise(() => {});
      }

      sessionStorage.removeItem(RELOAD_KEY);
      throw error;
    }
  }

  return await importFn();
}

if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    sessionStorage.removeItem(RELOAD_KEY);
  });
}
