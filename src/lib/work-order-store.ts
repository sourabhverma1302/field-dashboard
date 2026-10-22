import {
  getSampleWorkOrders,
  loadWorkOrdersFromStorage,
  saveWorkOrdersToStorage,
} from "@/lib/work-orders";
import type { WorkOrder } from "@/types/work-order";

/** Stable snapshot for SSR / pre-hydration — must not allocate a new array per call. */
const workOrdersServerSnapshot: WorkOrder[] = [];

let cache: WorkOrder[] | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function readOrders(): WorkOrder[] {
  if (cache === null) {
    const stored = loadWorkOrdersFromStorage();
    cache = stored ?? getSampleWorkOrders();
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

export function setWorkOrders(next: WorkOrder[] | ((prev: WorkOrder[]) => WorkOrder[])): void {
  const prev = readOrders();
  cache = typeof next === "function" ? next(prev) : next;
  saveWorkOrdersToStorage(cache);
  notify();
}

export function subscribeClientReady(onStoreChange: () => void): () => void {
  void onStoreChange;
  return () => {};
}

export function getClientReadySnapshot(): boolean {
  return true;
}

export function getClientReadyServerSnapshot(): boolean {
  return false;
}
