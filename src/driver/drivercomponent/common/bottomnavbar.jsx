import { NavLink } from "react-router-dom";
import { Home, ShoppingBag, User } from "lucide-react";

export default function BottomNavbar() {
  return (
    <div className="fixed bottom-0 left-0 w-full bg-black flex justify-around py-5 rounded-t-3xl md:hidden">
      
      <NavLink
        to="/driver/dashboard"
        className={({ isActive }) =>
          `flex flex-col items-center text-xs ${
            isActive ? "text-white" : "text-gray-400"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Home
              size={22}
              fill={isActive ? "white" : "none"}
            />
            <span>Home</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/driver/order-history"
        className={({ isActive }) =>
          `flex flex-col items-center text-xs ${
            isActive ? "text-white" : "text-gray-400"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <ShoppingBag
              size={22}
              fill={isActive ? "white" : "none"}
            />
            <span>Orders</span>
          </>
        )}
      </NavLink>

      <NavLink
        to="/driver/profile"
        className={({ isActive }) =>
          `flex flex-col items-center text-xs ${
            isActive ? "text-white" : "text-gray-400"
          }`
        }
      >
        {({ isActive }) => (
          <>
            <User
              size={22}
              fill={isActive ? "white" : "none"}
            />
            <span>Profile</span>
          </>
        )}
      </NavLink>

    </div>
  );
}