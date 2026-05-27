const { render } = os.appHooks;
import App from "aiApps.painter.App";

const prevPainter = document.getElementById("painter-container");

if (!prevPainter) {
  const painterDiv = document.createElement("div");

  painterDiv.id = "painter-container";

  painterDiv.className = "painter";

  document.body.appendChild(painterDiv);

  const container = document.getElementById("painter-container");
  if (container) {
    render(<App />, container);
  }
}
