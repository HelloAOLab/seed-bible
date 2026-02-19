// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank
// number -> Index of chpater / verse / book

const { useState, useLayoutEffect, useRef, useMemo } = os.appHooks;
const G = globalThis as any;
const { Input, Modal, Button, ButtonsCover, Checkbox, Tooltip, Select } =
  G.Components;

const ChecklistGIf =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif";

const PlaylistList = await thisBot.PlaylistList();
const AttachLink = await thisBot.AttachLink();
const AddNewPlaylist = await thisBot.AddNewPlaylist();
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();
const TogglePlaylistHeight = await thisBot.TogglePlaylistHeight();

// const AttachmentLinkItem = thisBot.AttachmentLinkItem();

G.DEFAULT_UPLOAD_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/67bba604a31cc7e116124f92179d8fe06317fcf70a3c62f071dff529362ebc25.png";

const startCreatingPlaylist = (name, playlist = [], id) => {
  G.HISTORYExploreMode = false;
  G[`${id}creatingPlaylistName`] = name;
  G[`${id}creatingPlaylist`] = true;
  // thisBot.showInfo(`Playlist Mode`);
  G[`${id}SetCreatingPlaylist`](true, playlist);
};

const handleSheetUrl = async (link: string) => {
  const response = await thisBot.getSheetDataAndFetch({ link });
  return response;
};

function getSortedDateFormats(selectedValue: string) {
  const DATE_FORMAT_OPTIONS = [
    { label: "DD MMM", value: "DD MMM" }, // Ex: 15 Jan
    { label: "MM-DD-YYYY", value: "MM-DD-YYYY" },
    { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
    { label: "MMMM DD, YYYY", value: "MMMM DD, YYYY" },
    { label: "MMM DD, YYYY", value: "MMM DD, YYYY" },
    { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
    { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
    { label: "YYYY/MM/DD", value: "YYYY/MM/DD" },
    { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
    { label: "YYYY.MM.DD", value: "YYYY.MM.DD" },
    { label: "DD.MM.YYYY", value: "DD.MM.YYYY" },
    { label: "MM.DD.YYYY", value: "MM.DD.YYYY" },
    { label: "DD MMMM YYYY", value: "DD MMMM YYYY" },
    { label: "DD MMM YYYY", value: "DD MMM YYYY" },
    { label: "YYYYMMDD", value: "YYYYMMDD" },
    { label: "DDMMYYYY", value: "DDMMYYYY" },
    { label: "MMDDYYYY", value: "MMDDYYYY" },
    { label: "MMM - DD - YYYY", value: "DEFAULT" },
    { label: "MMMM DD", value: "MMMM DD" }, // Ex: January 15
    { label: "DD MMMM", value: "DD MMMM" }, // Ex: 15 January
    { label: "MMM DD", value: "MMM DD" }, // Ex: Jan 15
  ];
  return [
    ...DATE_FORMAT_OPTIONS.filter((option) => option.value === selectedValue),
    ...DATE_FORMAT_OPTIONS.filter((option) => option.value !== selectedValue),
  ];
}

const PROMPT_OPTIONS = [
  { label: "Prompt", value: "prompt" },
  { label: "System Prompt", value: "system-prompt" },
];

const AI_OPTIONS: { value: string; label: string }[] = [
  // { value: "openai/gpt/5-mini", label: "OpenAI GPT-5 Mini" },
  { value: "openai/gpt/4o-mini", label: "OpenAI GPT-4o Mini" },
  { value: "openai/gpt/o1-mini", label: "OpenAI GPT-o1 Mini" },
  { value: "openai/gpt/o3-mini", label: "OpenAI GPT-o3 Mini" },
  { value: "meta/llama3.1/405b", label: "Meta LLaMA 3.1 405B" },
  { value: "01ai/yi/large", label: "01.AI Yi Large" },
  { value: "xai/grok/2", label: "xAI Grok 2" },
  { value: "openai/gpt/4o", label: "OpenAI GPT-4o" },
  { value: "anthropic/claude3.5/sonnet", label: "Anthropic Claude 3.5 Sonnet" },
  { value: "anthropic/claude3.5/haiku", label: "Anthropic Claude 3.5 Haiku" },
  { value: "anthropic/claude3.7/sonnet", label: "Anthropic Claude 3.7 Sonnet" },
  { value: "apologist/aquinas/v4", label: "Apologist Aquinas v4" },
  { value: "mistral/mixtral/8x22b", label: "Mistral Mixtral 8x22B" },
  { value: "mistral/mixtral/8x7b", label: "Mistral Mixtral 8x7B" },
  { value: "mistral/small/24b", label: "Mistral Small 24B" },
  { value: "alibaba/qwen2.5/72b", label: "Alibaba Qwen 2.5 72B" },
  { value: "alibaba/qwen2.5/32b", label: "Alibaba Qwen 2.5 32B" },
  { value: "microsoft/wizardlm/8x22b", label: "Microsoft WizardLM 8x22B" },
  { value: "deepseek/deepseek/v3", label: "DeepSeek v3" },
  { value: "deepseek/deepseek/r1", label: "DeepSeek R1" },
  { value: "google/gemma/9b", label: "Google Gemma 9B" },
  { value: "meta/llama3.3/70b-specdec", label: "Meta LLaMA 3.3 70B SpecDec" },
  {
    value: "meta/llama3.3/70b-versatile",
    label: "Meta LLaMA 3.3 70B Versatile",
  },
];

const Playlist = ({
  id,
  query,
  selectedChip,
  isCreate,
  isLayers,
  playingPlaylist,
  creatingPlaylist,
  setCreatingPlaylist,
}) => {
  // Audio
  const [mediaURL, setMediaURL] = useState("");
  const [videoSrc, setVideoSrc] = useState(false);
  const [currentItem, setCurrentItem] = useState({});
  const [selectedAI, setSelectedAI] = useState(AI_OPTIONS[0]?.value || "");

  G.SetVideoSrc = setVideoSrc;
  G.SetMediaURL = setMediaURL;
  G.SetCurrentItem = setCurrentItem;

  const [showPlaylistSettings, setShowPlaylistSettings] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [itemSelected, setItemSelected] = useState(null);

  const { onSave, onClose } = thisBot.ControlButtons({ id });
  const [hasGenrated, setHasGenrated] = useState(false);
  const [selectedTags, setTags] = useState([]);
  const [selectPlaylist, setSelectPlaylist] = useState(false);

  const [checkListData, setChecklistData] = useState({});
  const [checkListEmbeded, setChecklistEmbeded] = useState({});
  const [checklistEnabled, setChecklistEnabled] = useState(false);
  const [embedding, setEmbedding] = useState(null);

  useLayoutEffect(() => {
    G[`SetChecklistEnabled`] = setChecklistEnabled;
    return () => {
      G[`SetChecklistEnabled`] = null;
    };
  }, [checklistEnabled]);

  const [layers, setLayers] = useState(isLayers);

  const [searchText, setSearchText] = useState("");

  const creatingPlaylistRef = useRef(null);

  const [regenrateUI, setRegenrateUI] = useState(false);
  const [regenrationCommand, setRegenrationCommand] = useState("");

  const oldListRef = useRef([]);
  const hasOldRef = useRef(false);

  const [layersWarning, setLayersWarning] = useState(false);

  const [openAttachLink, setOpenAttachLink] = useState(false);
  const [attachment, setAttachment] = useState(G[`${id}Attachments`] || null);
  const [openModal, setOpenModal] = useState(false);
  const [mergeMode, setMergeMode] = useState(false);
  const [renderAgain, setRenderAgain] = useState(0);

  const [checklist, setChecklist] = useState(false);
  const [readingPlan, setReadingPlan] = useState(false);
  const [currentFormat, setCurrentFormat] = useState("MM-DD-YYYY");

  const [currentPromptText, setCurrentPromptText] = useState("prompt");

  const [systemPrompt, setSystemPrompt] = useState(G.SYSTEM_PROMPT || "");

  const isEdit = useRef(false);
  const [openModalName, setOpenModalName] = useState(false);

  const toggleOpenModalName = (val: boolean) => {
    setOpenModalName(val);
    if (G.SetRenamingPlaylist) G.SetRenamingPlaylist(val);
  };

  const [autoGenerateOn, setAutoGenerateOn] = useState(false);
  const [genDetails, setGenDetails] = useState("");

  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(G[`${id}creatingPlaylistName`] || "");
  const [link, setLink] = useState("");

  // Features
  const [publishAccess, setPublishAccess] = useState("public");
  const [customColor, setCustomColor] = useState("#D3643329");
  const [selectedColor, setSelectedColor] = useState("#D9D9D9");
  const [selectedIcon, setSelectedIcon] = useState(null);
  const [description, setDescription] = useState("");
  const [customIcon, setCustomIcon] = useState(null);

  const setEditModal = ({
    id,
    color,
    isCustomColor,
    icon,
    name,
    description: des,
    isCustomIcon,
    selectedTags,
    isLayers,
  }) => {
    setName(name);
    if (isCustomColor) setCustomColor(color);
    if (isCustomIcon) setCustomIcon(icon);
    setSelectedColor(color);
    setSelectedIcon(icon);
    setDescription(des);
    setTags(selectedTags || []);
    setLayers(isLayers);
    isEdit.current = id;
    // Make Async so happen at last
    setTimeout(() => {
      toggleOpenModalName(true);
    }, 10);
  };

  const [playLists, setPlayLists] = useState(G[`${id}playlists`] || []);
  const [selectedPlaylist, setSelectedPlaylist] = useState<any>({});

  const toggleSelectedPlaylist = (id: string, parentID: string) => {
    setSelectedPlaylist((prev: any) => {
      const old: Record<string, boolean | string> = { ...prev };
      old[id] = old[id] ? false : parentID || true;
      return old;
    });
  };

  const [playList, setPlaylist] = useState(G[`${id}currentPlaylist`] || []);

  const editPlaylistData = (
    idRec: string,
    newValueContent: Record<string, any>,
    parentId = null,
    fullData = false
  ) => {
    setPlaylist((prev: any[]) => {
      const old = [...prev];
      if (parentId) {
        const parentIdx = old.findIndex((e) => e.id === parentId);
        if (parentIdx > -1) {
          const idx = old[parentIdx].additionalInfo.layers.findIndex(
            (e: any) => e.id === idRec
          );
          if (idx > -1) {
            if (fullData) {
              old[parentIdx].additionalInfo.layers[idx] = {
                ...newValueContent,
              };
            } else {
              old[parentIdx].additionalInfo.layers[idx] = {
                ...old[parentIdx].additionalInfo.layers[idx],
                content: newValueContent,
              };
            }
          }
        }
      } else {
        const idx = old.findIndex((e) => e.id === idRec);
        if (idx > -1) {
          if (fullData) {
            old[idx] = { ...newValueContent };
          } else {
            old[idx] = { ...old[idx], content: newValueContent };
          }
        }
      }
      return old;
    });
  };

  const addDataToPlaylist = (
    data: any[],
    isBulk = false,
    combineLast = false
  ) => {
    if (isBulk) {
      setPlaylist((prev: any[]) => {
        const old = [...prev, ...data];
        return old;
      });
      return;
    }

    setPlaylist((prev: any[]) => {
      const old = [...prev];
      if (combineLast) old.pop();
      const lastData = old[old.length - 1];
      const isSame = G.objectComparator(data, lastData, ["content"]);
      if (!isSame) {
        old.push(data);
      } else {
        // os.toast("Last item repeated!");
      }
      return old;
    });
  };

  const onSearchHit = async () => {
    const allItems = thisBot.getSuggestedListItems({ searchText });

    setSearchText("");
    setPlaylist((prev: any[]) => {
      const old = [...prev, ...allItems];
      return old;
    });
  };

  const resetPlayist = () => {
    setPlaylist([]);
    setLink("");
    setAttachment(null);
    setChecklist(false);
  };

  const addPlaylist = (data: any, id = false, subId: string | null = null) => {
    setPlayLists((p: any[]) => {
      const old = [...p];
      G.AlreadySet = true;
      if (id) {
        if (subId) {
          const subIndex = G[`${id}playlists`].findIndex(
            (pl: any) => pl.id === subId
          );
          const index = G[`${id}playlists`][subIndex].list.findIndex(
            (pl: any) => pl.id === id
          );
          if (data.list.length === 0 && !old[subIndex].list[index].attachment) {
            old[subIndex].list[index].splice(index, 1);
          } else {
            old[subIndex].list[index] = data;
          }
        } else {
          const index = old.findIndex((pl) => pl.id === id);
          if (data.list.length === 0 && !old[index].attachment) {
            old.splice(index, 1);
          } else {
            old[index] = data;
          }
        }
      } else {
        G[`${"default"}playlists`] = old;
        if (data.list.length === 0) return old;
        old.push(data);
      }
      G[`${"default"}playlists`] = old;
      return old;
    });
  };

  const deleteDataFromPlaylist = (
    index: number | number[],
    pId: string | null = null
  ) => {
    setPlaylist((prev: any[]) => {
      const isBulk = Array.isArray(index);
      const idMaps: Record<string, boolean> = {};
      let old = [...prev];
      if (pId) {
        const indexParent = old.findIndex((ele) => ele.id === pId);
        if (indexParent > -1) {
          old[indexParent].additionalInfo.layers.splice(index, 1);
        }
      } else if (isBulk) {
        index.forEach((ele) => {
          idMaps[ele] = true;
        });
        old = old.filter(({ id }) => !idMaps[id]);
      } else {
        old.splice(index, 1);
      }
      return old;
    });
  };

  const deleteDateData = () => {
    setPlaylist((prev: any[]) => {
      let old = [...prev.filter((ele) => ele.type !== "date")];
      return old;
    });
  };

  const SetCreatingPlaylist = (value: boolean, list: any[] = []) => {
    const anyDate = list.findIndex((ele) => ele.type === "date") > -1;
    if (anyDate) {
      setReadingPlan(true);
    } else {
      setReadingPlan(false);
    }
    setCreatingPlaylist(value);
    setPlaylist(list);
  };

  useLayoutEffect(() => {
    G.IS_PLAYLIST_ACTIVE = creatingPlaylist;
    G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(creatingPlaylist);
    return () => {
      G.SET_SHOW_CHECK && G.SET_SHOW_CHECK(false);
    };
  }, [creatingPlaylist]);

  // const toggleMarkAsRead = (playlistIndex, subPlaylistIndex = false) => {
  //     setPlayLists(prev => {
  //         const old = [...prev];
  //         if (subPlaylistIndex !== false) {
  //             old[subPlaylistIndex][playlistIndex].readAlready = !old[subPlaylistIndex][playlistIndex].readAlready;
  //         } else {
  //             old[playlistIndex].readAlready = !old[playlistIndex].readAlready;
  //         }
  //         return old;
  //     })
  // }

  useLayoutEffect(() => {
    G[`${id}AddDataToPlaylist`] = addDataToPlaylist;
    G[`${id}EditPlaylistData`] = editPlaylistData;
    G[`${id}ResetPlaylist`] = resetPlayist;
    G[`${id}SetCreatingPlaylist`] = SetCreatingPlaylist;
    G[`${id}SetPlaylistName`] = setName;
    G[`${id}AddPlaylist`] = addPlaylist;
    G[`${id}creatingPlaylistName`] = name;
    G[`${id}currentPlaylist`] = playList;
    if (G.SetRenderMylist) G.SetRenderMylist(playList);
    if (!G.AlreadySet) G[`${id}playlists`] = playLists;
    G.AlreadySet = false;
    G[`${id}Attachments`] = attachment;
    G[`${id}SetAttachments`] = setAttachment;
    G[`${id}SetPlaylists`] = setPlayLists;
    G[`${id}SetChecklist`] = setChecklist;
    G[`${id}SetReadingPlan`] = setReadingPlan;
    G[`${id}SetCurrentFormat`] = setCurrentFormat;
    G[`${id}setCustomColor`] = setCustomColor;
    G[`${id}setCustomIcon`] = setCustomIcon;
    G[`${id}setSelectedColor`] = setSelectedColor;
    G[`${id}setSelectedIcon`] = setSelectedIcon;
    G[`${id}setDescription`] = setDescription;
    G[`${id}setPublishAccess`] = setPublishAccess;
    G[`setRenderAgain`] = setRenderAgain;
    setPlaylistLocale(playLists, id);
    G[`setOpenAttachLink`] = setOpenAttachLink;
    G[`SetEditModal`] = setEditModal;
    G[`SetSelectPlaylist`] = setSelectPlaylist;
    G[`${id}SetSelectedTags`] = setTags;
    G[`${id}SetLayers`] = setLayers;
    return () => {
      G[`${id}SetPlaylistName`] = null;
      G[`${id}AddDataToPlaylist`] = null;
      G[`${id}AddPlaylist`] = null;
      G[`${id}SetChecklist`] = null;
      G[`${id}SetPlaylists`] = null;
      G[`${id}setPublishAccess`] = null;
      G[`${id}setCustomColor`] = null;
      G[`${id}setCustomIcon`] = null;
      G[`${id}setSelectedColor`] = null;
      G[`setOpenAttachLink`] = null;
      G[`${id}setSelectedIcon`] = null;
      G[`${id}setDescription`] = null;
      G[`${id}SetCurrentFormat`] = null;
      G[`${id}SetReadingPlan`] = null;
      G[`SetSelectPlaylist`] = null;
    };
  }, [playList, name, playLists, attachment]);

  const checkNameDuplicate = (newName: string) => {
    const nameValue = (newName || name).trim();
    if (!nameValue)
      return ShowNotification({
        message: t("playlistNameNotFound"),
        severity: "error",
      });
    const names = playLists.map((ele: any) => ele.name);
    if (names.includes(nameValue) && !isEdit.current) {
      ShowNotification({
        message: t("playlistNameAlreadyPresent"),
        severity: "error",
      });
      return true;
    }
    return false;
  };

  const attachLink = (title: string, link: string, linkState: any) => {
    const dataItem = {
      content: title,
      additionalInfo: {
        link,
        ...linkState,
      },
      type: linkState.type === "text" ? "heading" : "attachment-link",
    };
    if (itemSelected) {
      setPlaylist((old: any[]) => {
        const prev = [...old];
        const index = prev.findIndex((ele) => ele.id === itemSelected);
        const targetVerse = prev[index];
        targetVerse.additionalInfo.layers = [
          {
            id: G.createUUID(),
            content: title,
            additionalInfo: {
              link,
              ...linkState,
            },
            type: linkState.type === "text" ? "heading" : "attachment-link",
          },
          ...(targetVerse.additionalInfo.layers || []),
        ];
        prev[index] = targetVerse;
        return prev;
      });
      setTimeout(() => {
        G[`${itemSelected}OpenToggle`](true);
      }, 300);
    } else {
      thisBot.tryAddDataToPlaylist({
        dataItem,
      });
    }
    setOpenAttachLink(false);
  };

  const massAdd = (items: any[]) => {
    if (itemSelected) {
      setPlaylist((old: any[]) => {
        const prev = [...old];
        const index = prev.findIndex((ele) => ele.id === itemSelected);
        const targetVerse = prev[index];
        targetVerse.additionalInfo.layers = [
          ...items,
          ...(targetVerse.additionalInfo.layers || []),
        ];
        prev[index] = targetVerse;
        return prev;
      });
      setTimeout(() => {
        G[`${itemSelected}OpenToggle`](true);
      }, 300);
    } else {
      items.forEach((item) => {
        thisBot.tryAddDataToPlaylist({
          dataItem: { ...item },
        });
      });
    }
    setOpenAttachLink(false);
  };

  const attachDate = (date: string = "") => {
    // thisBot.onAddDate({
    // onAttach: (date) => {
    setReadingPlan(true);
    thisBot.tryAddDataToPlaylist({
      dataItem: {
        content: G.FORMAT_DATE(
          date.replaceAll("/", "-") || new Date(),
          "DEFAULT",
          "MM-DD-YYYY"
        ),
        additionalInfo: {
          date: G.FORMAT_YYYY_MM_DD(
            new Date(`${date.replaceAll("/", "-")} 12:00:00`) || new Date()
          ),
        },
        type: "date",
      },
    });
    // setOpenAttachLink(false);
    // },
    // });
  };

  useLayoutEffect(() => {
    if (!openModalName) {
      isEdit.current = false;
    }
    // if (creatingPlaylistRef.current) {
    //     setTimeout(() => { creatingPlaylistRef.current.focus(); }, 500);
    // }
  }, [
    // playList,
    openModalName,
  ]);

  const onBulkDelete = () => {
    setPlayLists((prev: any[]) => {
      let old = [...prev];
      old = old.filter((prev) => !selectedPlaylist[prev.id]);
      return old;
    });
    setSelectedPlaylist({});
  };

  const onBulkJsonDownload = () => {
    const listToDownload: any[] = [];
    playLists.forEach(({ list, id: playlistID }) => {
      if (selectedPlaylist[playlistID]) {
        list.forEach((ele: any) => {
          listToDownload.push({
            ...ele,
            id: G.createUUID(),
          });
        });
      }
    });

    const jsonStr = JSON.stringify(listToDownload, null, 2);
    os.download(jsonStr, `BulkPlaylist.json`);
    setSelectedPlaylist({});
  };

  const onBulkAddToCollection = () => {
    thisBot.PlaylistLinkModal({
      idsMap: selectedPlaylist,
    });
  };

  const onRegenration = async () => {
    oldListRef.current = JSON.parse(JSON.stringify(playList));
    if (loading) {
      return ShowNotification({
        message: t("regenrationInProgress"),
        severity: "error",
      });
    }
    const oldData = JSON.stringify(playList);
    setLoading(true);

    try {
      const { allItems } = await thisBot.RegenratePlaylistWithNewCommand({
        aiModal: selectedAI,
        oldData,
        systemPrompt: systemPrompt,
        command: genDetails,
      });
      setLoading(false);
      if (!allItems?.length) {
        ShowNotification({
          message: t("unableToGeneratePlaylist"),
          severity: "error",
        });
        return;
      }
      hasOldRef.current = true;
      setPlaylist(allItems);
      setHasGenrated(true);
      setRegenrateUI(false);
    } catch (err) {
      setLoading(false);
      return ShowNotification({
        message: t("regenerationFailed"),
        severity: "error",
      });
    }
  };

  const onRevert = () => {
    hasOldRef.current = false;
    setPlaylist(oldListRef.current);
  };

  const editDataFromPlaylist = (receivedIds) => {
    let ids = [receivedIds];
    if (Array.isArray(receivedIds)) {
      ids = [...receivedIds];
    }

    setChecklistData((prev) => {
      const old = { ...prev };
      ids.forEach((idEle) => {
        if (old[idEle]) {
          delete old[idEle];
        } else {
          old[idEle] = true;
        }
      });

      return old;
    });
  };

  const onBulkDeleteItems = () => {
    setPlaylist((prev) => {
      const old = prev.filter(
        (ele) => !checkListData[ele.id] && embedding !== ele.id
      );
      return old;
    });
    setChecklistData({});
    setEmbedding(null);
    setChecklistEmbeded({});
  };

  const onEmbedItems = () => {
    let embededItem = null;
    if (!embedding) return;

    playList.forEach((ele) => {
      if (checkListData[ele.id] && ele.id !== embedding) {
        if (!!ele.additionalInfo?.layers?.length) {
          embededItem = ele.content;
        }
      }
    });

    if (!!embededItem) {
      ShowNotification({
        message: t("cannotEmbedEmbeddedItem", { embededItem }),
        severity: "error",
      });
      return;
    }
    setPlaylist((prev) => {
      const oldItems = [];
      const newLayers = [];
      const old = [...prev];
      old.forEach((ele) => {
        if (checkListData[ele.id]) {
          newLayers.push({
            ...ele,
          });
        }
        if (!checkListData[ele.id]) {
          oldItems.push({
            ...ele,
          });
        }
      });

      let embeddingItemsIndex = oldItems.findIndex(
        (ele) => ele.id === embedding
      );
      oldItems[embeddingItemsIndex] = {
        ...oldItems[embeddingItemsIndex],
        additionalInfo: {
          ...oldItems[embeddingItemsIndex].additionalInfo,
          layers: [
            ...(oldItems[embeddingItemsIndex].additionalInfo.layers || []),
            ...newLayers,
          ],
        },
      };
      return oldItems;
    });
    setEmbedding(null);
    setChecklistData({});
  };

  const onDisembed = (ids, isDelete) => {
    let idtoDisembed = [ids];
    if (Array.isArray(ids)) {
      idtoDisembed = [...ids];
    }

    const idsMap = {};
    const pidsMap = {};

    idtoDisembed.forEach((ele, index) => {
      idsMap[ele.id] = true;
      pidsMap[ele.pId] = true;
    });

    setPlaylist((prev) => {
      const toBeAddedAtIndex = {};

      const old = prev.map((ele, idx) => {
        const prevEle = {
          ...ele,
          additionalInfo: {
            ...ele.additionalInfo,
            layers: [...(ele.additionalInfo.layers || [])],
          },
        };
        const layersFilter = [];
        const remaningLayers = [];
        if (pidsMap[prevEle.id]) {
          prevEle.additionalInfo.layers.forEach((layer) => {
            if (idsMap[layer.id]) {
              layersFilter.push({
                ...layer,
              });
            } else {
              remaningLayers.push({
                ...layer,
              });
            }
          });
          prevEle.additionalInfo.layers = [...remaningLayers];
        }
        if (!isDelete) {
          toBeAddedAtIndex[idx] = [...layersFilter];
        }
        return prevEle;
      });
      Object.keys(toBeAddedAtIndex).forEach((ele) => {
        const items = [...toBeAddedAtIndex[ele]];
        old.splice(ele, 0, ...items);
      });
      return old;
    });
  };

  const isSomethingChecked = Object.keys(checkListData).length > 0;

  const isSomethingEmbededChecked = Object.keys(checkListEmbeded).length > 0;

  const onCheckEmbeded = (id, pId) => {
    setChecklistEmbeded((prev) => {
      const old = { ...prev };
      let idMap = [id];
      if (Array.isArray(id)) {
        idMap = [...idMap];
      }
      idMap.forEach((idFinal) => {
        if (old[idFinal]) {
          delete old[idFinal];
        } else {
          old[idFinal] = { idFinal, pId };
        }
      });
      return old;
    });
  };

  const showMorePosition = useRef(getPosition ? getPosition() : { x: 0, y: 0 });

  const showPlaylistPosition = useRef(
    getPosition ? getPosition() : { x: 0, y: 0 }
  );

  const [sharedFilterPlaylists, filteredPlaylist] = useMemo(() => {
    const q = query.toLocaleLowerCase();
    const shared = [];
    const owned = [];
    playLists.forEach((ele) => {
      const name = ele.name?.toLocaleLowerCase();
      const des = ele.description?.toLocaleLowerCase();
      if (name.includes(q) || des.includes(q)) {
        if (ele.shareProfileName && ele.sharerID !== authBot?.id) {
          shared.push({ ...ele });
        } else {
          owned.push({ ...ele });
        }
      }
    });
    return [shared, owned];
  }, [query, playLists]);

  return (
    <>
      {layersWarning && (
        <Modal
          title={t("notEmbeddedItemsFound")}
          onClose={() => setLayersWarning(false)}
          showIcon={false}
        >
          <h2 style={{ fontSize: "1rem" }}>{t("notEmbeddedItemsMsg")}</h2>
          <ButtonsCover>
            <Button
              secondary
              onClick={() => {
                setPlaylist((prev) => {
                  const old = prev.filter(
                    (ele) => !!ele.additionalInfo.layers?.length
                  );
                  globalThis[`${id}currentPlaylist`] = old;
                  return old;
                });
                setOpenAttachLink(false);
                onSave(
                  attachment,
                  checklist,
                  readingPlan,
                  currentFormat,
                  selectedColor,
                  selectedIcon,
                  selectedColor === customColor,
                  description,
                  selectedIcon === customIcon && !!selectedIcon,
                  selectedTags,
                  layers
                );
                setLayersWarning(false);
              }}
            >
              {t("removeAndSave")}
            </Button>
            <Button secondaryAlt onClick={() => setLayersWarning(false)}>
              {t("close")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      {showMoreOptions && (
        <>
          <div className="backdrop" onClick={() => setShowMoreOptions(false)} />
          <div
            onClick={() => setShowMoreOptions(false)}
            style={{
              ...showMorePosition.current,
              left: "none",
              right: "4rem",
              width: "206px",
              padding: "1rem",
              top: "5rem",
            }}
            className="overlay linked-item-custom"
          >
            <p>
              <b>{t("publishSettings")}</b>
            </p>
            <span style={{ fontSize: "10px" }}>{t("publishSettingsDesc")}</span>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("private");
              }}
            >
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                lock
              </span>
              <p>{t("privateAccess")}</p>
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                {publishAccess === "private"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("public");
              }}
            >
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                public
              </span>
              <p>{t("publicAccess")}</p>
              <span
                style={{ color: "white" }}
                class="material-symbols-outlined"
              >
                {publishAccess === "public"
                  ? "radio_button_checked"
                  : "radio_button_unchecked"}
              </span>
            </div>
          </div>
        </>
      )}
      {openModal && creatingPlaylist && (
        <Modal
          title={t("copyItems")}
          showIcon={false}
          onClose={() => setOpenModal(false)}
        >
          <p style={{ fontSize: "12px" }}>{t("copyItemsInstructions")}</p>
          <p style={{ textAlign: "center" }}> {t("or")} </p>
          <p style={{ fontSize: "12px" }}>{t("copyItemInstructions")}</p>
          <PlaylistList
            creatingPlaylist={creatingPlaylist}
            isLayers={isLayers}
            playLists={playLists}
            parentId={id}
            setPlayLists={setPlayLists}
          />
          <ButtonsCover>
            <p> </p>
            <Button secondaryAlt onClick={() => setOpenModal(false)}>
              {t("close")}
            </Button>
          </ButtonsCover>
        </Modal>
      )}

      {showPlaylistSettings && (
        <>
          <div
            className="backdrop"
            onClick={() => setShowPlaylistSettings(false)}
          />
          <div
            style={{
              ...showPlaylistPosition.current,
              width: "206px",
              padding: "1rem",
            }}
            className="overlay linked-item-custom"
          >
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("public");
              }}
            >
              <div
                className="align-center"
                style={{}}
                onClick={() => {
                  setChecklist((p) => !p);
                }}
              >
                {checklist ? (
                  <span
                    style={{ fontSize: "20px", color: "white" }}
                    class="material-symbols-outlined unfollow"
                  >
                    check_box
                  </span>
                ) : (
                  <span
                    style={{ fontSize: "20px", color: "white" }}
                    class="material-symbols-outlined unfollow"
                  >
                    check_box_outline_blank
                  </span>
                )}
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("checklist")}
                </label>
              </div>
              <Tooltip forRight={true} text={t("checklistTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow"
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
            <div
              className="more-menu-items"
              onClick={() => {
                setPublishAccess("public");
              }}
            >
              <div
                className="align-center"
                style={{
                  cursor: "pointer",
                }}
                onClick={() => {
                  if (readingPlan) {
                    deleteDateData();
                  }
                  setReadingPlan((p) => !p);
                }}
              >
                {readingPlan ? (
                  <span
                    style={{ fontSize: "20px", color: "white" }}
                    class="material-symbols-outlined unfollow"
                  >
                    check_box
                  </span>
                ) : (
                  <span
                    style={{ fontSize: "20px", color: "white" }}
                    class="material-symbols-outlined unfollow"
                  >
                    check_box_outline_blank
                  </span>
                )}
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    marginLeft: "4px",
                  }}
                  for="playlistInclude"
                >
                  {t("readingPlan")}
                </label>
              </div>
              <Tooltip text={t("readingPlanTooltip")}>
                <p
                  className="what-this center"
                  style={{ margin: "0 0 0 0.5rem" }}
                >
                  <span
                    style={{ fontSize: "24px" }}
                    class="material-symbols-outlined unfollow "
                  >
                    info
                  </span>
                </p>
              </Tooltip>
            </div>
          </div>
        </>
      )}

      <div className="playlists">
        <p style={{ visibility: "hidden", display: "none" }}>{renderAgain}</p>
        {Object.keys(selectedPlaylist).some((ele) => selectedPlaylist[ele]) &&
          !creatingPlaylist && (
            <ButtonsCover
              secondary
              style={{
                borderBottom: "1px solid #E1E3EA",
                marginBottom: "0.5rem",
              }}
            >
              <Button onClick={onBulkDelete} secondaryAlt color="#C20104">
                <span
                  style={{ marginRight: "0.5rem" }}
                  class="material-symbols-outlined unfollow color-inherit"
                >
                  delete_forever
                </span>
                <span className="color-inherit">{t("delete")}</span>
              </Button>
              <Button onClick={onBulkJsonDownload} secondaryAlt color="#C20104">
                <span
                  style={{ marginRight: "0.5rem" }}
                  class="material-symbols-outlined unfollow color-inherit"
                >
                  system_update_alt
                </span>
                <span className="color-inherit">{t("downloadJSON")}</span>
              </Button>
            </ButtonsCover>
          )}

        {creatingPlaylist || openModalName ? (
          <h3 style={{ margin: "0.5rem 0" }}>{t("editingPlaylists")}</h3>
        ) : (
          <>
            {selectedChip["Shared"] && sharedFilterPlaylists.length === 0 ? (
              <>
                <h3 style={{ margin: "0.5rem 0" }}>{t("sharedPlaylists")}</h3>
                <p>{isLayers ? t("noLayersToShow") : t("noPlaylistsToShow")}</p>
              </>
            ) : null}
            {(playingPlaylist ||
              selectedChip["All"] ||
              selectedChip["Shared"]) &&
            sharedFilterPlaylists.length > 0 ? (
              <>
                <h3 style={{ margin: "0.5rem 0" }}>{t("sharedPlaylists")}</h3>
                <PlaylistList
                  selectedChip={selectedChip}
                  extraActions={() => {
                    toggleOpenModalName(false);
                  }}
                  selectPlaylist={
                    selectPlaylist ||
                    Object.keys(selectedPlaylist).some(
                      (ele) => !!selectedPlaylist[ele]
                    )
                  }
                  playingPlaylist={playingPlaylist}
                  mergeMode={mergeMode}
                  parentId={id}
                  isLayers={isLayers}
                  selectedPlaylists={selectedPlaylist}
                  setSelectPlaylist={toggleSelectedPlaylist}
                  playLists={sharedFilterPlaylists}
                  setPlayLists={setPlayLists}
                />
              </>
            ) : (
              ""
            )}
            {(playingPlaylist ||
              selectedChip["All"] ||
              selectedChip["Playlist"]) && (
              <>
                <h3 style={{ margin: "0.5rem 0" }}>{t("playlists")}</h3>
                <PlaylistList
                  selectedChip={selectedChip}
                  extraActions={() => {
                    toggleOpenModalName(false);
                  }}
                  selectPlaylist={
                    selectPlaylist ||
                    Object.keys(selectedPlaylist).some(
                      (ele) => !!selectedPlaylist[ele]
                    )
                  }
                  playingPlaylist={playingPlaylist}
                  mergeMode={mergeMode}
                  parentId={id}
                  isLayers={isLayers}
                  selectedPlaylists={selectedPlaylist}
                  setSelectPlaylist={toggleSelectedPlaylist}
                  playLists={filteredPlaylist}
                  setPlayLists={setPlayLists}
                />
              </>
            )}
          </>
        )}
        {creatingPlaylist && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              className="align-center justify-between"
              style={{ padding: "0.5rem 0 ", justifyContent: "space-between" }}
            >
              <div
                className="publish-setting"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();

                  const x = rect.left; // X position where the element starts (from left of screen)
                  const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                  globalThis.LastClickX = x;
                  globalThis.LastClickY = y;
                  showPlaylistPosition.current = { ...getPosition() };
                  setShowPlaylistSettings(true);
                }}
              >
                <span class="material-symbols-outlined">playlist_play</span>
                <span>{t("playlistSettings")}</span>
              </div>
              <div className="align-center">
                <TogglePlaylistHeight />
                <div
                  className="publish-setting"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();

                    const x = rect.left; // X position where the element starts (from left of screen)
                    const y = rect.bottom; // Y position where the element ends (bottom of element from top of screen)

                    globalThis.LastClickX = x;
                    globalThis.LastClickY = y;
                    showMorePosition.current = { ...getPosition() };
                    setShowMoreOptions(true);
                  }}
                >
                  <span class="material-symbols-outlined">settings</span>
                  <span>{t("publishSettings")}</span>
                </div>
              </div>
            </div>

            {(isSomethingChecked || embedding) && (
              <div
                style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
                className="align-center"
              >
                <Button
                  onClick={() => {
                    onBulkDeleteItems();
                    if (isSomethingEmbededChecked) {
                      const values = Object.keys(checkListEmbeded).map(
                        (ele) => checkListEmbeded[ele]
                      );
                      onDisembed(values, true);
                    }
                  }}
                  secondaryAlt
                  color="#C20104"
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    delete_forever
                  </span>
                  <span className="color-inherit">{t("delete")}</span>
                </Button>
                {!!embedding && isSomethingChecked && (
                  <Button onClick={onEmbedItems} secondaryAlt color="#3B82F6">
                    <span
                      style={{ marginRight: "0.5rem" }}
                      class="material-symbols-outlined unfollow color-inherit"
                    >
                      frame_source
                    </span>
                    <span className="color-inherit">{t("embed")}</span>
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setEmbedding(false);
                    setChecklistData({});
                    setChecklistEmbeded({});
                  }}
                  secondaryAlt
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    close
                  </span>
                  <span className="color-inherit">{t("cancel")}</span>
                </Button>
              </div>
            )}
            {isSomethingEmbededChecked && !isSomethingChecked && (
              <div
                style={{ justifyContent: "space-between", margin: "0.5rem 0" }}
                className="align-center"
              >
                <Button
                  onClick={() => {
                    const values = Object.keys(checkListEmbeded).map(
                      (ele) => checkListEmbeded[ele]
                    );
                    onDisembed(values, true);
                  }}
                  secondaryAlt
                  color="#C20104"
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    delete_forever
                  </span>
                  <span className="color-inherit">{t("delete")}</span>
                </Button>
                <Button
                  onClick={() => {
                    const values = Object.keys(checkListEmbeded).map(
                      (ele) => checkListEmbeded[ele]
                    );
                    onDisembed(values);
                  }}
                  secondaryAlt
                  color="#3B82F6"
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    link_off
                  </span>
                  <span className="color-inherit">{t("remove")}</span>
                </Button>
                <Button
                  onClick={() => {
                    setChecklistEmbeded({});
                  }}
                  secondaryAlt
                >
                  <span
                    style={{ marginRight: "0.5rem" }}
                    class="material-symbols-outlined unfollow color-inherit"
                  >
                    close
                  </span>
                  <span className="color-inherit">{t("cancel")}</span>
                </Button>
              </div>
            )}
            <DragDrop
              massAdd={massAdd}
              attachLink={attachLink}
              itemSelected={itemSelected}
              setItemSelected={regenrateUI ? null : setItemSelected}
              isPlayer={
                checklistEnabled ||
                isSomethingChecked ||
                isSomethingEmbededChecked
              }
              isSomethingEmbededChecked={isSomethingEmbededChecked}
              allowHeadingCheck
              checkListData={checkListData}
              layers={true}
              list={playList}
              onGenClick={() => {
                setOpenAttachLink(false);
                setRegenrateUI(true);
              }}
              checkListEmbeded={checkListEmbeded}
              setChecklistEmbeded={onCheckEmbeded}
              onDisembed={onDisembed}
              embedding={embedding}
              setEmbedding={setEmbedding}
              editDataFromPlaylist={editDataFromPlaylist}
              currentFormat={currentFormat}
              setList={setPlaylist}
              deleteFromList={deleteDataFromPlaylist}
              creatingPlaylist={creatingPlaylist}
              setPlaylistFromRow={setPlaylist}
            />
            {false && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <Input
                  value={searchText}
                  style={{ marginBottom: "0" }}
                  onChangeListener={setSearchText}
                  placeholder={t("typeToSearch")}
                />
                <p
                  onClick={onSearchHit}
                  className="playlist-action secondary self-start"
                >
                  <span class="material-symbols-outlined unfollow">search</span>
                  <span>{t("searchAndAdd")}</span>
                </p>
              </div>
            )}
            {false && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                <Button
                  style={{ fontSize: "12px" }}
                  onClick={() => {
                    setRegenrateUI(false);
                    setOpenAttachLink(true);
                  }}
                  small
                  secondary
                >
                  <span
                    class="material-symbols-outlined unfollow color-inherit"
                    style={{ fontSize: "1.25rem", marginRight: "0.25rem" }}
                  >
                    photo_library
                  </span>
                  <span className="color-inherit">{t("addMedia")}</span>
                </Button>
                <p
                  onClick={() => {
                    setRegenrateUI(false);
                    attachDate();
                  }}
                  style={{ width: "fit-content" }}
                  className="playlist-action small"
                >
                  <span class="material-symbols-outlined unfollow">
                    calendar_month
                  </span>
                  <span>{t("insertDate")}</span>
                </p>
              </div>
            )}

            {!regenrateUI && !itemSelected && (
              <AttachLink
                isDate
                onDateClick={(date: string = "") => {
                  setRegenrateUI(false);
                  attachDate(date);
                }}
                massAdd={massAdd}
                attachLink={attachLink}
                onClose={() => setOpenAttachLink(true)}
              />
            )}
            {!!videoSrc && (
              <VideoPlayer
                videoSrc={videoSrc}
                playlistItem={{ ...currentItem }}
              />
            )}
            {!!mediaURL && <AudioPlayer close mediaURL={mediaURL} />}

            {regenrateUI && (
              <div
                className="add-new-playlist alter"
                style={{ border: "none" }}
              >
                <div
                  class="align-center"
                  style={{ justifyContent: "space-between" }}
                >
                  <p style={{ fontSize: "12px", margin: "0.5rem 0" }}>
                    <b>{t("regenerationPrompt")}</b>
                  </p>
                  <div
                    className="align-center"
                    style={{ gap: "0.5rem", marginBottom: "0.5rem" }}
                  >
                    <Select
                      hidden={true}
                      secondary
                      value={currentPromptText}
                      onChangeListener={(val) => {
                        setCurrentPromptText(val);
                      }}
                      name="Prompt Type:"
                      options={PROMPT_OPTIONS}
                      sxSelect={{ padding: "0.25rem" }}
                    />
                    {currentPromptText === "system-prompt" && (
                      <Button
                        small
                        onClick={() => {
                          setSystemPrompt(globalThis.SYSTEM_PROMPT);
                        }}
                      >
                        <span
                          style={{ fontSize: "14px" }}
                          class="material-symbols-outlined unfollow"
                        >
                          reset_settings
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                {currentPromptText === "prompt" ? (
                  <Input
                    style={{ marginBottom: "0" }}
                    type="textarea"
                    value={genDetails}
                    onChangeListener={setGenDetails}
                    placeholder={t("describePlaylist")}
                  />
                ) : (
                  <Input
                    style={{ marginBottom: "0" }}
                    sxInput={{ resize: "vertical", height: "25rem" }}
                    type="textarea"
                    value={systemPrompt}
                    onChangeListener={setSystemPrompt}
                    placeholder={t("describeSystemPrompt")}
                  />
                )}
                {currentPromptText === "system-prompt" && (
                  <p className="info">{t("systemPromptInfo")}</p>
                )}
                <Select
                  hidden={true}
                  secondary
                  value={selectedAI}
                  onChangeListener={(val) => {
                    setSelectedAI(val);
                  }}
                  name="AI:"
                  options={AI_OPTIONS}
                  sxSelect={{ padding: "0.25rem" }}
                />
                <div className="attach-link-actions">
                  <Button onClick={() => setRegenrateUI(false)} secondaryAlt>
                    {t("cancel")}
                  </Button>
                  <Button
                    // isDisabled={loading}
                    onClick={onRegenration}
                    secondary
                  >
                    {t("regenerate")}
                  </Button>
                </div>
              </div>
            )}
            <div className="add-playlist-actions">
              <Button
                onClick={() => {
                  if (layers) {
                    const checkEmbed = playList.some(
                      (ele) => !ele.additionalInfo.layers?.length
                    );
                    if (checkEmbed) {
                      setLayersWarning(true);
                      return;
                    }
                  }
                  setOpenAttachLink(false);
                  onSave(
                    attachment,
                    checklist,
                    readingPlan,
                    currentFormat,
                    selectedColor,
                    selectedIcon,
                    selectedColor === customColor,
                    description,
                    selectedIcon === customIcon && !!selectedIcon,
                    selectedTags,
                    layers
                  );
                }}
                secondary
              >
                {t("save")}
              </Button>
              {hasOldRef.current && (
                <Button isDisabled={loading} onClick={onRevert} secondary>
                  {t("revertToPrevious")}
                </Button>
              )}
              {!!playList?.length && false && (
                <p
                  onClick={() => {
                    const jsonStr = JSON.stringify(playList, null, 2);
                    os.download(jsonStr, `${name}.json`);
                  }}
                  style={{ width: "100%", padding: "0" }}
                  className="playlist-action self-start"
                >
                  <span class="material-symbols-outlined unfollow">
                    download
                  </span>
                  <span>{t("downloadJSON")}</span>
                </p>
              )}
              {false && !regenrateUI && (
                <p
                  onClick={() => {
                    setOpenAttachLink(false);
                    setRegenrateUI(true);
                  }}
                  style={{ width: "100%", padding: "0" }}
                  className="playlist-action self-start"
                >
                  <span class="material-symbols-outlined unfollow">
                    animated_images
                  </span>
                  <span>
                    {hasGenrated ? t("regenerate") : t("generate")}{" "}
                    {isLayers ? t("layers") : t("playlist")}
                  </span>
                </p>
              )}
              {!!playLists.length && false && (
                <p
                  onClick={() => {
                    setOpenModal(true);
                  }}
                  style={{ width: "100%", padding: "0" }}
                  className="playlist-action self-start"
                >
                  <span class="material-symbols-outlined unfollow">
                    content_copy
                  </span>
                  <span>{t("copyOtherPlaylists")}</span>
                </p>
              )}
              <Button
                onClick={() => {
                  setOpenAttachLink(false);
                  setHasGenrated(false);
                  onClose();
                }}
                secondaryAlt
              >
                {t("close")}
              </Button>
            </div>
            <p
              style={{ width: "10px", height: "10px" }}
              ref={creatingPlaylistRef}
              tabIndex="-1"
            />
          </div>
        )}
        {isCreate && !creatingPlaylist && !playingPlaylist && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexDirection: "column",
              marginTop: openModalName ? "0" : "auto",
            }}
          >
            {playLists.length < 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <input
                  type="checkbox"
                  checked={mergeMode}
                  id="mergeMode"
                  onChange={(e) => {
                    setMergeMode(e.target.checked);
                  }}
                />
                <label
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    marginLeft: "12px",
                  }}
                  for="mergeMode"
                >
                  {t("mergeMode")}
                </label>
              </div>
            )}
            {!openModalName && autoGenerateOn && (
              <div style={{ margin: "0.5rem", width: "100%" }}>
                <div
                  className="align-center"
                  style={{ gap: "0.5rem", marginBottom: "0.5rem" }}
                >
                  <Select
                    hidden={true}
                    secondary
                    value={currentPromptText}
                    onChangeListener={(val) => {
                      setCurrentPromptText(val);
                    }}
                    name="Prompt Type:"
                    options={PROMPT_OPTIONS}
                    sxSelect={{ padding: "0.25rem" }}
                  />
                  {currentPromptText === "system-prompt" && (
                    <Button
                      small
                      onClick={() => {
                        setSystemPrompt(globalThis.SYSTEM_PROMPT);
                      }}
                    >
                      <span
                        style={{ fontSize: "14px" }}
                        class="material-symbols-outlined unfollow"
                      >
                        reset_settings
                      </span>
                    </Button>
                  )}
                </div>
                {currentPromptText === "prompt" ? (
                  <Input
                    style={{ marginBottom: "0" }}
                    type="textarea"
                    value={genDetails}
                    onChangeListener={setGenDetails}
                    placeholder={t("describePlaylist")}
                  />
                ) : (
                  <Input
                    style={{ marginBottom: "0" }}
                    sxInput={{ resize: "vertical", height: "25rem" }}
                    type="textarea"
                    value={systemPrompt}
                    onChangeListener={setSystemPrompt}
                    placeholder={t("describeSystemPrompt")}
                  />
                )}
                {currentPromptText === "system-prompt" && (
                  <p className="info">{t("systemPromptInfo")}</p>
                )}
              </div>
            )}
            {!openModalName && (
              <div
                className="align-center"
                style={{ gap: "0.5rem", width: "100%" }}
              >
                <p
                  onClick={() => {
                    if (loading) return;
                    setAutoGenerateOn((p) => !p);
                  }}
                  style={{ width: "3rem", padding: "0" }}
                  className={`playlist-action self-start ${
                    loading && "disabled"
                  }`}
                >
                  <span
                    class="material-symbols-outlined unfollow"
                    style={{ fontSize: "1.3rem", margin: "0" }}
                  >
                    cached
                  </span>
                </p>
                <p
                  onClick={async () => {
                    if (loading) return;
                    setTags([]);
                    if (autoGenerateOn) {
                      if (!genDetails) {
                        ShowNotification({
                          message: t("enterTextForGeneration"),
                          severity: "error",
                        });
                        return;
                      }
                      setLoading(true);

                      try {
                        const {
                          suggestedName,
                          allItems,
                          suggestedColor,
                          suggestedIcon,
                          suggestedDescription,
                        } = await thisBot.buildPlaylistFromAI({
                          aiModal: selectedAI,
                          text: genDetails,
                          prompt: systemPrompt,
                        });
                        if (!allItems?.length) {
                          setLoading(false);
                          ShowNotification({
                            message: t("unableToGeneratePlaylist"),
                            severity: "error",
                          });
                          return;
                        }
                        setHasGenrated(true);
                        setName(suggestedName);
                        setSelectedIcon(null);
                        setSelectedColor(suggestedColor);
                        setDescription(suggestedDescription);
                        startCreatingPlaylist(suggestedName, allItems, id);
                        setTags((prev) => {
                          const old = [...prev];
                          old.push("ai-generated", suggestedName);
                          return old;
                        });
                        setLoading(false);
                      } catch (er) {
                        console.log("ERROR IN MAKING PLAYLIST: ", er);
                        ShowNotification({
                          message: t("unableToGeneratePlaylist"),
                          severity: "error",
                        });
                        setLoading(false);
                      }
                      return;
                    }
                    toggleOpenModalName(true);
                    globalThis[`${id}setCustomIcon`](DEFAULT_UPLOAD_ICON);
                  }}
                  style={{ width: "100%", padding: "0" }}
                  className={`playlist-action self-start ${
                    loading && "disabled"
                  }`}
                >
                  {autoGenerateOn ? (
                    <>
                      <span class="material-symbols-outlined unfollow">
                        animated_images
                      </span>
                      <span>
                        {loading
                          ? t("generating")
                          : isLayers
                            ? t("generateLayers")
                            : t("generatePlaylist")}
                      </span>
                    </>
                  ) : (
                    <>
                      <span class="material-symbols-outlined unfollow">
                        playlist_add
                      </span>
                      <span>
                        {isLayers
                          ? t("createNewLayer")
                          : t("createNewPlaylist")}
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
        {openModalName && (
          <AddNewPlaylist
            id={id}
            isLayers={isLayers}
            editId={isEdit.current}
            parentId={id}
            link={link}
            renameScreen
            list={playList}
            setLink={setLink}
            selectedTags={selectedTags}
            onClickBackToDiscover={() => {
              toggleOpenModalName(false);
              G[`${id}creatingPlaylistName`] = "";
            }}
            setTags={setTags}
            customIcon={customIcon}
            setCustomIcon={setCustomIcon}
            setOpenModalName={toggleOpenModalName}
            checkNameDuplicate={checkNameDuplicate}
            publishAccess={publishAccess}
            setPublishAccess={setPublishAccess}
            startCreatingPlaylist={startCreatingPlaylist}
            loading={loading}
            setName={setName}
            name={name}
            setLoading={setLoading}
            handleSheetUrl={handleSheetUrl}
            customColor={customColor}
            setCustomColor={setCustomColor}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            selectedIcon={selectedIcon}
            setSelectedIcon={setSelectedIcon}
            description={description}
            setDescription={setDescription}
          />
        )}
      </div>
    </>
  );
};

return Playlist;

// We  will add Collections Later
// <Button
//     onClick={onBulkAddToCollection}
//     secondaryAlt
// >
//     <span style={{ marginRight: '0.5rem' }} class="material-symbols-outlined">
//         collections_bookmark
//     </span>
//     <span>Add To Collection</span>
// </Button>
