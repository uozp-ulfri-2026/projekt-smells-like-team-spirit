import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
{/*     <ConvexProvider client={convex}>
     
    </ConvexProvider> */}
     <App />
  </StrictMode>,
);
