import {
  soundsMap,
  type Sound,
  Sounds,
} from "bibleStack.infrastructure.config.audio.sounds";
import type { AudioConfigProviderPort } from "bibleStack.infrastructure.ports.audio";

export class AudioConfigProvider implements AudioConfigProviderPort {
  getSound<K extends Sound>(sound: K): (typeof soundsMap)[K] {
    return soundsMap[sound];
  }

  getSoundsKeys(): Sound[] {
    return Object.values(Sounds);
  }
}
