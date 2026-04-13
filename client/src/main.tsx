import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Apply system dark mode preference immediately
const darkModeMedia = window.matchMedia("(prefers-color-scheme: dark)");
if (darkModeMedia.matches) {
  document.documentElement.classList.add("dark");
}
// Listen for changes
darkModeMedia.addEventListener("change", (e) => {
  if (e.matches) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
});

// Expose toggle for header button
(window as any).__toggleTheme = () => {
  document.documentElement.classList.toggle("dark");
};

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(<App />);
