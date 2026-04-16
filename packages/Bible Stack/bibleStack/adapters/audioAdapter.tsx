import { soundsMap, type Sound } from "bibleStack.data.sounds";

export function BufferSounds() {
  const keys = Object.keys(soundsMap) as Sound[];
  for (const key of keys) {
    const value = soundsMap[key];
    const urls = Array.isArray(value) ? value : [value];
    for (const url of urls) {
      os.bufferSound(url);
    }
  }
}
