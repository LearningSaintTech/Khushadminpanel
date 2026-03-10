import { createSlice } from "@reduxjs/toolkit";

const tokenFromStorage = localStorage.getItem("token");
const roleFromStorage = localStorage.getItem("role");

const initialState = {
  loading: false,
  error: null,
  token: tokenFromStorage || null,
  role: roleFromStorage || null,
  user: null, // optional (decoded user info)
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
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
      console.log("[Redux] Token stored");
    },

    setRole: (state, action) => {
      state.role = action.payload;
      localStorage.setItem("role", action.payload);
      console.log("[Redux] Role stored:", action.payload);
    },

    setUser: (state, action) => {
      state.user = action.payload;
    },

    logout: (state) => {
      state.token = null;
      state.role = null;
      state.user = null;
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      console.log("[Redux] Logged out");
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