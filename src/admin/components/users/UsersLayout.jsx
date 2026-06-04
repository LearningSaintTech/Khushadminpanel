import { Outlet } from "react-router-dom";

export default function UsersLayout() {
  return (
    <div className="text-stone-900">
      <Outlet />
    </div>
  );
}
