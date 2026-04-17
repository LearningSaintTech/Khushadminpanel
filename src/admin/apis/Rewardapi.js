import { apiConnector } from "../services/Apiconnector";

/**
 * ================================
 * REWARD RULES API ENDPOINTS
 * ================================
 */
export const rewardRulesEndpoints = {
  CREATE_REWARD_RULES: "/reward-rules/create",
  GET_REWARD_RULES: "/reward-rules/getAll",           // adjust if different
  UPDATE_REWARD_RULES: "/reward-rules/update",     // + /:id
  DELETE_REWARD_RULES: "/reward-rules/delete",     // + /:id (optional)
};

/**
 * ================================
 * CREATE REWARD RULES
 * ================================
 */
export const createRewardRules = async (data) => {
  try {
    console.log("📦 Creating reward rules:", data);

    const response = await apiConnector(
      "POST",
      rewardRulesEndpoints.CREATE_REWARD_RULES,
      data
    );

    console.log("✅ Create reward rules response:", response);
    return response;
  } catch (error) {
    console.error("❌ Create reward rules error:", error);
    throw error;
  }
};

/**
 * ================================
 * GET REWARD RULES
 * ================================
 */
export const getRewardRules = async () => {
  try {
    console.log("📥 Fetching reward rules");

    const response = await apiConnector(
      "GET",
      rewardRulesEndpoints.GET_REWARD_RULES
    );

    console.log("✅ Reward rules fetched:", response);
    return response;
  } catch (error) {
    console.error("❌ Get reward rules error:", error);
    throw error;
  }
};

/**
 * ================================
 * UPDATE REWARD RULES
 * ================================
 */
export const updateRewardRules = async (id, data) => {
  try {
    console.log("✏️ Updating reward rules:", { id, data });

    const response = await apiConnector(
      "PUT",
      `${rewardRulesEndpoints.UPDATE_REWARD_RULES}/${id}`,
      data
    );

    console.log("✅ Update reward rules response:", response);
    return response;
  } catch (error) {
    console.error("❌ Update reward rules error:", error);
    throw error;
  }
};

/**
 * ================================
 * DELETE REWARD RULES (OPTIONAL)
 * ================================
 */
export const deleteRewardRules = async (id) => {
  try {
    console.log("🗑️ Deleting reward rules:", id);

    const response = await apiConnector(
      "DELETE",
      `${rewardRulesEndpoints.DELETE_REWARD_RULES}/${id}`
    );

    console.log("✅ Delete reward rules response:", response);
    return response;
  } catch (error) {
    console.error("❌ Delete reward rules error:", error);
    throw error;
  }
};