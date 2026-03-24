import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/themes.css";

// Apply saved theme before React mounts (prevents flash)
const savedTheme = localStorage.getItem("wf_theme") || "cafe-noturno";
document.documentElement.setAttribute("data-theme", savedTheme);

createRoot(document.getElementById("root")!).render(<App />);
