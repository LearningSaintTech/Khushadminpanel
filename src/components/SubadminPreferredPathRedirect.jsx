import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { decodeTokenRole, normalizeRole } from "../utils/authRole";

/**
 * Subadmin / super_subadmin should use /subadmin/* URLs. Many screens still call
 * navigate("/admin/...") — rewrite those to /subadmin/... so layout + permissions stay correct.
 */
export default function SubadminPreferredPathRedirect() {
  const location = useLocation();
  const navigate = useNavigate();
  const reduxRole = useSelector((s) => s.global?.role);
  const token = useSelector((s) => s.global?.token);
  const role = normalizeRole(
    reduxRole ||
      decodeTokenRole(token) ||
      decodeTokenRole(
        typeof window !== "undefined" ? localStorage.getItem("token") : null,
      ),
  );

  useEffect(() => {
    if (role !== "SUBADMIN") return;

    const p = location.pathname;
    if (!p.startsWith("/admin")) return;
    // Keep admin auth entry points (if ever used with subadmin token)
    if (p === "/admin" || p === "/admin/otp") return;

    const next = p.replace(/^\/admin/, "/subadmin");
    if (next !== p) navigate(next, { replace: true });
  }, [location.pathname, role, navigate]);

  return null;
}
