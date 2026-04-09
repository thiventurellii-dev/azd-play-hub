import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// PWA: Guard against iframes and preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ("serviceWorker" in navigator) {
  // Force update: unregister any old SWs, then register our custom one
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    // Unregister all existing SWs (cleans up vite-plugin-pwa leftovers)
    await Promise.all(registrations.map((r) => r.unregister()));
    // Register fresh SW
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("SW registration failed:", err);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
