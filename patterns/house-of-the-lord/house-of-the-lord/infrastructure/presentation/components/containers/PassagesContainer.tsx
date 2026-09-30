import { usePassagesContainer } from "../../hooks/usePassagesContainer";
import { PassagesGroup, type PassagesGroupProps } from "../ui/PassagesGroup";
import type { PassageRow } from "./Passage";

export interface NavMenuPassages {
  inChapter: PassageRow[];
  elsewhere: PassageRow[];
}

export interface PassagesGroupData extends PassagesGroupProps {
  key: string;
}

export interface UsePassagesContainerType {
  isEmpty: boolean;
  emptyText: string;
  passagesGroups: PassagesGroupData[];
}

export const PassagesContainer = () => {
  const { isEmpty, emptyText, passagesGroups } = usePassagesContainer();

  if (isEmpty) {
    return <p className="hotl-empty">{emptyText}</p>;
  }

  return (
    <>
      {passagesGroups.map((passagesGroup) => (
        <PassagesGroup {...passagesGroup} />
      ))}
    </>
  );
};
