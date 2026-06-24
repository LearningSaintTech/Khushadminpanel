import OrderAgentUnavailable from "./OrderAgentUnavailable";

const orderAgentEnabled = import.meta.env.VITE_ORDER_AGENT_ENABLED === "true";

export default function OrderAgentWorkspaceGate({ children }) {
  if (!orderAgentEnabled) {
    return <OrderAgentUnavailable />;
  }
  return children;
}
