import { useState } from "react";

export function useFolderTabs(initialFolders: any = []) {
  const [folders, setFolders] = useState(initialFolders);

  const addFolder = (folder: any) => {
    setFolders((prev: any) => [...prev, folder]);
  };

  const removeFolder = (folderId: any) => {
    setFolders((prev: any) => prev.filter((folder) => folder.id !== folderId));
  };

  const addTabToFolder = (folderId: any, tab: any) => {
    setFolders((prev: any) =>
      prev.map((folder) =>
        folder.id === folderId
          ? { ...folder, tabs: [...folder.tabs, tab] }
          : folder
      )
    );
  };

  const removeTabFromFolder = (folderId: any, tabId: any) => {
    setFolders((prev: any) =>
      prev.map((folder: any) =>
        folder.id === folderId
          ? {
              ...folder,
              tabs: folder.tabs.filter((tab: any) => tab.id !== tabId),
            }
          : folder
      )
    );
  };

  const updateTabInFolder = (folderId, tabId: any, newData: any) => {
    setFolders((prev: any) =>
      prev.map((folder: any) =>
        folder.id === folderId
          ? {
              ...folder,
              tabs: folder.tabs.map((tab) =>
                tab.id === tabId ? { ...tab, data: newData } : tab
              ),
            }
          : folder
      )
    );
  };

  return {
    folders,
    addFolder,
    removeFolder,
    addTabToFolder,
    removeTabFromFolder,
    updateTabInFolder,
  };
}
