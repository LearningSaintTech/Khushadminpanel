import { apiConnector } from "../services/Apiconnector";

export const faqEndpoints = {
  CREATE_FAQ: "/faq/create",
  GET_ALL_FAQS: "/faq/admin/getAll",
  GET_SINGLE_FAQ: "/faq/get",
  UPDATE_FAQ: "/faq/update",
  DELETE_FAQ: "/faq/delete",
};

// ================= CREATE FAQ =================
export const createFaq = async (data) => {
  try {
    const response = await apiConnector(
      "POST",
      faqEndpoints.CREATE_FAQ,
      data
    );

    console.log("CREATE FAQ RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("CREATE FAQ ERROR:", error);
    throw error;
  }
};

// ================= GET ALL FAQS =================
export const getAllFaqs = async (
  page = 1,
  limit = 20,
  search = "",
  topic = ""
) => {
  try {
    let url = `${faqEndpoints.GET_ALL_FAQS}?page=${page}&limit=${limit}`;

    if (search?.trim()) {
      url += `&search=${encodeURIComponent(search.trim())}`;
    }

    if (topic?.trim()) {
      url += `&topic=${encodeURIComponent(topic.trim())}`;
    }

    const response = await apiConnector("GET", url);

    console.log("GET ALL FAQS RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("GET FAQS ERROR:", error);
    throw error;
  }
};

// ================= GET SINGLE FAQ =================
export const getSingleFaq = async (faqId) => {
  try {
    const response = await apiConnector(
      "GET",
      `${faqEndpoints.GET_SINGLE_FAQ}/${faqId}`
    );

    console.log("GET SINGLE FAQ RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("GET SINGLE FAQ ERROR:", error);
    throw error;
  }
};

// ================= UPDATE FAQ =================
export const updateFaq = async (faqId, data) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${faqEndpoints.UPDATE_FAQ}/${faqId}`,
      data
    );

    console.log("UPDATE FAQ RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("UPDATE FAQ ERROR:", error);
    throw error;
  }
};

// ================= DELETE FAQ =================
export const deleteFaq = async (faqId) => {
  try {
    const response = await apiConnector(
      "DELETE",
      `${faqEndpoints.DELETE_FAQ}/${faqId}`
    );

    console.log("DELETE FAQ RESPONSE:", response);

    return response;
  } catch (error) {
    console.error("DELETE FAQ ERROR:", error);
    throw error;
  }
};