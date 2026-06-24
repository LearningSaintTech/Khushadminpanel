import "./utils/configureConsole.js";
import { warnIfProductionApiUrlMissing } from "./utils/apiConfig";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import { Toaster } from "react-hot-toast";
import App from "./App";
import "./index.css";
import appStore, { persistor } from "./redux/Appstore";
import { AuthSessionProvider } from "./context/AuthSessionContext";

warnIfProductionApiUrlMissing();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Provider store={appStore}>
      <PersistGate
        loading={
          <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-stone-600">
            Loading…
          </div>
        }
        persistor={persistor}
      >
        <AuthSessionProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <App />
          </BrowserRouter>
        </AuthSessionProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);
