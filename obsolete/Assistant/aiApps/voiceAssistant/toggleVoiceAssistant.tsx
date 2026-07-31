const { render } = os.appHooks;

import App from "aiApps.voiceAssistant.VoiceAssistant";

let prevPainter = document.getElementById("voiceAssistant-container");

if (prevPainter) {
  if (globalThis?.AISetStart) {
    AISetStart(false);
    await os.sleep(200);
  }
  prevPainter.remove();
} else {
  let painterDiv = document.createElement("div");

  painterDiv.id = "voiceAssistant-container";

  painterDiv.className = "voiceAssistant";

  document.body.appendChild(painterDiv);

  render(<App />, document.getElementById("voiceAssistant-container"));
}
