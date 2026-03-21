import { createRoot } from "react-dom/client";
import "./lib/i18n";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister();
    }
  });
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.startsWith("dospresso-v") && !name.startsWith("dospresso-v13")) {
          caches.delete(name);
        }
      }
    });
  }
}

const root = document.getElementById("root");
if (!root) {
  console.error("Root element not found!");
} else {
  try {
    createRoot(root).render(<App />);
  } catch (e) {
    console.error("App render error:", e);
    root.innerHTML = `<div style="padding: 20px; color: red;">Uygulama yukleme hatasi: ${e instanceof Error ? e.message : "Unknown error"}</div>`;
  }
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => {
        console.error("[SW] Registration failed:", err);
      });
  });
}
