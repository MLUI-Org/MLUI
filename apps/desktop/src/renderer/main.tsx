import "@mlui/litegraph/litegraph.css";
import "@mlui/litegraph-addons/litegraph-addons.css";

import { createRoot } from "react-dom/client";

import "./styles.css";

import { App } from "./App";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Renderer root element was not found.");
}

createRoot(root).render(<App />);
