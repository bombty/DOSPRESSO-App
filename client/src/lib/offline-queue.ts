const QUEUE_KEY = "dospresso_offline_queue";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  description: string;
  status: "pending" | "processing" | "failed";
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getQueueItems(): QueuedMutation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

function saveQueue(items: QueuedMutation[]): boolean {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    return true;
  } catch {
    console.warn("Offline queue save failed — localStorage may be full");
    return false;
  }
}

export function addToQueue(mutation: Omit<QueuedMutation, "id" | "timestamp" | "retryCount" | "status" | "maxRetries"> & { maxRetries?: number }): string | null {
  const items = getQueueItems();
  const id = generateId();
  items.push({
    ...mutation,
    id,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: mutation.maxRetries ?? 5,
    status: "pending",
  });
  const saved = saveQueue(items);
  if (!saved) return null;
  window.dispatchEvent(new CustomEvent("offline-queue-change"));
  return id;
}

export function removeFromQueue(id: string): void {
  const items = getQueueItems().filter((i) => i.id !== id);
  saveQueue(items);
  window.dispatchEvent(new CustomEvent("offline-queue-change"));
}

export function getQueueSize(): number {
  return getQueueItems().length;
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new CustomEvent("offline-queue-change"));
}

export function cleanExpiredItems(): number {
  const items = getQueueItems();
  const now = Date.now();
  const fresh = items.filter((i) => now - i.timestamp < MAX_AGE_MS);
  const removed = items.length - fresh.length;
  if (removed > 0) {
    saveQueue(fresh);
    window.dispatchEvent(new CustomEvent("offline-queue-change"));
  }
  return removed;
}

function recoverStuckItems(): void {
  const items = getQueueItems();
  let changed = false;
  for (const item of items) {
    if (item.status === "processing") {
      item.status = "pending";
      changed = true;
    }
  }
  if (changed) {
    saveQueue(items);
  }
}

export interface ProcessResult {
  total: number;
  succeeded: number;
  failed: number;
}

let isProcessingGlobal = false;

export async function processQueue(
  onProgress?: (current: number, total: number) => void
): Promise<ProcessResult> {
  if (isProcessingGlobal) return { total: 0, succeeded: 0, failed: 0 };
  isProcessingGlobal = true;
  try {
    recoverStuckItems();
    return await _processQueueInternal(onProgress);
  } finally {
    isProcessingGlobal = false;
  }
}

async function _processQueueInternal(
  onProgress?: (current: number, total: number) => void
): Promise<ProcessResult> {
  const items = getQueueItems().filter((i) => i.status === "pending" || i.status === "failed");
  if (items.length === 0) return { total: 0, succeeded: 0, failed: 0 };

  let succeeded = 0;
  let failed = 0;
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i + 1, total);

    const allItems = getQueueItems();
    const idx = allItems.findIndex((q) => q.id === item.id);
    if (idx < 0) continue;
    allItems[idx].status = "processing";
    saveQueue(allItems);

    try {
      const headers: HeadersInit = item.body != null
        ? { "Content-Type": "application/json" }
        : {};

      const res = await fetch(item.url, {
        method: item.method,
        headers,
        body: item.body != null ? JSON.stringify(item.body) : undefined,
        credentials: "include",
      });

      if (res.ok) {
        removeFromQueue(item.id);
        succeeded++;
      } else if (res.status >= 400 && res.status < 500) {
        removeFromQueue(item.id);
        failed++;
      } else {
        const allItems2 = getQueueItems();
        const idx2 = allItems2.findIndex((q) => q.id === item.id);
        if (idx2 >= 0) {
          allItems2[idx2].retryCount++;
          if (allItems2[idx2].retryCount >= allItems2[idx2].maxRetries) {
            allItems2.splice(idx2, 1);
          } else {
            allItems2[idx2].status = "failed";
          }
          saveQueue(allItems2);
        }
        failed++;
      }
    } catch {
      const allItems3 = getQueueItems();
      const idx3 = allItems3.findIndex((q) => q.id === item.id);
      if (idx3 >= 0) {
        allItems3[idx3].retryCount++;
        if (allItems3[idx3].retryCount >= allItems3[idx3].maxRetries) {
          allItems3.splice(idx3, 1);
        } else {
          allItems3[idx3].status = "pending";
        }
        saveQueue(allItems3);
      }
      failed++;
    }
  }

  window.dispatchEvent(new CustomEvent("offline-queue-change"));
  return { total, succeeded, failed };
}
