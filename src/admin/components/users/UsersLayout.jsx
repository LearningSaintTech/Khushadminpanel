import { NavLink, Outlet } from "react-router-dom";
import { Users } from "lucide-react";

const tabClass = ({ isActive }) =>
  `px-4 py-2 rounded-lg text-sm font-medium transition ${
    isActive
      ? "bg-gray-900 text-white"
      : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
  }`;

export default function UsersLayout() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-indigo-600" />
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage real app users and fake/demo profiles.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <NavLink to="real" className={tabClass} end>
            User
          </NavLink>
          <NavLink to="fake" className={tabClass}>
            Fake Users
          </NavLink>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
