import { apiConnector } from "../services/Apiconnector";

export const giftCardRuleEndpoints = {
  CREATE_GIFT_CARD_RULE: "/gift-card/rules",
  GET_GIFT_CARD_RULES: "/gift-card/rules",
  GET_GIFT_CARD_RULE_BY_ID: "/gift-card/rules",
  UPDATE_GIFT_CARD_RULE: "/gift-card/rules",
  DELETE_GIFT_CARD_RULE: "/gift-card/rules",
  GET_ACTIVE_GIFT_CARD_RULES: "/gift-card/rules/active",
   TOGGLE_GIFT_CARD_RULE_STATUS: "/gift-card/rules",
};

// ✅ CREATE GIFT CARD RULE (multipart/form-data)
export const createGiftCardRule = (data) => {
  return apiConnector(
    "POST",
    giftCardRuleEndpoints.CREATE_GIFT_CARD_RULE,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

// ✅ GET ALL GIFT CARD RULES
export const getGiftCardRules = (
  page = 1,
  limit = 10,
  isActive
) => {
  const queryParams = {
    page,
    limit,
  };

  // ✅ only send isActive if provided
  if (isActive !== undefined) {
    queryParams.isActive = isActive;
  }

  console.log("📦 Get Gift Cards Query:", queryParams);

  return apiConnector(
    "GET",
    giftCardRuleEndpoints.GET_GIFT_CARD_RULES,
    null,
    null,
    queryParams
  );
};

// ✅ GET SINGLE GIFT CARD RULE BY ID
export const getGiftCardRuleById = (id) => {
  return apiConnector(
    "GET",
    `${giftCardRuleEndpoints.GET_GIFT_CARD_RULE_BY_ID}/${id}`
  );
};

// ✅ UPDATE GIFT CARD RULE
export const updateGiftCardRule = (id, data) => {
  return apiConnector(
    "PUT",
    `${giftCardRuleEndpoints.UPDATE_GIFT_CARD_RULE}/${id}`,
    data,
    {
      "Content-Type": "multipart/form-data",
    }
  );
};

// ✅ DELETE GIFT CARD RULE
export const deleteGiftCardRule = (id) => {
  return apiConnector(
    "DELETE",
    `${giftCardRuleEndpoints.DELETE_GIFT_CARD_RULE}/${id}`
  );
};

// ✅ GET ACTIVE GIFT CARD RULES
export const getActiveGiftCardRules = () => {
  return apiConnector(
    "GET",
    giftCardRuleEndpoints.GET_ACTIVE_GIFT_CARD_RULES
  );
};

export const toggleGiftCardRuleStatus = (id) => {
  console.log("🔄 Toggling Gift Card Status:", id);

  return apiConnector(
    "PATCH",
    `${giftCardRuleEndpoints.TOGGLE_GIFT_CARD_RULE_STATUS}/${id}/toggle-active`
  );
};