import { createRoot } from "react-dom/client";
import "./lib/i18n";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.unregister().then(() => {
        console.log("[SW] Unregistered stale service worker:", reg.scope);
      });
    }
  });
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        if (name.startsWith("dospresso-v") && !name.startsWith("dospresso-v12")) {
          caches.delete(name).then(() => {
            console.log("[SW] Deleted old cache:", name);
          });
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
    console.log("App rendered successfully");
  } catch (e) {
    console.error("App render error:", e);
    root.innerHTML = `<div style="padding: 20px; color: red;">Uygulama yukleme hatasi: ${e instanceof Error ? e.message : "Unknown error"}</div>`;
  }
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
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
