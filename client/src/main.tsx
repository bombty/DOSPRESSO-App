import { createRoot } from "react-dom/client";
import "./lib/i18n";
import App from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found!");
} else {
  try {
    createRoot(root).render(<App />);
    console.log("✅ App rendered successfully");
  } catch (e) {
    console.error("❌ App render error:", e);
    root.innerHTML = `<div style="padding: 20px; color: red;">Uygulama yükleme hatası: ${e instanceof Error ? e.message : "Unknown error"}</div>`;
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((reg) => {
        console.log("[SW] Registered:", reg.scope);
      })
      .catch((err) => {
        console.log("[SW] Registration failed:", err);
      });
  });
}
