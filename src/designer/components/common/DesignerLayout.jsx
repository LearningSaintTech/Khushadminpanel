import { Outlet } from "react-router-dom";
import DesignerSidebar from "./DesignerSidebar";

const DesignerLayout = () => {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-indigo-50/30">
      <DesignerSidebar />
      <main className="ml-0 min-h-screen md:ml-64 p-3 md:p-4">
        <div className="mx-auto max-w-7xl rounded-xl border border-gray-100/80 bg-white/90 p-3 shadow-sm backdrop-blur-sm md:p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DesignerLayout;
