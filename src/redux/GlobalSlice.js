import { createSlice } from "@reduxjs/toolkit";
import {
  clearAdminOtpSessionStorage,
  clearDesignerSessionStorage,
  clearSupportAgentSessionStorage,
  clearOrderAgentSessionStorage,
} from "../utils/authRole";
import { clearLegacyAuthStorage } from "../utils/apiConfig";

const initialState = {
  loading: false,
  error: null,
  token: null,
  role: null,
  user: null,
};

const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    setToken: (state, action) => {
      const payload = action.payload;
      const accessToken =
        typeof payload === "string" ? payload : payload?.accessToken ?? null;
      state.token = accessToken;
    },

    setRole: (state, action) => {
      state.role = action.payload;
    },

    setUser: (state, action) => {
      state.user = action.payload;
    },

    logout: (state) => {
      state.token = null;
      state.role = null;
      state.user = null;
      clearLegacyAuthStorage();
      sessionStorage.removeItem("influencer_userId");
      localStorage.removeItem("userId");
      localStorage.removeItem("influencer");
      clearDesignerSessionStorage();
      clearAdminOtpSessionStorage();
      clearSupportAgentSessionStorage();
      clearOrderAgentSessionStorage();
    },
  },
});

export const {
  setLoading,
  setError,
  clearError,
  setToken,
  setRole,
  setUser,
  logout,
} = globalSlice.actions;

export default globalSlice.reducer;
