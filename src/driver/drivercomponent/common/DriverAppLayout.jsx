import { Outlet } from "react-router-dom";
import DriverHeader from "./DriverHeader";

/**
 * Wraps all protected driver routes so the header (profile + Accepting toggle + bell) is static on every page.
 */
export default function DriverAppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2f2]">
      <DriverHeader />
      <main className="flex-1 pt-2">
        <Outlet />
      </main>
    </div>
  );
}
