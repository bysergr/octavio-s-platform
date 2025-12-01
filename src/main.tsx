import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import backgroundTropical from "./assets/background-tropical.png";

// Apply background image to body
document.body.style.backgroundImage = `url(${backgroundTropical})`;
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";
document.body.style.backgroundAttachment = "fixed";

createRoot(document.getElementById("root")!).render(<App />);
