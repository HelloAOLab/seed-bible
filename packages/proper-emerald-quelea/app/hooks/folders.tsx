import { useState } from 'react';

export function useFolderTabs(initialFolders = []) {
    const [folders, setFolders] = useState(initialFolders);

    const addFolder = (folder) => {
        setFolders((prev) => [...prev, folder]);
    };

    const removeFolder = (folderId) => {
        setFolders((prev) => prev.filter((folder) => folder.id !== folderId));
    };

    const addTabToFolder = (folderId, tab) => {
        setFolders((prev) =>
            prev.map((folder) =>
                folder.id === folderId
                    ? { ...folder, tabs: [...folder.tabs, tab] }
                    : folder
            )
        );
    };

    const removeTabFromFolder = (folderId, tabId) => {
        setFolders((prev) =>
            prev.map((folder) =>
                folder.id === folderId
                    ? { ...folder, tabs: folder.tabs.filter((tab) => tab.id !== tabId) }
                    : folder
            )
        );
    };

    const updateTabInFolder = (folderId, tabId, newData) => {
        setFolders((prev) =>
            prev.map((folder) =>
                folder.id === folderId
                    ? {
                        ...folder,
                        tabs: folder.tabs.map((tab) =>
                            tab.id === tabId ? { ...tab, data: newData } : tab
                        )
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
