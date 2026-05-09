import type { Piece } from "bibleVizUtils.domain.models.canvas";

export function FindPreviousValidGroupBookData<
  T extends { piece: Piece | undefined; isActive: boolean },
>(params: { arr: T[]; currentIndex: number }): (T & { piece: Piece }) | null {
  const { arr, currentIndex } = params;
  for (let i = currentIndex - 1; i >= 0; i--) {
    const data = arr[i];
    if (data?.isActive && data.piece) {
      return data as T & { piece: Piece };
    }
  }
  return null;
}
