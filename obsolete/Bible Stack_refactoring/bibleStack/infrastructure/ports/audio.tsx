import type {
  Sound,
  soundsMap,
} from "bibleStack.infrastructure.config.audio.sounds";

export interface AudioConfigProviderPort {
  getSound: <K extends Sound>(sound: K) => (typeof soundsMap)[K];
  getSoundsKeys: () => Sound[];
}
