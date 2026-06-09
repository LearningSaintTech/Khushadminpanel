import { Outlet, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Headphones, LogOut } from "lucide-react";
import { logout } from "../../../redux/GlobalSlice";
import { clearSupportAgentSessionStorage } from "../../../utils/authRole";
import { supportAgentLogout } from "../../apis/supportAgentApi";

export default function SupportAgentLayout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      await supportAgentLogout();
    } catch {
      // proceed with local logout
    }
    clearSupportAgentSessionStorage();
    dispatch(logout());
    navigate("/support-agent/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas-muted">
      <header className="sticky top-0 z-20 border-b border-border bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Headphones size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900">Khush Support</p>
              <p className="text-[10px] text-stone-500">Agent panel</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-stone-600 transition hover:bg-canvas-muted"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
