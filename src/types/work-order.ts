export type WorkOrderPriority = "Low" | "Medium" | "High";

export type WorkOrderStatus = "Open" | "In Progress" | "Completed";

export type WorkOrder = {
  jobId: string;
  title: string;
  asset: string;
  site: string;
  description: string;
  priority: WorkOrderPriority;
  assignedTechnician: string;
  status: WorkOrderStatus;
  createdAt: string;
  completedAt: string | null;
};

export type WorkOrderFormValues = {
  title: string;
  asset: string;
  site: string;
  description: string;
  priority: WorkOrderPriority;
  assignedTechnician: string;
  status: WorkOrderStatus;
};

export type WorkOrderFormErrors = Partial<Record<keyof WorkOrderFormValues, string>>;
