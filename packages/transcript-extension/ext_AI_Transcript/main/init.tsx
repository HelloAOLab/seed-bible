import { registerExtension } from "seed-bible";

export default function initAiTranscriptExtension() {
  registerExtension({
    id: "ext_AI_Transcript_UI",
    init: function* () {},
  });
}
