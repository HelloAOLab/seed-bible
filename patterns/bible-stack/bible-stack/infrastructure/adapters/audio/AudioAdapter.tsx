import type { AudioConfigProvider } from "../../config/audio/AudioConfigProvider";
import type { Sound } from "../../config/audio/sounds";

interface AdapterParams {
  audioConfigProvider: AudioConfigProvider;
}

export class AudioAdapter {
  #audioConfigProvider: AdapterParams["audioConfigProvider"];

  constructor({ audioConfigProvider }: AdapterParams) {
    this.#audioConfigProvider = audioConfigProvider;
  }

  bufferSounds() {
    const keys = this.#audioConfigProvider.getSoundsKeys();
    for (const key of keys) {
      const soundUrl = this.#audioConfigProvider.getSound(key);
      const urls = Array.isArray(soundUrl) ? soundUrl : [soundUrl];
      for (const url of urls) {
        os.bufferSound(url);
      }
    }
  }

  playSound(sound: Sound) {
    const result = this.#audioConfigProvider.getSound(sound);
    const url = Array.isArray(result)
      ? result[Math.floor(Math.random() * result.length)]!
      : result;
    os.playSound(url);
  }
}
