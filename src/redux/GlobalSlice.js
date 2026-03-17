import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
  error: null,
  token: null,
  refreshToken: null,
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
      const refreshToken =
        typeof payload === "object" && payload?.refreshToken
          ? payload.refreshToken
          : null;
      state.token = accessToken;
      state.refreshToken = refreshToken || state.refreshToken;
      if (accessToken) {
        localStorage.setItem("token", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      }
    },

    setRole: (state, action) => {
      state.role = action.payload;
      if (action.payload) {
        localStorage.setItem("role", action.payload);
        localStorage.setItem("userRole", action.payload);
      }
    },

    setUser: (state, action) => {
      state.user = action.payload;
    },

    logout: (state) => {
      state.token = null;
      state.refreshToken = null;
      state.role = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("userRole");
      localStorage.removeItem("admin_userId");
      localStorage.removeItem("admin_phone");
      localStorage.removeItem("userId");
      localStorage.removeItem("influencer");
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