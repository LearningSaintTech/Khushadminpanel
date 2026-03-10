import { apiConnector } from "../services/Apiconnector";

export const subAdminEndpoints = {
  CREATE_SUBADMIN: "/admin/panels/subadmin/create",
  LIST_SUBADMIN: "/admin/panels/subadmin/list",
  UPDATE_SUBADMIN: "/admin/panels/subadmin",
  TOGGLE_STATUS: "/admin/panels/subadmin",
};

// ================= CREATE =================
export const createSubAdmin = (data) => {
  console.log("🚀 Creating SubAdmin:", data);
  return apiConnector("POST", subAdminEndpoints.CREATE_SUBADMIN, data);
};

// ================= LIST =================
export const getSubAdmins = (
  page = 1,
  limit = 10,
  search = "",
  isActive
) => {
  const queryParams = new URLSearchParams();

  queryParams.append("page", page);
  queryParams.append("limit", limit);

  if (search) {
    queryParams.append("search", search);
  }

  if (isActive !== undefined) {
    queryParams.append("isActive", isActive);
  }

  console.log("📥 Fetching SubAdmins:", queryParams.toString());

  return apiConnector(
    "GET",
    `${subAdminEndpoints.LIST_SUBADMIN}?${queryParams.toString()}`
  );
};

// ================= UPDATE =================
export const updateSubAdmin = (id, data) => {
  console.log("✏️ Updating SubAdmin:", id);
  return apiConnector(
    "PUT",
    `${subAdminEndpoints.UPDATE_SUBADMIN}/${id}/update`,
    data
  );
};

// ================= TOGGLE =================
export const toggleSubAdminStatus = (id) => {
  console.log("🔄 Toggling Status:", id);
  return apiConnector(
    "PUT",
    `${subAdminEndpoints.TOGGLE_STATUS}/${id}/toggle-status`
  );
};

/**
 * =====================================
 * 🔹 GET SUB ADMIN BY ID
 * =====================================
 */
export const getSubAdminById = async (id) => {
  console.log("📥 Fetching SubAdmin By ID:", id);

  try {
    const response = await apiConnector(
      "GET",
      `/admin/panels/subadmin/${id}`
    );

    console.log("✅ Get SubAdmin By ID Response:", response);
    return response;
  } catch (error) {
    console.error("❌ Get SubAdmin By ID Error:", error);
    throw error;
  }
};
