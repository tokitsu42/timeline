import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import "./styles.css";
import "./zoom.css";

hydrateRoot(
  document.getElementById("root")!,
  <StrictMode>
    <BrowserRouter basename="/timeline">
      <App />
    </BrowserRouter>
  </StrictMode>,
);
