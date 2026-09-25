import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer, createTransform } from "redux-persist";
import storage from "redux-persist/lib/storage";
import rootReducer from "./Rootreducer";

/**
 * Persist access token + role so refresh keeps the user logged in.
 * Do not persist refreshToken (httpOnly cookie on the API is the source of truth for rotation).
 */
const authTransform = createTransform(
  (inboundState) => {
    if (!inboundState || typeof inboundState !== "object") return inboundState;
    const { refreshToken, ...rest } = inboundState;
    return rest;
  },
  (outboundState) => ({
    ...(outboundState || {}),
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
