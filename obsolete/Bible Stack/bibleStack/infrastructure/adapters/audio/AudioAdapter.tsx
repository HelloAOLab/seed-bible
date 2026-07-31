import type { AudioConfigProviderPort } from "bibleStack.infrastructure.ports.audio";

interface AdapterParams {
  audioConfigProviderPort: AudioConfigProviderPort;
}

export class AudioAdapter {
  #audioConfigProviderPort: AdapterParams["audioConfigProviderPort"];

  constructor({ audioConfigProviderPort }: AdapterParams) {
    this.#audioConfigProviderPort = audioConfigProviderPort;
  }

  bufferSounds() {
    const keys = this.#audioConfigProviderPort.getSoundsKeys();
    for (const key of keys) {
      const soundUrl = this.#audioConfigProviderPort.getSound(key);
      const urls = Array.isArray(soundUrl) ? soundUrl : [soundUrl];
      for (const url of urls) {
        os.bufferSound(url);
      }
    }
  }
}
