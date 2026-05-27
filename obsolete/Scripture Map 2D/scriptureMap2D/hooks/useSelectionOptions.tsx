import { useSideBarContext } from "app.hooks.sideBar";

interface UseSelectionOptionsType {
  clearSelectionContent: string;
  acceptSelectionContent: string;
}

type UseSelectionOptions = () => UseSelectionOptionsType;

export const useSelectionOptions: UseSelectionOptions = () => {
  const { t } = useSideBarContext();

  return {
    clearSelectionContent: t("clearSelection"),
    acceptSelectionContent: t("done"),
  };
};
