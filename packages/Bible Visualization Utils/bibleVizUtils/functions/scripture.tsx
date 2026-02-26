import type { Bot } from "../../../../typings/AuxLibraryDefinitions";

interface GroupBookData {
  isActive: boolean;
  piece: Bot;
}
type FindPreviousValidGroupBookDataType = (params: {
  arr: GroupBookData[];
  currentIndex: number;
}) => GroupBookData | null;

export const FindPreviousValidGroupBookData: FindPreviousValidGroupBookDataType =
  ({ arr, currentIndex }) => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const data = arr[i];
      if (data) {
        if (data.isActive && data.piece) {
          return data;
        }
      }
    }
    return null;
  };
