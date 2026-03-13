import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { driverToggleOnline, driverGetProfile } from "../../apis/driverApi";
import { useNotification } from "../../../context/NotificationContext";

const HEADER_HEIGHT_CLASS = "h-[72px]";

function NotificationBadge({ count }) {
  if (!count || count <= 0) return null;
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function DriverHeader() {
  const [isAccepting, setIsAccepting] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const { unreadCount, refreshUnreadCount } = useNotification();

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  useEffect(() => {
    driverGetProfile()
      .then((res) => {
        const data = res?.data ?? res;
        const online = data?.isOnline;
        if (typeof online === "boolean") setIsAccepting(online);
      })
      .catch(() => {});
  }, []);

  const handleToggleAccepting = async () => {
    const next = !isAccepting;
    setToggleLoading(true);
    try {
      await driverToggleOnline(next);
      setIsAccepting(next);
    } catch {
      // keep current state on error
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 bg-[#f2f2f2] border-b border-gray-200 px-4 py-3 flex items-center justify-between ${HEADER_HEIGHT_CLASS}`}
    >
      <div className="flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/40"
          alt="profile"
          className="w-10 h-10 rounded-full shrink-0"
        />
        <div className="bg-white px-4 py-2 rounded-xl shadow flex items-center gap-3">
          <span className="text-sm font-medium whitespace-nowrap">
            {isAccepting ? "Accepting Pick-ups" : "Not Accepting"}
          </span>
          <button
            type="button"
            onClick={() => !toggleLoading && handleToggleAccepting()}
            disabled={toggleLoading}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 shrink-0 ${
              isAccepting ? "bg-black" : "bg-gray-300"
            } ${toggleLoading ? "opacity-70" : ""}`}
          >
            <span
              className={`bg-white w-4 h-4 rounded-full shadow-md block transition-all duration-300 ${
                isAccepting ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
      <Link
        to="/driver/notifications"
        className="relative bg-gray-200 p-2.5 rounded-xl shadow hover:bg-gray-300 transition"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        <NotificationBadge count={unreadCount} />
      </Link>
    </header>
  );
}

export { HEADER_HEIGHT_CLASS };
