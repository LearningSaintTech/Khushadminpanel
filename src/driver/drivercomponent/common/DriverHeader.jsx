import { useState, useEffect } from "react";
import { driverToggleOnline, driverGetProfile } from "../../apis/driverApi";

const HEADER_HEIGHT_CLASS = "h-[72px]";

export default function DriverHeader() {
  const [isAccepting, setIsAccepting] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);

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
      <button type="button" className="bg-gray-200 p-2.5 rounded-xl shadow hover:bg-gray-300 transition">
        <span className="text-lg" aria-hidden>🔔</span>
      </button>
    </header>
  );
}

export { HEADER_HEIGHT_CLASS };
