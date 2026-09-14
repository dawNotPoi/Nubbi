import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { message } from "antd";

import "tippy.js/dist/tippy.css";
import App from "./App.tsx";
import "./index.css";
import "./theme.css";

message.config({ maxCount: 3 });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
