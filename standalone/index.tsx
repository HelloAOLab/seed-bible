import { render } from "preact";

const app = document.getElementById("app");

if (!app) {
  throw new Error("App element not found");
}

render(
  <div>
    <h1>Aux Library</h1>
  </div>,
  app
);
