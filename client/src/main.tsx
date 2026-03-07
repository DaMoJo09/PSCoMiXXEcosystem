import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

try {
  const root = document.getElementById("root");
  if (root) {
    createRoot(root).render(<App />);
  }
} catch (e) {
  console.error("Failed to mount React app:", e);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = '<div style="min-height:100vh;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-family:sans-serif;"><div style="text-align:center;"><h1>Something went wrong</h1><p style="color:#888;">Please refresh the page to try again.</p><button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;background:#fff;color:#000;border:none;cursor:pointer;font-weight:bold;">Refresh</button></div></div>';
  }
}
