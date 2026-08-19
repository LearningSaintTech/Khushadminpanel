import { apiConnector } from "../services/Apiconnector";

const BASE = "/admin/earnings";

async function loggedEarningsCall(label, method, url, runner) {
  console.log(`[Earnings] ${label} →`, { method, url });
  try {
    const res = await runner();
    console.log(`[Earnings] ${label} ←`, res);
    return res;
  } catch (err) {
    console.error(`[Earnings] ${label} ✕`, err);
    throw err;
  }
}

export const getEarningsPolicy = () =>
  loggedEarningsCall("get policy", "GET", `${BASE}/policy`, () =>
    apiConnector("GET", `${BASE}/policy`),
  );

export const updateEarningsPolicy = (body) =>
  loggedEarningsCall("update policy", "PATCH", `${BASE}/policy`, () =>
    apiConnector("PATCH", `${BASE}/policy`, body),
  );

export const getEarningsCommissions = (params = {}) =>
  loggedEarningsCall("list commissions", "GET", `${BASE}/commissions`, () =>
    apiConnector("GET", `${BASE}/commissions`, null, {}, params),
  );

export const getEarningsPayouts = (params = {}) =>
  loggedEarningsCall("list payouts", "GET", `${BASE}/payouts`, () =>
    apiConnector("GET", `${BASE}/payouts`, null, {}, params),
  );

export const payEarningsPayout = (payoutId, body = {}) => {
  const url = `${BASE}/payouts/${payoutId}/pay`;
  return loggedEarningsCall("mark payout paid", "PATCH", url, () =>
    apiConnector("PATCH", url, body),
  );
};

export const rejectEarningsPayout = (id, body = {}) =>
  loggedEarningsCall("reject payout", "PATCH", `${BASE}/payouts/${id}/reject`, () =>
    apiConnector("PATCH", `${BASE}/payouts/${id}/reject`, body),
  );

export const getEarningsAttribution = (params = {}) =>
  loggedEarningsCall("attribution lookup", "GET", `${BASE}/attribution`, () =>
    apiConnector("GET", `${BASE}/attribution`, null, {}, params),
  );

export const settleEarnings = (body = {}) =>
  loggedEarningsCall("settle", "POST", `${BASE}/settle`, () =>
    apiConnector("POST", `${BASE}/settle`, body),
  );
