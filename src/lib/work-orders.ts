import type { WorkOrder, WorkOrderFormValues } from "@/types/work-order";

export const WORK_ORDERS_STORAGE_KEY = "fieldops-work-orders-v1";

/** Sample seed data — only applied when localStorage has no saved records. */
export function getSampleWorkOrders(): WorkOrder[] {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 10).toISOString();

  return [
    {
      jobId: "WO-2847",
      title: "Replace bearing assembly — Line 3 conveyor",
      asset: "CV-103 Belt Conveyor",
      site: "Plant North · Line 3",
      description: "Bearing noise detected during night shift; replace assembly and verify alignment.",
      priority: "High",
      assignedTechnician: "Jordan Lee",
      status: "In Progress",
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2).toISOString(),
      completedAt: null,
    },
    {
      jobId: "WO-2841",
      title: "Calibrate pressure sensors — Boiler Room B",
      asset: "BL-22 Steam Boiler",
      site: "Plant North · Boiler B",
      description: "Annual calibration per safety checklist.",
      priority: "Medium",
      assignedTechnician: "Sam Rivera",
      status: "Open",
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4).toISOString(),
      completedAt: null,
    },
    {
      jobId: "WO-2835",
      title: "Hydraulic fluid leak inspection",
      asset: "PR-07 Hydraulic Press",
      site: "Plant North · Fab Bay",
      description: "Inspect hoses and fittings; top up fluid if within spec.",
      priority: "High",
      assignedTechnician: "Alex Chen",
      status: "Open",
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5).toISOString(),
      completedAt: null,
    },
    {
      jobId: "WO-2829",
      title: "Scheduled VFD firmware update",
      asset: "FN-12 Feed Pump Motor",
      site: "Plant North · Utilities",
      description: "Apply vendor firmware v3.2 during planned downtime window.",
      priority: "Low",
      assignedTechnician: "Morgan Patel",
      status: "Open",
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString(),
      completedAt: null,
    },
    {
      jobId: "WO-2818",
      title: "Annual safety interlock test",
      asset: "CR-05 Overhead Crane",
      site: "Plant North · Shipping",
      description: "Full interlock and limit switch verification.",
      priority: "Medium",
      assignedTechnician: "Jordan Lee",
      status: "Completed",
      createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 12).toISOString(),
      completedAt: thisMonth,
    },
    {
      jobId: "WO-2790",
      title: "Replace worn conveyor belt section",
      asset: "CV-88 Sort Line",
      site: "Plant South · Outbound",
      description: "Completed last month; retained for history.",
      priority: "Medium",
      assignedTechnician: "Sam Rivera",
      status: "Completed",
      createdAt: lastMonth,
      completedAt: lastMonth,
    },
  ];
}

export function loadWorkOrdersFromStorage(): WorkOrder[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORK_ORDERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkOrder[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveWorkOrdersToStorage(orders: WorkOrder[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORK_ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // Quota or privacy mode — ignore persist failure
  }
}

export function generateWorkOrderId(existing: WorkOrder[]): string {
  let max = 2800;
  for (const order of existing) {
    const match = /^WO-(\d+)$/.exec(order.jobId);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > max) max = num;
    }
  }
  const next = max + 1;
  return `WO-${next}`;
}

export function createWorkOrderFromForm(
  values: WorkOrderFormValues,
  existing: WorkOrder[],
): WorkOrder {
  const now = new Date().toISOString();
  const completedAt = values.status === "Completed" ? now : null;
  return {
    jobId: generateWorkOrderId(existing),
    title: values.title.trim(),
    asset: values.asset.trim(),
    site: values.site.trim(),
    description: values.description.trim(),
    priority: values.priority,
    assignedTechnician: values.assignedTechnician.trim(),
    status: values.status,
    createdAt: now,
    completedAt,
  };
}

export function isCompletedThisMonth(order: WorkOrder, referenceDate: Date = new Date()): boolean {
  if (order.status !== "Completed" || !order.completedAt) return false;
  const completed = new Date(order.completedAt);
  if (Number.isNaN(completed.getTime())) return false;
  return (
    completed.getFullYear() === referenceDate.getFullYear() &&
    completed.getMonth() === referenceDate.getMonth()
  );
}

export function countOpenJobs(orders: WorkOrder[]): number {
  return orders.filter((o) => o.status === "Open" || o.status === "In Progress").length;
}

export function applyStatusChange(order: WorkOrder, status: WorkOrder["status"]): WorkOrder {
  if (status === "Completed") {
    return {
      ...order,
      status,
      completedAt: order.completedAt ?? new Date().toISOString(),
    };
  }
  return {
    ...order,
    status,
    completedAt: null,
  };
}

export function matchesSearch(order: WorkOrder, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    order.jobId,
    order.title,
    order.asset,
    order.site,
    order.description,
    order.assignedTechnician,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
