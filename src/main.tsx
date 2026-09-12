import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { basePath } from "./lib/paths";
import "./portfolio.css";
import "./scroll-polish.css";
import "./editorial-polish.css";

const Router = import.meta.env.VITE_PREVIEW ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router basename={basePath}>
      <App />
    </Router>
  </React.StrictMode>,
);
