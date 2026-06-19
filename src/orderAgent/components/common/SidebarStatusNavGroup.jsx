import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NavLink, useSearchParams } from "react-router-dom";
import { ORDER_AGENT_SECTION_PATHS } from "../../constants";
import {
  getStatusCount,
  useOrderAgentStatusOptions,
} from "../../context/StatusOptionsContext";
import { statusParamsMatch } from "../../list/statusUrlSync";
import { formatStatusDisplayLabel } from "../../list/statusDisplayLabels";

function CountBadge({ count, active }) {
  if (count === null) {
    return <span className="shrink-0 text-[10px] opacity-50">…</span>;
  }
  return (
    <span
      className={`min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
        active ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
      }`}
    >
      {count}
    </span>
  );
}

function StatusNavLink({ to, active, label, count }) {
  const subLinkClass = (isActive) =>
    `flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
      isActive
        ? "bg-stone-900 text-white"
        : "text-stone-600 hover:bg-canvas-muted hover:text-stone-900"
    }`;

  return (
    <NavLink to={to} className={() => subLinkClass(active)}>
      <span className="truncate">{label}</span>
      <CountBadge count={count} active={active} />
    </NavLink>
  );
}

export default function SidebarStatusNavGroup({
  section,
  label,
  icon: Icon,
  isSectionActive,
}) {
  const { loading, error, orders, exchange, returns, statusCounts, sectionTotals, countsLoading, countsError } =
    useOrderAgentStatusOptions();
  const [searchParams] = useSearchParams();

  const sectionPath = ORDER_AGENT_SECTION_PATHS[section] || ORDER_AGENT_SECTION_PATHS.orders;
  const optionsByKey = { orders, exchange, returns };
  const allOptions = optionsByKey[section] || [];
  const allEntry = allOptions.find((opt) => opt.value === "");
  const statusLinks = allOptions.filter((opt) => opt.value !== "");
  const activeStatus = searchParams.get("status") || "";
  const activeProvider = searchParams.get("provider") || "";
  const [isOpen, setIsOpen] = useState(isSectionActive);

  useEffect(() => {
    if (isSectionActive) setIsOpen(true);
  }, [isSectionActive]);

  const isAllActive = isSectionActive && !activeStatus && !activeProvider;
  const countCtx = { statusCounts, sectionTotals, countsLoading };

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-medium transition ${
          isSectionActive
            ? "bg-stone-900 text-white"
            : "text-stone-600 hover:bg-canvas-muted hover:text-stone-900"
        }`}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon size={16} className="shrink-0" />
          <span className="truncate">{label}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <CountBadge
            count={getStatusCount(section, "", countCtx)}
            active={isSectionActive}
          />
          {isOpen ? (
            <ChevronDown size={14} className="shrink-0 opacity-80" />
          ) : (
            <ChevronRight size={14} className="shrink-0 opacity-80" />
          )}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? "max-h-[min(32rem,75vh)] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="scrollbar-thin max-h-[min(32rem,75vh)] space-y-0.5 overflow-y-auto py-1 pl-7 pr-2">
          <StatusNavLink
            to={sectionPath}
            active={isAllActive}
            label={formatStatusDisplayLabel("", allEntry?.label) || allEntry?.label || `All ${label.toLowerCase()}`}
            count={getStatusCount(section, "", countCtx)}
          />

          {loading ? (
            <p className="px-3 py-1.5 text-[11px] text-stone-400">Loading statuses…</p>
          ) : statusLinks.length ? (
            statusLinks.map((opt) => (
              <StatusNavLink
                key={`${section}-${opt.value}`}
                to={`${sectionPath}?status=${encodeURIComponent(opt.value)}`}
                active={isSectionActive && statusParamsMatch(activeStatus, opt.value)}
                label={formatStatusDisplayLabel(opt.value, opt.label)}
                count={getStatusCount(section, opt.value, countCtx)}
              />
            ))
          ) : (
            <p className="px-3 py-1.5 text-[11px] text-stone-400">No statuses loaded</p>
          )}

          {error ? <p className="px-3 py-1 text-[10px] text-red-600">{error}</p> : null}
          {countsError ? (
            <p className="px-3 py-1 text-[10px] text-red-600">Counts unavailable</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
