import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { App } from "./app/App";
import "./styles/global.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("StateTrace could not find the application root.");
}

createRoot(root).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
);
