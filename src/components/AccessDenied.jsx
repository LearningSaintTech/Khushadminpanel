import { Link } from "react-router-dom";
import { ShieldOff } from "lucide-react";

export default function AccessDenied({ basePath = "/subadmin", reason }) {
  const dashboard = `${basePath}/dashboard`.replace(/\/+/g, "/");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger">
        <ShieldOff className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-lg font-bold text-stone-900">Access denied</h1>
      <p className="mt-2 max-w-md text-sm text-stone-600">
        {reason ||
          "You do not have permission to view this panel section. Contact your administrator if you need access."}
      </p>
      <Link
        to={dashboard}
        className="mt-6 inline-flex rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
