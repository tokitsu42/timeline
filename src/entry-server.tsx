import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import App from "./App";

export function render(pathname: string) {
  return renderToString(
    <StrictMode>
      <StaticRouter basename="/timeline" location={pathname}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
}
