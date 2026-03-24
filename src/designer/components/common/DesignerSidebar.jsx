import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, User, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../../redux/GlobalSlice";
import { designerApi } from "../../apis/designerApi";

const DesignerSidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const doLogout = async () => {
    try {
      await designerApi.logout();
    } catch {
      // ignore
    }
    dispatch(logout());
    navigate("/designer/login");
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
          <p className="text-[10px] text-indigo-200">Khush</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <Link className={itemClass("/designer/dashboard")} to="/designer/dashboard">
            <LayoutDashboard size={18} className="shrink-0 text-indigo-300" /> Dashboard
          </Link>
          <Link className={itemClass("/designer/inventory")} to="/designer/inventory">
            <Package size={18} className="shrink-0 text-emerald-300" /> Inventory
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
      <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-indigo-900/20 bg-indigo-950 px-3 py-2 text-white md:hidden">
        <span className="text-sm font-semibold">Designer</span>
        <div className="flex gap-1">
          <Link to="/designer/dashboard" className="rounded-md bg-white/10 px-2 py-1 text-xs">
            Home
          </Link>
          <Link to="/designer/inventory" className="rounded-md bg-emerald-600/80 px-2 py-1 text-xs">
            Stock
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
