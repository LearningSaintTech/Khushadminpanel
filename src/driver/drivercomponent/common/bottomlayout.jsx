// BottomNavLayout.jsx – bottom nav only; header is in DriverAppLayout
import { Outlet } from "react-router-dom";
import BottomNavbar from "./bottomnavbar";

export default function BottomNavLayout() {
  return (
    <>
      <div className="pb-20">
        <Outlet />
      </div>
      <BottomNavbar />
    </>
  );
}