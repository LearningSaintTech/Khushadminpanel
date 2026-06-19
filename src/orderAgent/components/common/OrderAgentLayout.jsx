import { NavLink, Outlet, useMatch, useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import {
  BarChart3,
  ClipboardList,
  Clock,
  LogOut,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";
import { logout } from "../../../redux/GlobalSlice";
import { clearOrderAgentSessionStorage } from "../../../utils/authRole";
import { orderAgentLogout } from "../../apis/orderAgentApi";
import {
  ORDER_AGENT_ANALYTICS_TAB,
  ORDER_AGENT_CANCEL_TAB,
  ORDER_AGENT_PROCESS_TAB,
  ORDER_AGENT_SECTION_PATHS,
  ORDER_AGENT_SHIPPING_NAV,
  ORDER_AGENT_STALE_TAB,
} from "../../constants";
import {
  getProviderCount,
  getStatusCount,
  StatusOptionsProvider,
  useOrderAgentStatusOptions,
} from "../../context/StatusOptionsContext";
import { statusParamsMatch } from "../../list/statusUrlSync";
import { ViewModeProvider } from "../../context/ViewModeContext";
import SidebarStatusNavGroup from "./SidebarStatusNavGroup";
import ViewModeToggle from "./ViewModeToggle";

function CountBadge({ count, active }) {
  if (count === null) {
    return <span className="ml-auto shrink-0 text-[10px] opacity-50">…</span>;
  }
  return (
    <span
      className={`ml-auto min-w-[1.25rem] shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums ${
        active ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
      }`}
    >
      {count}
    </span>
  );
}

const STATUS_SECTIONS = {
  orders: { label: "Orders", icon: ShoppingBag, path: ORDER_AGENT_SECTION_PATHS.orders },
  exchange: { label: "Exchange", icon: RefreshCw, path: ORDER_AGENT_SECTION_PATHS.exchange },
  returns: { label: "Returns", icon: RotateCcw, path: ORDER_AGENT_SECTION_PATHS.returns },
};

function FlatOrderTabLink({ item, onOrdersRoute, activeProvider, activeStatus, navLinkClass }) {
  const { statusCounts, providerCounts, sectionTotals, countsLoading } =
    useOrderAgentStatusOptions();
  const isActive =
    item.filter === "provider"
      ? onOrdersRoute && statusParamsMatch(activeProvider, item.value)
      : onOrdersRoute && statusParamsMatch(activeStatus, item.value);
  const search =
    item.filter === "provider"
      ? `?provider=${encodeURIComponent(item.value)}`
      : `?status=${encodeURIComponent(item.value)}`;
  const Icon = item.filter === "status" ? XCircle : Truck;
  const count =
    item.filter === "provider"
      ? getProviderCount(item.value, { providerCounts, countsLoading })
      : getStatusCount("orders", item.value, {
          statusCounts,
          sectionTotals,
          countsLoading,
        });

  return (
    <NavLink
      to={{ pathname: ORDER_AGENT_SECTION_PATHS.orders, search }}
      className={() => `${navLinkClass(isActive)} flex items-center gap-2`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="truncate">{item.label}</span>
      <CountBadge count={count} active={isActive} />
    </NavLink>
  );
}

function OrderAgentLayoutShell() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const { statusCounts, sectionTotals, countsLoading, staleCount, countsError, refreshSidebarCounts } =
    useOrderAgentStatusOptions();
  const activeProvider = searchParams.get("provider") || "";
  const activeStatus = searchParams.get("status") || "";

  const onOrdersRoute = Boolean(useMatch({ path: "/order-agent/orders", end: true }));
  const orderProcessActive = Boolean(useMatch({ path: "/order-agent/order-process", end: true }));
  const onCarrierRoute = onOrdersRoute && Boolean(activeProvider);
  const ordersActive = onOrdersRoute && !onCarrierRoute;
  const exchangeActive = Boolean(useMatch({ path: "/order-agent/exchange", end: true }));
  const returnsActive = Boolean(useMatch({ path: "/order-agent/returns", end: true }));
  const staleActive = Boolean(useMatch({ path: "/order-agent/stale-orders", end: true }));

  const handleLogout = async () => {
    try {
      await orderAgentLogout();
    } catch {
      /* local logout */
    }
    clearOrderAgentSessionStorage();
    dispatch(logout());
    navigate("/order-agent/login", { replace: true });
  };

  const navLinkClass = (active) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition ${
      active
        ? "bg-stone-900 text-white"
        : "text-stone-600 hover:bg-canvas-muted hover:text-stone-900"
    }`;

  const flatTabProps = { onOrdersRoute, activeProvider, activeStatus, navLinkClass };
  const processCount = getStatusCount("orders", ORDER_AGENT_PROCESS_TAB.status, {
    statusCounts,
    sectionTotals,
    countsLoading,
  });

  return (
    <div className="flex min-h-screen bg-canvas-muted">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-white">
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white">
              <Package size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Order Agent</p>
              <p className="text-[10px] text-stone-500">Fulfilment panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {/* 1–3: Orders, Exchange, Returns */}
          <SidebarStatusNavGroup
            section="orders"
            label={STATUS_SECTIONS.orders.label}
            icon={STATUS_SECTIONS.orders.icon}
            isSectionActive={ordersActive}
          />
          <SidebarStatusNavGroup
            section="exchange"
            label={STATUS_SECTIONS.exchange.label}
            icon={STATUS_SECTIONS.exchange.icon}
            isSectionActive={exchangeActive}
          />
          <SidebarStatusNavGroup
            section="returns"
            label={STATUS_SECTIONS.returns.label}
            icon={STATUS_SECTIONS.returns.icon}
            isSectionActive={returnsActive}
          />

          {/* Order process — PROCESSING queue */}
          <NavLink
            to={ORDER_AGENT_PROCESS_TAB.path}
            className={() => `${navLinkClass(orderProcessActive)} flex items-center gap-2`}
          >
            <ClipboardList size={16} className="shrink-0" />
            <span className="truncate">{ORDER_AGENT_PROCESS_TAB.label}</span>
            <CountBadge count={processCount} active={orderProcessActive} />
          </NavLink>

          {/* Cancel */}
          <FlatOrderTabLink item={ORDER_AGENT_CANCEL_TAB} {...flatTabProps} />

          {/* 5: Stale orders */}
          <NavLink
            to={ORDER_AGENT_STALE_TAB.path}
            className={() => `${navLinkClass(staleActive)} flex items-center gap-2`}
          >
            <Clock size={16} className="shrink-0" />
            <span className="truncate">{ORDER_AGENT_STALE_TAB.label}</span>
            <CountBadge count={countsLoading ? null : staleCount} active={staleActive} />
          </NavLink>

          {/* 6–9: Shiprocket, Delhivery, Shadowfax, Self shipping */}
          {ORDER_AGENT_SHIPPING_NAV.map((item) => (
            <FlatOrderTabLink key={item.key} item={item} {...flatTabProps} />
          ))}

          {/* 10: Analytics */}
          <NavLink
            to={ORDER_AGENT_ANALYTICS_TAB.path}
            className={({ isActive }) => navLinkClass(isActive)}
          >
            <BarChart3 size={16} className="shrink-0" />
            {ORDER_AGENT_ANALYTICS_TAB.label}
          </NavLink>
        </nav>

        {countsError ? (
          <div className="border-t border-border px-2 py-2">
            <p className="px-1 text-[10px] leading-snug text-red-600">{countsError}</p>
            <button
              type="button"
              onClick={() => refreshSidebarCounts()}
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-[11px] font-medium text-stone-600 transition hover:bg-canvas-muted"
            >
              Retry counts
            </button>
          </div>
        ) : null}

        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-stone-600 transition hover:bg-canvas-muted"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5">
          <p className="text-sm font-semibold text-stone-900 lg:hidden">Order Agent</p>
          <span className="hidden flex-1 lg:block" aria-hidden />
          <ViewModeToggle />
        </header>
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function OrderAgentLayout() {
  return (
    <ViewModeProvider>
      <StatusOptionsProvider>
        <OrderAgentLayoutShell />
      </StatusOptionsProvider>
    </ViewModeProvider>
  );
}
