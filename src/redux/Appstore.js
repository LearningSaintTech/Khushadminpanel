import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./Rootreducer";

const appStore = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== "production",
});

export default appStore;
