import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Ruler,
  FileText,
  User,
  LogOut,
  ArrowLeft,
  Users,
} from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../../redux/GlobalSlice";
import { canSwitchDesignerPanels } from "../../../utils/authRole";
import { designerApi } from "../../apis/designerApi";

function readPanelName() {
  try {
    return sessionStorage.getItem("designerPanelName") || "";
  } catch {
    return "";
  }
}

const DesignerSidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const canSwitch = canSwitchDesignerPanels();
  const panelName = readPanelName();

  const doLogout = async () => {
    try {
      await designerApi.logout();
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate("/designer/login");
  };

  /** Open designer list to switch panel (Anisha → Sakshi) without logout. */
  const backToDesignerList = () => {
    console.log("[Designer] open switch list (stay logged in)", {
      panelName,
      path: location.pathname,
    });
    navigate("/designer/select-panel?switch=1", {
      state: { switch: true },
    });
  };

  const itemClass = (path) => {
    const on = location.pathname === path || location.pathname.startsWith(`${path}/`);
    return `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      on ? "bg-white/15 text-white ring-1 ring-indigo-400/50" : "text-indigo-100 hover:bg-white/10 hover:text-white"
    }`;
  };

  return (
    <>
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-indigo-900/40 bg-linear-to-b from-indigo-950 via-slate-900 to-indigo-950 p-3 text-white shadow-xl md:flex">
        <div className="mb-4 rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <h2 className="text-sm font-bold tracking-tight text-white">Designer panel</h2>
          <p className="truncate text-[10px] text-indigo-200">
            {panelName ? panelName : "Khush"}
          </p>
        </div>

        {canSwitch ? (
          <button
            type="button"
            onClick={backToDesignerList}
            className="mb-3 flex w-full items-center gap-2 rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500/35"
            title="Choose another designer without logging out"
          >
            <ArrowLeft size={18} className="shrink-0" />
            <span className="flex min-w-0 flex-col items-start leading-tight">
              <span>Back to designers</span>
              <span className="text-[10px] font-normal text-indigo-200">
                Switch panel (no logout)
              </span>
            </span>
            <Users size={16} className="ml-auto shrink-0 text-indigo-200" />
          </button>
        ) : null}

        <nav className="flex flex-1 flex-col gap-1">
          <Link className={itemClass("/designer/dashboard")} to="/designer/dashboard">
            <LayoutDashboard size={18} className="shrink-0 text-indigo-300" /> Dashboard
          </Link>
          <Link className={itemClass("/designer/inventory")} to="/designer/inventory">
            <Package size={18} className="shrink-0 text-emerald-300" /> Inventory
          </Link>
          <Link className={itemClass("/designer/size-chart")} to="/designer/size-chart">
            <Ruler size={18} className="shrink-0 text-cyan-300" /> Size chart
          </Link>
          <Link className={itemClass("/designer/listing-template")} to="/designer/listing-template">
            <FileText size={18} className="shrink-0 text-amber-200" /> Listing templates
          </Link>
          <Link className={itemClass("/designer/profile")} to="/designer/profile">
            <User size={18} className="shrink-0 text-violet-300" /> Profile
          </Link>
        </nav>
        <button
          type="button"
          className="mt-2 flex w-full items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm font-medium text-rose-100 hover:bg-rose-900/40"
          onClick={doLogout}
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/20 bg-indigo-950 px-3 py-2 text-white md:hidden">
        <span className="truncate text-sm font-semibold">
          {panelName || "Designer"}
        </span>
        <div className="flex flex-wrap gap-1">
          {canSwitch ? (
            <button
              type="button"
              onClick={backToDesignerList}
              className="rounded-md bg-indigo-500/80 px-2 py-1 text-xs font-semibold"
            >
              Switch
            </button>
          ) : null}
          <Link to="/designer/dashboard" className="rounded-md bg-white/10 px-2 py-1 text-xs">
            Home
          </Link>
          <Link to="/designer/inventory" className="rounded-md bg-emerald-600/80 px-2 py-1 text-xs">
            Stock
          </Link>
          <Link to="/designer/size-chart" className="rounded-md bg-cyan-600/80 px-2 py-1 text-xs">
            Charts
          </Link>
          <Link to="/designer/listing-template" className="rounded-md bg-amber-600/80 px-2 py-1 text-xs">
            Text
          </Link>
          <Link to="/designer/profile" className="rounded-md bg-violet-600/80 px-2 py-1 text-xs">
            Me
          </Link>
        </div>
      </div>
    </>
  );
};

export default DesignerSidebar;
