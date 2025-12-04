const { render } = os.appHooks;
import App from "aiApps.painter.App";

let prevPainter = document.getElementById("painter-container");

if (prevPainter) {
  prevPainter.remove();
} else {
  let painterDiv = document.createElement("div");

  painterDiv.id = "painter-container";

  painterDiv.className = "painter";

  document.body.appendChild(painterDiv);

  render(<App />, document.getElementById("painter-container"));
}
