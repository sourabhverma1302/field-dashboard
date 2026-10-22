"use client";

import { useEffect, useId, useRef } from "react";
import type {
  WorkOrderFormErrors,
  WorkOrderFormValues,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/types/work-order";

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-[#0c1929] placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20";
const labelClass = "block text-sm font-medium text-slate-700";

type CreateWorkOrderModalProps = {
  open: boolean;
  onClose: () => void;
  values: WorkOrderFormValues;
  errors: WorkOrderFormErrors;
  isSubmitting: boolean;
  onChange: (field: keyof WorkOrderFormValues, value: string) => void;
  onSubmit: () => void;
};

export function CreateWorkOrderModal({
  open,
  onClose,
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
}: CreateWorkOrderModalProps) {
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0c1929]/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id={titleId} className="text-base font-semibold text-[#0c1929]">
            Create Work Order
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Add a maintenance job to the facility queue.
          </p>
        </div>
        <form
          className="flex flex-1 flex-col overflow-hidden"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div>
              <label htmlFor="wo-title" className={labelClass}>
                Work order title <span className="text-red-600">*</span>
              </label>
              <input
                ref={firstFieldRef}
                id="wo-title"
                type="text"
                value={values.title}
                onChange={(e) => onChange("title", e.target.value)}
                className={`${inputClass} ${errors.title ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "wo-title-error" : undefined}
              />
              {errors.title ? (
                <p id="wo-title-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.title}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wo-asset" className={labelClass}>
                  Asset name <span className="text-red-600">*</span>
                </label>
                <input
                  id="wo-asset"
                  type="text"
                  value={values.asset}
                  onChange={(e) => onChange("asset", e.target.value)}
                  className={`${inputClass} ${errors.asset ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                  aria-invalid={Boolean(errors.asset)}
                  aria-describedby={errors.asset ? "wo-asset-error" : undefined}
                />
                {errors.asset ? (
                  <p id="wo-asset-error" className="mt-1 text-xs text-red-600" role="alert">
                    {errors.asset}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="wo-site" className={labelClass}>
                  Site <span className="text-red-600">*</span>
                </label>
                <input
                  id="wo-site"
                  type="text"
                  value={values.site}
                  onChange={(e) => onChange("site", e.target.value)}
                  className={`${inputClass} ${errors.site ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                  aria-invalid={Boolean(errors.site)}
                  aria-describedby={errors.site ? "wo-site-error" : undefined}
                />
                {errors.site ? (
                  <p id="wo-site-error" className="mt-1 text-xs text-red-600" role="alert">
                    {errors.site}
                  </p>
                ) : null}
              </div>
            </div>
            <div>
              <label htmlFor="wo-description" className={labelClass}>
                Description
              </label>
              <textarea
                id="wo-description"
                rows={3}
                value={values.description}
                onChange={(e) => onChange("description", e.target.value)}
                className={inputClass}
                placeholder="Optional details for the technician"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wo-priority" className={labelClass}>
                  Priority
                </label>
                <select
                  id="wo-priority"
                  value={values.priority}
                  onChange={(e) => onChange("priority", e.target.value as WorkOrderPriority)}
                  className={inputClass}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="wo-status" className={labelClass}>
                  Status
                </label>
                <select
                  id="wo-status"
                  value={values.status}
                  onChange={(e) => onChange("status", e.target.value as WorkOrderStatus)}
                  className={inputClass}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="wo-tech" className={labelClass}>
                Assigned technician <span className="text-red-600">*</span>
              </label>
              <input
                id="wo-tech"
                type="text"
                value={values.assignedTechnician}
                onChange={(e) => onChange("assignedTechnician", e.target.value)}
                className={`${inputClass} ${errors.assignedTechnician ? "border-red-300 focus:border-red-400 focus:ring-red-200" : ""}`}
                aria-invalid={Boolean(errors.assignedTechnician)}
                aria-describedby={errors.assignedTechnician ? "wo-tech-error" : undefined}
              />
              {errors.assignedTechnician ? (
                <p id="wo-tech-error" className="mt-1 text-xs text-red-600" role="alert">
                  {errors.assignedTechnician}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:ring-offset-2 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#0c1929] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#152238] focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:ring-offset-2 disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : "Create work order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
