import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import storage from "redux-persist/lib/storage";
import rootReducer from "./Rootreducer";

/** Never persist access/refresh tokens — memory only; refresh cookie lives on server. */
const authTransform = createTransform(
  (inboundState) => {
    if (!inboundState || typeof inboundState !== "object") return inboundState;
    const { token, refreshToken, ...rest } = inboundState;
    return rest;
  },
  (outboundState) => ({
    ...(outboundState || {}),
    token: null,
    refreshToken: null,
  }),
  { whitelist: ["global"] }
);

const persistConfig = {
  key: "root",
  storage,
  whitelist: ["global"],
  transforms: [authTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const appStore = configureStore({
  reducer: persistedReducer,
  devTools: process.env.NODE_ENV !== "production",
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: { ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"] } }),
});

export const persistor = persistStore(appStore);
export default appStore;
