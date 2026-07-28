import { soundsMap, type Sound, Sounds } from "./sounds";

export class AudioConfigProvider {
  getSound<K extends Sound>(sound: K): (typeof soundsMap)[K] {
    return soundsMap[sound];
  }

  getSoundsKeys(): Sound[] {
    return Object.values(Sounds);
  }
}
