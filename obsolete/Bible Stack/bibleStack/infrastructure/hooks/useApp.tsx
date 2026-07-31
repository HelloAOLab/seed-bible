const { useEffect } = os.appHooks;

import { useTabsContext } from "app.hooks.tabs";
import { useBibleContext } from "app.hooks.bibleVariables";

type UseApp = () => void;

export const useApp: UseApp = () => {
  const { navFunctions } = useBibleContext();
  const { spaces, activeSpace, tabs, activeTab, setActiveTab } =
    useTabsContext();

  useEffect(() => {
    shout("OnTabsContextChanged", {
      spaces,
      activeSpace,
      tabs,
      activeTab,
      setActiveTab,
      navFunctions,
    });
  }, [spaces, activeSpace, tabs, activeTab, setActiveTab, navFunctions]);
};
