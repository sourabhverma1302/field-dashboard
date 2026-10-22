
import type { WorkOrder } from "@/types/work-order";
import {
  getSampleWorkOrders,
  loadWorkOrdersFromStorage,
  saveWorkOrdersToStorage,
} from "@/lib/work-orders";

const workOrdersServerSnapshot: WorkOrder[] = [];

let cache: WorkOrder[] | null = null;
let initialized = false;
let loading = false;
let writeQueue = Promise.resolve();

const listeners = new Set<() => void>();
const readyListeners = new Set<() => void>();
let clientReady = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function notifyReady() {
  clientReady = true;
  readyListeners.forEach((listener) => listener());
}

function readOrders(): WorkOrder[] {
  if (cache === null) {
    cache = loadWorkOrdersFromStorage() ?? getSampleWorkOrders();
  }
  return cache;
}

export function subscribeWorkOrders(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkOrdersClientSnapshot(): WorkOrder[] {
  return readOrders();
}

export function getWorkOrdersServerSnapshot(): WorkOrder[] {
  return workOrdersServerSnapshot;
}

export function setWorkOrders(
  next: WorkOrder[] | ((prev: WorkOrder[]) => WorkOrder[]),
): void {
  const previous = readOrders();
  const updated = typeof next === "function" ? next(previous) : next;

  cache = updated;
  saveWorkOrdersToStorage(updated);
  notify();

  // Persist changes to the database in order.
  writeQueue = writeQueue.then(async () => {
    try {
      const current = cache ?? updated;

      // Reconcile the current client state with the API.
      const response = await fetch("/api/work-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: current }),
      });

      if (!response.ok) {
        console.error("Failed to sync work orders to the database.");
      }
    } catch (error) {
      console.error("Could not sync work orders:", error);
    }
  });
}

export function subscribeClientReady(
  listener: () => void,
): () => void {
  readyListeners.add(listener);
  return () => readyListeners.delete(listener);
}

export function getClientReadySnapshot(): boolean {
  return clientReady;
}

export function getClientReadyServerSnapshot(): boolean {
  return false;
}


export async function initializeWorkOrders(): Promise<void> {
  if (initialized || loading) return;
  loading = true;

  try {
    const response = await fetch("/api/work-orders");

    if (!response.ok) {
      throw new Error("Failed to load work orders from Neon.");
    }

    const databaseOrders = (await response.json()) as WorkOrder[];

    if (databaseOrders.length > 0) {
      cache = databaseOrders;
    } else {
      // Preserve existing browser data or use sample data for the demo.
      cache =
        loadWorkOrdersFromStorage() ?? getSampleWorkOrders();

      const saveResponse = await fetch("/api/work-orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: cache }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save initial work orders to Neon.");
      }

      cache = (await saveResponse.json()) as WorkOrder[];
    }

    saveWorkOrdersToStorage(cache);
    notify();
  } catch (error) {
    console.error("Work-order initialization failed:", error);
    cache ??= loadWorkOrdersFromStorage() ?? getSampleWorkOrders();
    notify();
  } finally {
    initialized = true;
    loading = false;
    notifyReady();
  }
}

