import "./index.css";
import "./lib/i18n";

import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { applyColorFromStorage } from "./lib/color-presets";

// Apply saved accent color before first render to avoid flash
applyColorFromStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
