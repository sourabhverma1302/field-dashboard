"use client";

import { useCallback, useMemo, useState, useSyncExternalStore,useEffect } from "react";
import { CreateWorkOrderModal } from "@/components/create-work-order-modal";
import {
  applyStatusChange,
  countOpenJobs,
  createWorkOrderFromForm,
  isCompletedThisMonth,
  matchesSearch,
} from "@/lib/work-orders";
import {
  getClientReadyServerSnapshot,
  getClientReadySnapshot,
  getWorkOrdersClientSnapshot,
  getWorkOrdersServerSnapshot,
  setWorkOrders,
  initializeWorkOrders,
  subscribeClientReady,
  subscribeWorkOrders,
} from "@/lib/work-order-store";
import type {
  WorkOrderFormErrors,
  WorkOrderFormValues,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/types/work-order";

import {Plus,Package} from "lucide-react"

const navItems = [
  { label: "Overview", href: "#", active: true, icon: "grid" },
  { label: "Work Orders", href: "#", active: false, icon: "clipboard" },
  { label: "Assets", href: "#", active: false, icon: "box" },
  { label: "Work Reports", href: "#", active: false, icon: "clipboard" },
] as const;


const equipmentAttention = [
  { name: "Air Compressor AC-401", condition: "Critical", detail: "Vibration above threshold" },
  { name: "Cooling Tower CT-2", condition: "Warning", detail: "Fan motor temperature elevated" },
  { name: "Packaging Sealer PS-18", condition: "Warning", detail: "Seal bar wear detected" },
  { name: "Dust Collector DC-09", condition: "Monitor", detail: "Filter differential pressure rising" },
] as const;

const emptyFormValues: WorkOrderFormValues = {
  title: "",
  asset: "",
  site: "",
  description: "",
  priority: "Medium",
  assignedTechnician: "",
  status: "Open",
};

function validateWorkOrderForm(values: WorkOrderFormValues): WorkOrderFormErrors {
  const errors: WorkOrderFormErrors = {};
  if (!values.title.trim()) {
    errors.title = "Enter a work order title.";
  }
  if (!values.asset.trim()) {
    errors.asset = "Enter the asset name.";
  }
  if (!values.site.trim()) {
    errors.site = "Enter the site or location.";
  }
  if (!values.assignedTechnician.trim()) {
    errors.assignedTechnician = "Assign a technician.";
  }
  return errors;
}

function NavIcon({ name }: { name: (typeof navItems)[number]["icon"] }) {
  const className = "h-5 w-5 shrink-0 opacity-90";
  switch (name) {
    case "grid":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      );
    case "box":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
  }
}

function priorityStyles(priority: WorkOrderPriority) {
  switch (priority) {
    case "High":
      return "bg-amber-50 text-amber-800 ring-amber-200/80";
    case "Medium":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    case "Low":
      return "bg-slate-50 text-slate-600 ring-slate-200";
  }
}

function statusStyles(status: WorkOrderStatus) {
  switch (status) {
    case "In Progress":
      return "bg-blue-50 text-blue-800 ring-blue-100";
    case "Open":
      return "bg-amber-50 text-amber-900 ring-amber-100";
    case "Completed":
      return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  }
}

function conditionStyles(condition: string) {
  switch (condition) {
    case "Critical":
      return "bg-red-50 text-red-800 ring-red-100";
    case "Warning":
      return "bg-amber-50 text-amber-900 ring-amber-100";
    case "Monitor":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

const filterSelectClass =
  "rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-[#0c1929] focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20";

const maintenanceNotesClass =
  "mt-1 w-full min-h-[120px] resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0c1929] placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

function maintenanceReportInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[#0c1929]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function MaintenanceReportDisplay({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
<div className="w-full min-w-0 space-y-1 text-sm leading-relaxed [overflow-wrap:anywhere]">      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-2" aria-hidden />;
        }
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const title = headingMatch[2].replace(/\*\*/g, "");
          if (level === 1) {
            return (
              <h3 key={index} className="mt-3 text-sm font-semibold text-[#0c1929] first:mt-0">
                {title}
              </h3>
            );
          }
          return (
            <h4 key={index} className="mt-2 text-sm font-semibold text-[#0c1929]">
              {title}
            </h4>
          );
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <p key={index} className="flex gap-2 pl-1 text-slate-700">
              <span className="text-slate-400" aria-hidden>
                •
              </span>
              <span className="min-w-0 flex-1">{maintenanceReportInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </p>
          );
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          return (
            <p key={index} className="pl-1 text-slate-700">
              {maintenanceReportInline(trimmed)}
            </p>
          );
        }
        return (
          <p key={index} className="text-slate-700">
            {maintenanceReportInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export function OperationsDashboard() {
  const workOrders = useSyncExternalStore(
    subscribeWorkOrders,
    getWorkOrdersClientSnapshot,
    getWorkOrdersServerSnapshot,
  );
  const hydrated = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getClientReadyServerSnapshot,
  );
  useEffect(() => {
    void initializeWorkOrders();
  }, []);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkOrderStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | WorkOrderPriority>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<WorkOrderFormValues>(emptyFormValues);
  const [formErrors, setFormErrors] = useState<WorkOrderFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [activePage, setActivePage] = useState("Overview");

const [assets, setAssets] = useState<AssetRecord[]>([]);
const [assetsLoading, setAssetsLoading] = useState(false);
const [assetsError, setAssetsError] = useState<string | null>(null);

const [showAssetForm, setShowAssetForm] = useState(false);
const [assetSaving, setAssetSaving] = useState(false);
const [assetFormError, setAssetFormError] = useState<string | null>(null);

const [assetForm, setAssetForm] = useState({
  assetTag: "",
  name: "",
  category: "",
  location: "",
});



  type AssetRecord = {
    id: string;
    assetTag: string;
    name: string;
    category: string;
    location: string;
    status: string;
    lastMaintenanceAt: string | null;
    nextMaintenanceAt: string | null;
    createdAt: string;
    updatedAt: string;
    _count: {
      workOrders: number;
      reports: number;
    };
  };
  

type SavedMaintenanceReport = {
  id: string;
  title: string;
  notes: string;
  reportText: string;
  priority: string;
  createdAt: string;
};

const [savedReports, setSavedReports] = useState<SavedMaintenanceReport[]>([]);
const [reportsLoading, setReportsLoading] = useState(false);
const [reportsError, setReportsError] = useState<string | null>(null);

useEffect(() => {
  if (activePage !== "Work Reports") return;


  

  let cancelled = false;

  async function loadReports() {
    setReportsLoading(true);
    setReportsError(null);

    try {
      const response = await fetch("/api/maintenance-reports");

      if (!response.ok) {
        throw new Error("Failed to load reports");
      }

      const data: SavedMaintenanceReport[] = await response.json();

      if (!cancelled) {
        setSavedReports(data);
      }
    } catch {
      if (!cancelled) {
        setReportsError("Could not load saved reports. Please try again.");
      }
    } finally {
      if (!cancelled) {
        setReportsLoading(false);
      }
    }
  }

  void loadReports();

  return () => {
    cancelled = true;
  };
}, [activePage]);


useEffect(() => {
  if (activePage !== "Assets") return;
  
    let cancelled = false;
  
    async function loadAssets() {
      setAssetsLoading(true);
      setAssetsError(null);
  
      try {
        const response = await fetch("/api/assets");
  
        if (!response.ok) {
          throw new Error("Failed to load assets");
        }
  
        const data: AssetRecord[] = await response.json();
  
        if (!cancelled) {
          setAssets(data);
        }
      } catch {
        if (!cancelled) {
          setAssetsError("Could not load assets. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setAssetsLoading(false);
        }
      }
    }
  
    void loadAssets();
  
    return () => {
      cancelled = true;
    };
  }, [activePage]);

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const summaryCards = useMemo(() => {
    const total = workOrders.length;
    const openJobs = countOpenJobs(workOrders);
    const highPriority = workOrders.filter((o) => o.priority === "High").length;
    const completedThisMonth = workOrders.filter((o) => isCompletedThisMonth(o)).length;
    return [
      { title: "Total Work Orders", value: String(total), accent: false },
      { title: "Open Jobs", value: String(openJobs), accent: false },
      { title: "High Priority", value: String(highPriority), accent: true },
      { title: "Completed This Month", value: String(completedThisMonth), accent: false },
    ] as const;
  }, [workOrders]);

  const filteredOrders = useMemo(() => {
    return workOrders
      .filter((order) => matchesSearch(order, searchQuery))
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .filter((order) => (priorityFilter === "all" ? true : order.priority === priorityFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [workOrders, searchQuery, statusFilter, priorityFilter]);

  const openCreateModal = useCallback(() => {
    setFormValues(emptyFormValues);
    setFormErrors({});
    setModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    if (isSubmitting) return;
    setModalOpen(false);
    setFormErrors({});
  }, [isSubmitting]);

  const handleFormChange = useCallback((field: keyof WorkOrderFormValues, value: string) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleCreateSubmit = useCallback(() => {
    const errors = validateWorkOrderForm(formValues);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setIsSubmitting(true);
    window.setTimeout(() => {
      setWorkOrders((prev) => [createWorkOrderFromForm(formValues, prev), ...prev]);
      setIsSubmitting(false);
      setModalOpen(false);
      setFormValues(emptyFormValues);
      setFormErrors({});
    }, 200);
  }, [formValues]);

  const handleStatusChange = useCallback((jobId: string, status: WorkOrderStatus) => {
    setWorkOrders((prev) =>
      prev.map((order) => (order.jobId === jobId ? applyStatusChange(order, status) : order)),
    );
  }, []);

  const filtersActive = statusFilter !== "all" || priorityFilter !== "all" || searchQuery.trim() !== "";

  const handleGenerateMaintenanceReport = useCallback(async () => {
    const trimmed = maintenanceNotes.trim();
    if (!trimmed) {
      setNotesError("Enter maintenance notes before generating a report.");
      setReportError(null);
      return;
    }
    setNotesError(null);
    setReportError(null);
    setGeneratedReport(null);
    setIsGeneratingReport(true);
    try {
      const response = await fetch("/api/maintenance-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: trimmed }),
      });
      const data = (await response.json()) as { report?: string; error?: string };
      if (!response.ok) {
        setReportError(data.error ?? "Unable to generate the report. Please try again.");
        return;
      }
      if (typeof data.report !== "string" || !data.report.trim()) {
        setReportError("The server returned an empty report. Please try again.");
        return;
      }
      setGeneratedReport(data.report);
    } catch {
      setReportError("Network error. Check your connection and try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  }, [maintenanceNotes]);

  return (
    <div className="flex min-h-full flex-1 bg-slate-100 font-sans text-[#0f172a]">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0c1929] text-slate-200 lg:flex">
        <div className="border-b border-white/10 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.671m5.108 4.411l-1.879-1.879m0 0a2.548 2.548 0 10-3.586-3.586l1.879 1.879m-1.879-1.879l3.03 2.496" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">FieldOps</p>
              <p className="text-lg font-semibold tracking-tight text-white">FieldOps AI</p>
            </div>
          </div>
        </div>
        
<nav className="flex flex-1 flex-col gap-1 px-3 py-4">
  {navItems.map((item) => (
    <a
      key={item.label}
      href={item.href}
      onClick={(event) => {
        event.preventDefault();
        setActivePage(item.label);
      }}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        activePage === item.label
          ? "bg-white/10 text-white ring-1 ring-white/10"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
      }`}
    >
      <NavIcon name={item.icon} />
      {item.label}
    </a>
  ))}
</nav>
        <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
          Plant North · Demo environment
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-[#0c1929] px-4 py-3 lg:hidden">
          <span className="shrink-0 text-sm font-semibold text-white">FieldOps AI</span>
          <span className="text-slate-600">|</span>
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${
                item.active ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-[#0c1929] sm:text-2xl">
              {activePage === "Overview"
  ? "Operations Overview"
  : activePage === "Work Orders"
    ? "Work Orders"
    : activePage === "Assets"
      ? "Asset Management"
      : activePage === "Work Reports"
        ? "Saved Work Reports"
        : activePage}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{todayLabel}</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="search"
                placeholder="Search work orders, assets…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-[#0c1929] placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                aria-label="Search work orders"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">

{activePage === "Work Reports" && (
  <section className="space-y-6">
    <div>
      <h2 className="text-2xl font-semibold text-[#0c1929]">
        Saved Work Reports
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Maintenance reports saved in your database.
      </p>
    </div>

    {reportsLoading ? (
      <p className="rounded-xl bg-white p-6 text-sm text-slate-500">
        Loading saved reports…
      </p>
    ) : reportsError ? (
      <p className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {reportsError}
      </p>
    ) : savedReports.length === 0 ? (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <h3 className="font-semibold text-[#0c1929]">
          No saved reports yet
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Generate an AI maintenance report first, then return here.
        </p>
      </div>
    ) : (
      <div className="space-y-4">
        {savedReports.map((report) => (
          <article
            key={report.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-[#0c1929]">
                  {report.title || "Maintenance Report"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {report.priority}
              </span>
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-amber-700">
                View full report and original notes
              </summary>
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <h4 className="text-sm font-semibold">Original Notes</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {report.notes}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">AI-Generated Report</h4>
                  <div className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {report.reportText}
                  </div>
                </div>
              </div>
            </details>
          </article>
        ))}
      </div>
    )}
  </section>
  
)}
{activePage === "Assets" && (
  <section className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-[#0c1929]">
          Asset Inventory
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Track equipment, locations, and maintenance schedules.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-500">Total Assets</p>
        <p className="text-2xl font-semibold text-[#0c1929]">
          {assets.length}
        </p>
      </div>
      <button
  type="button"
  onClick={() => {
    setAssetFormError(null);
    setShowAssetForm(true);
  }}
  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0c1929] px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
>
  <Plus className="h-4 w-4" />
  Add Asset
</button>
    </div>
    {showAssetForm && (
  <form
    onSubmit={async (event) => {
      event.preventDefault();
      setAssetSaving(true);
      setAssetFormError(null);

      try {
        const response = await fetch("/api/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(assetForm),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to create asset.");
        }

        setAssets((current) => [data, ...current]);
        setAssetForm({
          assetTag: "",
          name: "",
          category: "",
          location: "",
        });
        setShowAssetForm(false);
      } catch (error) {
        setAssetFormError(
          error instanceof Error
            ? error.message
            : "Could not create asset. Please try again.",
        );
      } finally {
        setAssetSaving(false);
      }
    }}
    className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
  >
    <div>
      <h3 className="text-lg font-semibold text-[#0c1929]">
        Register New Asset
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Enter the equipment details below.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {(
        [
          ["assetTag", "Asset Tag", "e.g. AC-401"],
          ["name", "Asset Name", "e.g. Air Compressor"],
          ["category", "Category", "e.g. Mechanical"],
          ["location", "Location", "e.g. Plant Room A"],
        ] as const
      ).map(([field, label, placeholder]) => (
        <label key={field} className="space-y-2">
          <span className="block text-sm font-medium text-slate-700">
            {label}
          </span>
          <input
            required
            value={assetForm[field]}
            onChange={(event) =>
              setAssetForm((current) => ({
                ...current,
                [field]: event.target.value,
              }))
            }
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
          />
        </label>
      ))}
    </div>

    {assetFormError && (
      <p className="text-sm text-red-600">{assetFormError}</p>
    )}

    <div className="flex flex-wrap justify-end gap-3">
      <button
        type="button"
        disabled={assetSaving}
        onClick={() => {
          setShowAssetForm(false);
          setAssetFormError(null);
        }}
        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={assetSaving}
        className="rounded-lg bg-[#0c1929] px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {assetSaving ? "Saving..." : "Save Asset"}
      </button>
    </div>
  </form>
)}

    {assetsLoading ? (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading assets...
      </div>
    ) : assetsError ? (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center text-sm text-red-600">
        {assetsError}
      </div>
    ) : assets.length === 0 ? (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Package className="h-6 w-6 text-slate-500" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[#0c1929]">
          No assets yet
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Your equipment inventory is empty. Add assets to start tracking
          equipment details and maintenance activity.
        </p>
      </div>
    ) : (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-4 font-medium">Asset Tag</th>
              <th className="px-5 py-4 font-medium">Asset Name</th>
              <th className="px-5 py-4 font-medium">Category</th>
              <th className="px-5 py-4 font-medium">Location</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Work Orders</th>
              <th className="px-5 py-4 font-medium">Reports</th>
              <th className="px-5 py-4 font-medium">Next Maintenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-medium text-[#0c1929]">
                  {asset.assetTag}
                </td>
                <td className="px-5 py-4 text-slate-700">{asset.name}</td>
                <td className="px-5 py-4 text-slate-600">{asset.category}</td>
                <td className="px-5 py-4 text-slate-600">{asset.location}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {asset.status.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {asset._count.workOrders}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {asset._count.reports}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {asset.nextMaintenanceAt
                    ? new Date(asset.nextMaintenanceAt).toLocaleDateString()
                    : "Not scheduled"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}
<div
  className={
    activePage === "Work Reports" || activePage === "Assets"
      ? "hidden"
      : "contents"
  }
>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <article
                key={card.title}
                className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <p
                  className={`mt-2 text-3xl font-semibold tracking-tight ${
                    card.accent ? "text-amber-600" : "text-[#0c1929]"
                  }`}
                >
                  {!hydrated ? (
                    <span className="inline-block h-9 w-12 animate-pulse rounded bg-slate-100" aria-hidden />
                  ) : (
                    card.value
                  )}
                </p>
              </article>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section
  className={`xl:col-span-2 ${
    activePage === "Work Orders" ? "xl:col-span-3" : ""
  }`}
>              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-[#0c1929]">{activePage === "All Work Orders" ?"Work Orders":"Recent Work Orders"}</h2>
                    <p className="text-sm text-slate-500">Latest maintenance jobs across the facility</p>
                  </div>
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="shrink-0 rounded-lg bg-[#0c1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#152238] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:ring-offset-2"
                  >
                    Create Work Order
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    Status
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as "all" | WorkOrderStatus)
                      }
                      className={filterSelectClass}
                      aria-label="Filter by status"
                    >
                      <option value="all">All statuses</option>
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    Priority
                    <select
                      value={priorityFilter}
                      onChange={(e) =>
                        setPriorityFilter(e.target.value as "all" | WorkOrderPriority)
                      }
                      className={filterSelectClass}
                      aria-label="Filter by priority"
                    >
                      <option value="all">All priorities</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </label>
                  {filtersActive ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setPriorityFilter("all");
                      }}
                      className="text-xs font-medium text-amber-700 hover:text-amber-800"
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-5 py-3">Job ID</th>
                        <th className="px-5 py-3">Work Order</th>
                        <th className="px-5 py-3">Asset</th>
                        <th className="px-5 py-3">Priority</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {!hydrated ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={`loading-${i}`}>
                            <td colSpan={5} className="px-5 py-4">
                              <div className="h-4 animate-pulse rounded bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      ) : filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                            {workOrders.length === 0
                              ? "No work orders yet. Create one to get started."
                              : "No work orders match your search or filters."}
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((row) => (
                          <tr key={row.jobId} className="hover:bg-slate-50/50">
                            <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs font-medium text-[#0c1929]">
                              {row.jobId}
                            </td>
                            <td className="max-w-[220px] px-5 py-3.5">
                              <p className="font-medium text-[#0c1929]">{row.title}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{row.site}</p>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{row.asset}</td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${priorityStyles(row.priority)}`}
                              >
                                {row.priority}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-5 py-3.5">
                              <label className="sr-only" htmlFor={`status-${row.jobId}`}>
                                Status for {row.jobId}
                              </label>
                              <select
                                id={`status-${row.jobId}`}
                                value={row.status}
                                onChange={(e) =>
                                  handleStatusChange(row.jobId, e.target.value as WorkOrderStatus)
                                }
                                className={`max-w-[140px] cursor-pointer rounded-full border-0 py-0.5 pl-2.5 pr-7 text-xs font-medium ring-1 ring-inset focus:outline-none focus:ring-2 focus:ring-amber-400/40 ${statusStyles(row.status)}`}
                                aria-label={`Change status for ${row.jobId}`}
                              >
                                <option value="Open">Open</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Completed">Completed</option>
                              </select>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {activePage !== "Work Orders" && (
  <aside className="flex flex-col gap-6">
                  <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0c1929]">
                  <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-[#0c1929]">AI Maintenance Report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Paste field notes; the assistant drafts a structured maintenance report.
                </p>
                <label htmlFor="maintenance-notes" className="mt-4 block text-sm font-medium text-slate-700">
                  Maintenance notes
                </label>
                <textarea
                  id="maintenance-notes"
                  value={maintenanceNotes}
                  onChange={(e) => {
                    setMaintenanceNotes(e.target.value);
                    if (notesError) setNotesError(null);
                  }}
                  placeholder="Describe observations, asset ID, symptoms, and actions taken…"
                  rows={5}
                  disabled={isGeneratingReport}
                  className={`${maintenanceNotesClass} ${notesError ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                  aria-invalid={notesError ? true : undefined}
                  aria-describedby={notesError ? "maintenance-notes-error" : undefined}
                />
                {notesError ? (
                  <p id="maintenance-notes-error" className="mt-1.5 text-xs text-red-600" role="alert">
                    {notesError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleGenerateMaintenanceReport()}
                  disabled={isGeneratingReport}
                  className="mt-4 w-full rounded-lg bg-[#0c1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#152238] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingReport ? "Generating report…" : "Generate Report"}
                </button>
                {isGeneratingReport ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-slate-500" aria-live="polite">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-amber-500" aria-hidden />
                    Drafting report from your notes…
                  </p>
                ) : null}
                {reportError ? (
                  <p className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                    {reportError}
                  </p>
                ) : null}
                {generatedReport ? (
                  
                  <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Generated report
                    </p>
                    <div className="mt-2 w-full min-w-0 whitespace-normal break-words">
                      <MaintenanceReportDisplay text={generatedReport} />
                    </div>
                  </div>

                ) : null}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0c1929]">Equipment Requiring Attention</h2>
                <p className="mt-1 text-sm text-slate-500">Condition alerts from last sensor sync</p>
                <ul className="mt-4 space-y-3">
                  {equipmentAttention.map((item) => (
                    <li
                      key={item.name}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0c1929]">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${conditionStyles(item.condition)}`}
                      >
                        {item.condition}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
            )}
          </div>
</div>
        </main>
      </div>

      <CreateWorkOrderModal
        open={modalOpen}
        onClose={closeCreateModal}
        values={formValues}
        errors={formErrors}
        isSubmitting={isSubmitting}
        onChange={handleFormChange}
        onSubmit={handleCreateSubmit}
      />
    </div>
  );
}
