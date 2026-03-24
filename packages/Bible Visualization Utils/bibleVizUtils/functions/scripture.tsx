import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

export function FindPreviousValidGroupBookData<
  T extends { piece: Bot | undefined; isActive: boolean },
>(params: { arr: T[]; currentIndex: number }): (T & { piece: Bot }) | null {
  const { arr, currentIndex } = params;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const data = arr[i];
    if (data?.isActive && data.piece) {
      return data as T & { piece: Bot };
    }
  }
  return null;
}
