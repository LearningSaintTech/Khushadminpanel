import { Link } from "react-router-dom";

export default function OrderAgentUnavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900">Order agent panel unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          The order-agent workspace is disabled until KhushBackend order-agent APIs are deployed.
          Set <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">VITE_ORDER_AGENT_ENABLED=true</code>{" "}
          after the backend routes are live.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-800"
        >
          Back to admin
        </Link>
      </div>
    </div>
  );
}
