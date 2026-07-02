import { computed, effect, signal } from "@preact/signals";
import { OnEditPlaylistName } from "ext_discover.helper.OnEditPlaylistName";
import { buildPlaylistFromAI } from "ext_discover.helper.buildPlaylistFromAI";
import {
  PREDEFINED_ICONS_OPTIONS,
  RECORD_STOREKEY,
} from "ext_discover.models.addNewPlaylist";
import {
  getAddNewPlaylistImportTabsVals,
  getAddNewPlaylistTabsVals,
  isActiveSheetImport as checkIsActiveSheetImport,
  isActiveTabManual,
} from "ext_discover.hooks.isActiveTabManual";
import type {
  AddNewPlaylistActionContext,
  AddNewPlaylistManager,
} from "ext_discover.interfaces.managers.AddNewPlaylistManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AddNewPlaylistManager>();

export function getAddNewPlaylistManager(scope: string): AddNewPlaylistManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAddNewPlaylistManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAddNewPlaylistManager(): AddNewPlaylistManager {
  const tabsVals = computed(() => getAddNewPlaylistTabsVals());
  const importTabsVal = computed(() => getAddNewPlaylistImportTabsVals());

  const showMoreOptions = signal(false);
  const activeTab = signal(t("createManually"));
  const tagName = signal("");
  const uploadedFileData = signal<any[]>([]);
  const importTab = signal(getAddNewPlaylistImportTabsVals()[0]);
  const isChecked = signal(false);
  const predefinedIcons = signal<string[]>(
    G.PREDEFINED_ICONS ? [...G.PREDEFINED_ICONS] : [...PREDEFINED_ICONS_OPTIONS]
  );
  const informationModal = signal(false);

  const isActiveSheetImport = computed(() =>
    checkIsActiveSheetImport(importTab.value, importTabsVal.value)
  );

  let mountedId: string | null = null;
  let mountCleanup: (() => void) | undefined;

  const setShowMoreOptions = (
    value: boolean | ((prev: boolean) => boolean)
  ) => {
    showMoreOptions.value =
      typeof value === "function" ? value(showMoreOptions.value) : value;
  };

  const setActiveTab = (tab: string) => {
    activeTab.value = tab;
  };

  const setTagName = (value: string) => {
    tagName.value = value;
  };

  const setUploadedFileData = (value: any[]) => {
    uploadedFileData.value = value;
  };

  const setImportTab = (tab: string) => {
    importTab.value = tab;
  };

  const setIsChecked = (value: boolean) => {
    isChecked.value = value;
  };

  const setPredefinedIcons = (
    value: string[] | ((prev: string[]) => string[])
  ) => {
    predefinedIcons.value =
      typeof value === "function" ? value(predefinedIcons.value) : value;
  };

  const setInformationModal = (value: boolean) => {
    informationModal.value = value;
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleImportTabChange = (tab: string) => {
    setUploadedFileData([]);
    setImportTab(tab);
  };

  const isButtomDisabled = (name: string | undefined, link: string) => {
    if (isChecked.value) return false;
    if (isActiveTabManual(activeTab.value)) return !name?.trim();
    return !link.trim() && !name?.trim();
  };

  const onImport = async (ctx: AddNewPlaylistActionContext) => {
    const {
      editId,
      parentId,
      name,
      selectedColor,
      customColor,
      selectedIcon,
      description,
      selectedTags,
      setOpenModalName,
      checkNameDuplicate,
      setLoading,
      onCreatePlaylist,
      handleSheetUrl,
      link,
    } = ctx;

    if (editId) {
      OnEditPlaylistName({
        parentId,
        id: editId,
        name,
        color: selectedColor,
        isCustomColor: customColor === selectedColor,
        icon: selectedIcon,
        description,
        selectedTags,
      });
      setOpenModalName(false);
      return;
    }
    if (!checkNameDuplicate()) {
      setLoading(true);
      if (isActiveSheetImport.value) {
        try {
          const dataRes = await handleSheetUrl(link);
          if (dataRes === null) return setLoading(false);
          onCreatePlaylist();
          setOpenModalName(false);
          setLoading(false);
        } catch (err) {
          setLoading(false);
        }
      } else {
        if (uploadedFileData.value.length > 0) {
          onCreatePlaylist();
          setUploadedFileData([]);
          setOpenModalName(false);
          setLoading(false);
        } else {
          ShowNotification({
            message: "Upload a File to Import Data!",
            severity: "error",
          });
        }
      }
    }
  };

  const onCreate = async (ctx: AddNewPlaylistActionContext) => {
    const {
      editId,
      parentId,
      name,
      selectedColor,
      customColor,
      selectedIcon,
      description,
      selectedTags,
      setOpenModalName,
      checkNameDuplicate,
      setLoading,
      setName,
      onCreatePlaylist,
      isLayers,
    } = ctx;

    if (editId) {
      OnEditPlaylistName({
        parentId,
        id: editId,
        name,
        color: selectedColor,
        isCustomColor: customColor === selectedColor,
        icon: selectedIcon,
        description,
        selectedTags,
      });
      setOpenModalName(false);
      return;
    }

    if (isLayers && selectedTags.length === 0) {
      ShowNotification({
        message: "Layers Should Have atleast One tag!",
        severity: "error",
      });
      return;
    }

    if (isChecked.value) {
      if (!description) {
        return ShowNotification({
          message: "Please fill description for auto generation!",
          severity: "error",
        });
      }
      setLoading(true);
      const { suggestedName, allItems } = await buildPlaylistFromAI({
        text: description,
      });
      if (!name) setName(suggestedName);
      if (checkNameDuplicate(name || suggestedName)) {
        setLoading(false);
        return;
      }
      if (!allItems?.length) {
        setLoading(false);
        return ShowNotification({
          message: "Couldn't auto find any items for the given description!",
          severity: "error",
        });
      }
      onCreatePlaylist();
      setOpenModalName(false);
      setLoading(false);
      return;
    }
    onCreatePlaylist();
    setOpenModalName(false);
  };

  const mount = (id: string) => {
    G.RECORD_STOREKEY = RECORD_STOREKEY;
    if (mountedId === id) return;

    mountCleanup?.();
    mountedId = id;

    const dispose = effect(() => {
      G.PREDEFINED_ICONS = predefinedIcons.value;
      G.setPredefinedIcons = setPredefinedIcons;
      G[`${id}namingPlaylist`] = true;
      G.savePlaylistProgress();
      return () => {
        G.setPredefinedIcons = true;
        G[`${id}namingPlaylist`] = false;
      };
    });

    mountCleanup = () => {
      dispose();
      mountedId = null;
    };
  };

  return {
    showMoreOptions,
    activeTab,
    tagName,
    uploadedFileData,
    importTab,
    isChecked,
    predefinedIcons,
    informationModal,
    tabsVals,
    importTabsVal,
    isActiveSheetImport,
    setShowMoreOptions,
    setActiveTab,
    setTagName,
    setUploadedFileData,
    setImportTab,
    setIsChecked,
    setPredefinedIcons,
    setInformationModal,
    handleTabChange,
    handleImportTabChange,
    isButtomDisabled,
    onImport,
    onCreate,
    mount,
  };
}
