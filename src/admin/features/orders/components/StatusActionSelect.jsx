import React from "react";
import { RefreshCw } from "lucide-react";
import { statusOptionsForItem } from "../utils/statusOptions.js";

/**
 * Single primary status control for an order line.
 */
export default function StatusActionSelect({
  item,
  value,
  onChange,
  disabled = false,
  updating = false,
  canEdit = true,
  exchangeOnly = false,
  returnOnly = false,
  className = "",
  selectClassName = "",
}) {
  if (!canEdit) {
    return (
      <p className={`text-sm font-medium text-stone-800 ${className}`}>
        {item?.status || value || "—"}
      </p>
    );
  }

  const options = statusOptionsForItem(item, { exchangeOnly, returnOnly });
  const current = value ?? item?.status ?? "";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={current}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || updating}
        className={selectClassName}
        aria-label="Update line status"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {updating ? (
        <span className="flex items-center gap-2 text-sm text-brand-600">
          <RefreshCw size={16} className="animate-spin" aria-hidden />
          Updating…
        </span>
      ) : null}
    </div>
  );
}
