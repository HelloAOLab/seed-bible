import { computed, effect, signal, untracked } from "@preact/signals";
import { filterOutValidItemFromJSON } from "ext_discover.helper.filterOutValidItemFromJSON";
import { getSuggestedListItems } from "ext_discover.helper.getSuggestedListItems";
import { getFilteredAttachTags } from "ext_discover.hooks.getFilteredAttachTags";
import { getAttachLinkTags } from "ext_discover.hooks.getAttachLinkTags";
import { getCurrentTime } from "ext_discover.hooks.getCurrentTime";
import { readFileAsText } from "ext_discover.hooks.readFileAsText";
import { toPlainFile } from "ext_discover.hooks.toPlainFile";
import { RECORDING_VALUE } from "ext_discover.models.attachLink";
import { RECORD_STOREKEY } from "ext_discover.models.addNewPlaylist";
import type { AttachLinkProps } from "ext_discover.interfaces.components.AttachLink";
import type { AttachLinkManager } from "ext_discover.interfaces.managers.AttachLinkManager";

const G = globalThis as Record<string, any>;

const managersByScope = new Map<string, AttachLinkManager>();

export function getAttachLinkManager(scope: string): AttachLinkManager {
  const existing = managersByScope.get(scope);
  if (existing) return existing;

  const manager = createAttachLinkManager();
  managersByScope.set(scope, manager);
  return manager;
}

export function createAttachLinkManager(): AttachLinkManager {
  const tags = getAttachLinkTags();
  const GAny = G;

  const loading = signal(false);
  const selectedType = signal(GAny.isScreenRecording ? "RECORDING" : tags[0]);
  const textType = signal("heading");
  const mediaType = signal("youtube");
  const data = signal<any>(null);
  const linkState = signal<any>(false);
  const name = signal("");
  const link = signal("");
  const isQuotedText = signal(GAny.RetainDataIsQuoteText || false);
  const recordingType = signal(GAny.isScreenRecording ? "video" : "audio");
  const dragState = signal({ isDragOver: false });
  const dragRefElement = signal<HTMLElement | null>(null);
  const datePickerElement = signal<HTMLElement | null>(null);

  const editMode = signal(false);
  const canRecord = signal(true);
  const canClose = signal(false);
  const isDate = signal(false);
  const isTags = signal(false);
  const isPlaylist = signal(false);
  const onClose = signal<(() => void) | undefined>(undefined);
  const onAddTags = signal<((tags: string[]) => void) | undefined>(undefined);
  const massAdd = signal<((items: any[]) => void) | undefined>(undefined);
  const attachLinkFn = signal<
    ((name: string, link: any, meta?: Record<string, any>) => void) | undefined
  >(undefined);
  const onDateClick = signal<((date: string) => void) | undefined>(undefined);

  let dragCounter = 0;
  let propsInitialized = false;
  let mountedScope: string | null = null;
  let mountCleanup: (() => void) | undefined;

  const isLoggedIn = computed(() => !!authBot?.id);

  const playlists = computed(() => GAny[`${"default"}playlists`] || []);

  const playlistListOptions = computed(() => [
    { label: "Select Playlist", value: "" },
    ...playlists.value.map((ele: any) => ({ label: ele.name, value: ele.id })),
  ]);

  const filteredTags = computed(() =>
    getFilteredAttachTags({
      isLoggedIn: isLoggedIn.value,
      isPlaylist: isPlaylist.value,
      isTags: isTags.value,
      isDate: isDate.value,
      canRecord: canRecord.value,
    })
  );

  const isDisabled = computed(() => {
    if (!name.value.trim()) {
      if (
        !(
          selectedType.value === "SCRIPTURE" &&
          Array.isArray(data.value) &&
          data.value?.length > 0
        ) &&
        selectedType.value !== "LINK"
      ) {
        return true;
      }
    }
    return false;
  });

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const setSelectedType = (value: string) => {
    selectedType.value = value;
  };

  const setTextType = (value: string) => {
    textType.value = value;
  };

  const setMediaType = (value: string) => {
    mediaType.value = value;
  };

  const setData = (value: any | ((prev: any) => any)) => {
    data.value = typeof value === "function" ? value(data.value) : value;
  };

  const setLinkState = (value: any) => {
    linkState.value = value;
  };

  const setName = (value: string) => {
    name.value = value;
  };

  const setLink = (value: string) => {
    link.value = value;
  };

  const setIsQuotedText = (value: boolean) => {
    isQuotedText.value = value;
  };

  const setRecordingType = (value: string) => {
    recordingType.value = value;
  };

  const setDragRef = (el: HTMLElement | null) => {
    dragRefElement.value = el;
  };

  const setDatePickerRef = (el: HTMLElement | null) => {
    datePickerElement.value = el;
  };

  const onRetainData = () => {
    GAny.RetainData = true;
    GAny.RetainDataName = name.value;
    GAny.RetainDataData = data.value;
    GAny.RetainDataLink = link.value;
    GAny.RetainDataMediaType = mediaType.value;
    GAny.RetainDataTextType = textType.value;
    GAny.RetainDataRecordingType = recordingType.value;
    GAny.RetainDataSelectedType = selectedType.value;
    GAny.RetainDataLinkState = linkState.value;
  };

  const onReleaseData = () => {
    setTimeout(() => {
      GAny.RetainData = false;
      GAny.RetainDataName = null;
      GAny.RetainDataData = null;
      GAny.RetainDataLink = null;
      GAny.RetainDataMediaType = null;
      GAny.RetainDataTextType = null;
      GAny.RetainDataRecordingType = null;
      GAny.RetainDataIsQuoteText = null;
    }, 100);
  };

  const onRestoreData = () => {
    if (
      GAny.RetainData &&
      !data.value &&
      !name.value &&
      !GAny.StopAttachLinkRetainData
    ) {
      const isSelectedTypePresent = filteredTags.value.find(
        (ele: string) => ele === GAny.RetainDataSelectedType
      );
      if (!isSelectedTypePresent) {
        return;
      }
      setName(GAny.RetainDataName);
      setData(GAny.RetainDataData);
      setLink(GAny.RetainDataLink);
      setMediaType(GAny.RetainDataMediaType);
      setTextType(GAny.RetainDataTextType);
      setRecordingType(GAny.RetainDataRecordingType);
      setSelectedType(GAny.RetainDataSelectedType);
      setLinkState(GAny.RetainDataLinkState);
      setIsQuotedText(GAny.RetainDataIsQuoteText);
      onReleaseData();
    }
    GAny.StopAttachLinkRetainData = false;
  };

  const onAddFiles = async (files: any[]) => {
    setLoading(true);
    let failCount = 0;
    const tempData: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        if (file?.mimeType === "application/json") {
          const playlistImportedData = await JSON.parse(file.data);
          const filterdArray = filterOutValidItemFromJSON(playlistImportedData);
          if (filterdArray.length) {
            tempData.push({
              id: GAny.createUUID(),
              ...file,
              content: file.name,
              additionalInfo: {
                mimeType: file.mimeType,
              },
              data: [...filterdArray],
            });
          } else {
            failCount++;
          }
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
        console.log(t("UPLOAEDJSONERROR"), err);
      }
    }
    setLoading(false);
    if (failCount > 0) {
      ShowNotification({
        message: `${t("fileRejectedForNotBeingValidJSON", { count: failCount })}`,
        severity: "error",
      });
    }

    setData((prev: any) => [...(Array.isArray(prev) ? prev : []), ...tempData]);
  };

  const deleteFromList = (id: string) => {
    if (Array.isArray(data.value)) {
      setData((prev: any) => prev.filter((ele: any) => ele.id !== id));
    }
  };

  const onClickSend = async (isForce = true) => {
    let finalName = name.value;

    if (isForce && !name.value.trim()) {
      finalName = getCurrentTime();
      switch (selectedType.value) {
        case "RECORDING":
          if (recordingType.value === "video") {
            finalName += "-video-recording";
          } else {
            finalName += "-audio-recording";
          }
          break;
        default:
          finalName = name.value;
          break;
      }
    }

    if (!finalName.trim()) {
      if (
        !(
          selectedType.value === "SCRIPTURE" &&
          Array.isArray(data.value) &&
          data.value?.length > 0
        ) &&
        selectedType.value !== "LINK"
      ) {
        return ShowNotification({
          message: t("attachmentNameMissing"),
          severity: "error",
        });
      }
    }

    if (selectedType.value === "TAG") {
      if (onAddTags.value) {
        onAddTags.value([finalName]);
        setName("");
      }
      return;
    }

    if (selectedType.value === "RECORDING") {
      if (!data.value)
        return ShowNotification({
          message: t("recordSomethingToSaveRecording"),
          severity: "error",
        });
      setData(null);
      setName("");
      setSelectedType("TEXT");
      setLink("");
      setLoading(true);

      const finalData = data.value;

      const fileSave: any = await os.recordFile(
        GAny.RECORD_STOREKEY || RECORD_STOREKEY,
        finalData,
        {
          name: finalName,
          mimeType: finalData?.type || "audio/webm",
        }
      );

      const url = fileSave.url || fileSave?.existingFileUrl;

      setLoading(false);

      if (!url) {
        return ShowNotification({
          message: t("failedToUpload"),
          severity: "error",
        });
      }
      onReleaseData();
      GAny.RetainDataName = "";
      GAny.isRecording = false;
      GAny.hasRecording = false;
      return attachLinkFn.value?.(finalName, url, {
        isValid: true,
        type:
          recordingType.value === "audio" ? RECORDING_VALUE : "video-recording",
      });
    }

    if (selectedType.value === "FILE_UPLOAD") {
      if (!Array.isArray(data.value) || data.value?.length < 1) {
        return ShowNotification({
          message: t("noFilesUploaded"),
          severity: "error",
        });
      } else {
        const uploadData = data.value;
        setData(null);
        setName("");
        setSelectedType("TEXT");
        setLink("");
        massAdd.value?.(uploadData);
        onReleaseData();
        GAny.isRecording = false;
        GAny.hasRecording = false;
        onClose.value?.();
        return;
      }
    }

    if (selectedType.value === "PLAYLIST") {
      if (!data.value)
        return ShowNotification({
          message: t("selectAPlaylistToAnnotate"),
          severity: "error",
        });
      const playlistList: any = playlists.value.find(
        (ele: any) => ele.id === data.value
      );
      onReleaseData();
      GAny.isRecording = false;
      GAny.hasRecording = false;
      attachLinkFn.value?.(playlistList.name, playlistList.list, {
        isValid: true,
        type: "playlist",
      });
      return;
    }

    if (selectedType.value === "LINK") {
      const results: any = GAny.validateUrl(link.value);
      if (!results.isValid) {
        return ShowNotification({
          message: t("invalidLinkFormat"),
          severity: "error",
        });
      } else {
        setData(null);
        setName("");
        setSelectedType("TEXT");
        setLink("");
        onReleaseData();
        GAny.isRecording = false;
        GAny.hasRecording = false;
        attachLinkFn.value?.(
          finalName || link.value,
          link.value,
          linkState.value.type
            ? linkState.value
            : { isValid: true, type: mediaType.value }
        );
      }
    }

    if (selectedType.value === "SCRIPTURE") {
      const allItems: any[] = [];
      if (Array.isArray(data.value)) {
        data.value.forEach((file) => {
          allItems.push(...file.data);
        });
      }
      if (finalName.trim()) {
        allItems.push(...getSuggestedListItems({ searchText: finalName }));
      }
      setName("");
      massAdd.value?.(allItems);
      setData(null);
      onReleaseData();
      GAny.isRecording = false;
      GAny.hasRecording = false;
      return;
    }

    if (selectedType.value === "TEXT") {
      setData(null);
      setName("");
      setSelectedType("TEXT");
      setLink("");
      const isTempID = "attachfile";
      if (GAny[`${isTempID}ClearEditorContent`])
        GAny[`${isTempID}ClearEditorContent`]();
      GAny.RawName = "";
      onReleaseData();
      GAny.isRecording = false;
      GAny.hasRecording = false;
      return attachLinkFn.value?.(finalName, link.value, {
        isValid: true,
        subType: textType.value,
        type: "text",
        isQuotedText: isQuotedText.value,
      });
    }
  };

  const handleTypeSwitch = (ele: string) => {
    let dontAllowSwitch = false;
    if (
      data.value ||
      (name.value && selectedType.value.toUpperCase() === "TEXT") ||
      (link.value && GAny.LINKS_TYPES[selectedType.value.toUpperCase()])
    ) {
      dontAllowSwitch = true;
    }
    if (dontAllowSwitch) {
      if (!GAny.AllowSwitchBetweenTypes) {
        GAny.AllowSwitchBetweenTypes = true;
        ShowNotification({
          message: t(
            "youHaveAttachDataToTheAttachmentItWillbeLostClickAgainToSwtich"
          ),
          severity: "error",
        });
        return;
      }
    }
    GAny.AllowSwitchBetweenTypes = false;
    if (editMode.value)
      return ShowNotification({
        message: t("cannotChangeWhileBeingInEditMode"),
        severity: "error",
      });
    if (ele === "DATE" && !!onDateClick.value) {
      datePickerElement.value?.click();
      return;
    }
    setName("");
    setSelectedType(ele);
    setData(null);
    GAny.hasRecording = false;
  };

  const handleClose = () => {
    onReleaseData();
    setName("");
    GAny.RetainDataData = null;
    GAny.RetainDataName = null;
    GAny.isRecording = false;
    GAny.hasRecording = false;
    onClose.value?.();
  };

  const syncProps = (props: AttachLinkProps) => {
    editMode.value = props.editMode ?? false;
    canRecord.value = props.canRecord ?? true;
    canClose.value = props.canClose ?? false;
    isDate.value = props.isDate ?? false;
    isTags.value = props.isTags ?? false;
    isPlaylist.value = props.isPlaylist ?? false;
    onClose.value = props.onClose;
    onAddTags.value = props.onAddTags;
    massAdd.value = props.massAdd;
    attachLinkFn.value = props.attachLink;
    onDateClick.value = props.onDateClick;

    if (!propsInitialized) {
      if (props.sSelectedType) {
        selectedType.value = props.sSelectedType;
      }
      if (props.sMediaType) {
        mediaType.value = props.sMediaType;
      }
      if (props.sData) {
        data.value = props.sData;
      }
      if (props.sName) {
        name.value = props.sName;
      } else if (selectedType.value === "TEXT") {
        name.value = GAny.RawName || "";
      }
      if (props.sLink) {
        link.value = props.sLink;
      }
      if (props.sIsQuotedText) {
        isQuotedText.value = props.sIsQuotedText;
      }
      propsInitialized = true;
    }
  };

  const mount = (scope: string) => {
    GAny.RECORD_STOREKEY = RECORD_STOREKEY;
    if (mountedScope === scope) return;

    mountCleanup?.();
    mountedScope = scope;

    const disposers: (() => void)[] = [];

    disposers.push(
      effect(() => {
        const el = datePickerElement.value;
        if (el && isDate.value) {
          (window as any).flatpickr(el, {
            dateFormat: "m/d/Y",
            allowInput: false,
          });
        }
      })
    );

    onRestoreData();

    disposers.push(
      effect(() => {
        return () => {
          let dontAllowSwitch = false;
          if (
            data.value ||
            (name.value && selectedType.value.toUpperCase() === "TEXT") ||
            (link.value && GAny.LINKS_TYPES[selectedType.value.toUpperCase()])
          ) {
            dontAllowSwitch = true;
          }
          if (dontAllowSwitch) {
            GAny.AllowSwitchBetweenTypes = false;
          }
        };
      })
    );

    disposers.push(
      effect(() => {
        GAny.OnRetainData = onRetainData;
        GAny.OnReleaseData = onReleaseData;
        GAny.OnRestoreData = onRestoreData;
        return () => {
          onRetainData();
          GAny.OnRetainData = null;
          GAny.OnReleaseData = null;
          GAny.OnRestoreData = null;
        };
      })
    );

    disposers.push(
      effect(() => {
        const el = dragRefElement.value;
        const type = selectedType.value;

        const handleDragEnter = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounter += 1;
          if (dragCounter === 1) {
            dragState.value = { isDragOver: true };
          }
        };

        const handleDragLeave = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          dragCounter -= 1;
          if (dragCounter === 0) {
            dragState.value = { isDragOver: false };
          }
        };

        const handleDragOver = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
        };

        const handleDrop = async (e: DragEvent) => {
          e.preventDefault();
          e.stopPropagation();

          const files = Array.from(e.dataTransfer?.files || []);
          const finalFiles: any[] = [];
          const filesPromises: Promise<string | ArrayBuffer | null>[] = [];

          for (const file of files) {
            filesPromises.push(readFileAsText(file));
          }

          const filesRes = await Promise.all(filesPromises);

          filesRes.forEach((fileData, index) => {
            finalFiles.push({
              ...toPlainFile(files[index]),
              data: fileData,
            });
          });

          onAddFiles(finalFiles);

          dragState.value = { isDragOver: false };
        };

        if (el && type === "SCRIPTURE") {
          el.addEventListener("dragenter", handleDragEnter);
          el.addEventListener("dragleave", handleDragLeave);
          el.addEventListener("dragover", handleDragOver);
          el.addEventListener("drop", handleDrop);
        }

        return () => {
          if (el && type === "SCRIPTURE") {
            dragCounter = 0;
            el.removeEventListener("dragenter", handleDragEnter);
            el.removeEventListener("dragleave", handleDragLeave);
            el.removeEventListener("dragover", handleDragOver);
            el.removeEventListener("drop", handleDrop);
          }
        };
      })
    );

    disposers.push(
      effect(() => {
        const results: any = GAny.validateUrl(link.value);
        if (!results.isValid) {
          return;
        }
        setMediaType(results.type || "text");
        setLinkState(results);
      })
    );

    disposers.push(
      effect(() => {
        const currentLink = link.value;
        const currentData = data.value;
        const currentMediaType = mediaType.value;

        untracked(() => {
          const currentName = name.value;
          const currentSelectedType = selectedType.value;
          const currentRecordingType = recordingType.value;

          if (!currentName && (!!currentLink || !!currentData)) {
            let tempName = `${getCurrentTime()}`;
            switch (currentMediaType?.toLocaleLowerCase()) {
              case "text":
                tempName += "-heading";
                break;
              case "iframe":
              case "externallink":
              case "youtube":
              case "video":
                tempName = currentLink;
                break;
              case RECORDING_VALUE:
                tempName += "-voice-Note";
                break;
              case "aux":
                tempName += "-aux-file";
                break;
              default:
                break;
            }
            if (!tempName) {
              tempName = `${getCurrentTime()}`;
              switch (currentSelectedType) {
                case "RECORDING":
                  if (currentRecordingType === "video") {
                    tempName += "-video-recording";
                  } else {
                    tempName += "-audio-recording";
                  }
                  break;
              }
            }
            if (
              currentSelectedType !== "SCRIPTURE" &&
              !currentName &&
              !!tempName
            ) {
              setName(tempName);
            }
          }
        });
      })
    );

    disposers.push(
      effect(() => {
        if (selectedType.value === "TEXT") {
          GAny.RawName = name.value;
        } else {
          GAny.RawName = "";
        }
      })
    );

    disposers.push(
      effect(() => {
        if (editMode.value) {
          GAny.FireEditContent = onClickSend;
        }
      })
    );

    disposers.push(
      effect(() => {
        GAny.OnClickSend = onClickSend;
      })
    );

    mountCleanup = () => {
      disposers.forEach((dispose) => dispose());
      mountedScope = null;
    };
  };

  return {
    loading,
    selectedType,
    textType,
    mediaType,
    data,
    linkState,
    name,
    link,
    isQuotedText,
    recordingType,
    dragState,
    dragRefElement,
    datePickerElement,
    filteredTags,
    isDisabled,
    playlists,
    playlistListOptions,
    editMode,
    canClose,
    isDate,
    setLoading,
    setSelectedType,
    setTextType,
    setMediaType,
    setData,
    setLinkState,
    setName,
    setLink,
    setIsQuotedText,
    setRecordingType,
    setDragRef,
    setDatePickerRef,
    onAddFiles,
    deleteFromList,
    onClickSend,
    handleTypeSwitch,
    handleClose,
    syncProps,
    mount,
  };
}
