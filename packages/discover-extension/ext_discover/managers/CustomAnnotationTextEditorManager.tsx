import { computed, effect, signal, untracked } from "@preact/signals";
import {
  Editor,
  StarterKit,
  TextStyle,
  Color,
  TextAlign,
  Underline,
  Superscript,
  Subscript,
  Highlight,
  Link,
  BulletList,
  OrderedList,
  ListItem,
} from "https://esm.helloao.org/vendor-RPNXNWQB.js";
import { colorizeParagraphs } from "ext_discover.hooks.colorizeParagraphs";
import { uncolorizeHashtags } from "ext_discover.hooks.uncolorizeHashtags";
import {
  clamp,
  escapeHTML,
  fakeEscapeMediaTags,
  fakeUnescapeMediaTags,
  triggerDownload,
} from "ext_discover.hooks.customAnnotationTextEditorHtml";
import {
  Audio,
  CustomDiv,
  CustomImage,
  CustomSpan,
  Iframe,
  LineHeight,
  Video,
  getPlaylistID,
} from "ext_discover.hooks.customAnnotationTextEditorTiptapExtensions";
import {
  COMMAND_BOX_OPTIONS,
  DEFAULT_PROFILE,
  DEFAULT_TOOLBAR_PRIORITY,
  RECORDING_TYPES,
} from "ext_discover.models.customAnnotationTextEditor";
import type { CustomAnnotationTextEditorProps } from "ext_discover.interfaces.components.CustomAnnotationTextEditor";
import type { CustomAnnotationTextEditorManager } from "ext_discover.interfaces.managers.CustomAnnotationTextEditorManager";

const G = globalThis as Record<string, any>;

const managersByKey = new Map<string, CustomAnnotationTextEditorManager>();

export function getCustomAnnotationTextEditorManager(
  key: string,
  props: CustomAnnotationTextEditorProps
): CustomAnnotationTextEditorManager {
  const existing = managersByKey.get(key);
  if (existing) {
    existing.syncProps(props);
    return existing;
  }
  const manager = createCustomAnnotationTextEditorManager(props);
  managersByKey.set(key, manager);
  return manager;
}

function createCustomAnnotationTextEditorManager(
  initialProps: CustomAnnotationTextEditorProps
): CustomAnnotationTextEditorManager {
  const propsInstanceId = signal(initialProps.instanceId || "");
  const className = signal(initialProps.className);
  const style = signal(initialProps.style);
  const minHeight = signal(initialProps.minHeight ?? 300);
  const initialText = signal(initialProps.initialText);
  const initialHTML = signal(initialProps.initialHTML);
  const placeholderHTML = signal(
    initialProps.placeholderHTML ??
      '<p style="text-align: left;">Hello World!</p>'
  );
  const readOnly = signal(initialProps.readOnly ?? false);
  const priorityKey = signal(
    initialProps.priorityKey ?? "simple_rich_editor_toolbar_priority"
  );
  const defaultPriority = signal(
    initialProps.defaultPriority ?? DEFAULT_TOOLBAR_PRIORITY
  );
  const onChangeRef = { current: initialProps.onChange };
  const onAIHighlightRef = { current: initialProps.onAIHighlight };
  const showMoreOptions = signal(initialProps.showMoreOptions ?? true);
  const headingControls = signal(initialProps.headingControls ?? false);
  const editorId = signal(initialProps.id ?? "editor");
  const showPreview = signal(initialProps.showPreview ?? false);
  let setShowPreviewExternal = initialProps.setShowPreview || (() => {});

  const syncProps = (props: CustomAnnotationTextEditorProps) => {
    propsInstanceId.value = props.instanceId || propsInstanceId.value;
    className.value = props.className;
    style.value = props.style;
    minHeight.value = props.minHeight ?? 300;
    initialText.value = props.initialText;
    initialHTML.value = props.initialHTML;
    if (props.placeholderHTML) placeholderHTML.value = props.placeholderHTML;
    readOnly.value = props.readOnly ?? false;
    if (props.priorityKey) priorityKey.value = props.priorityKey;
    if (props.defaultPriority) defaultPriority.value = props.defaultPriority;
    onChangeRef.current = props.onChange;
    onAIHighlightRef.current = props.onAIHighlight;
    showMoreOptions.value = props.showMoreOptions ?? true;
    headingControls.value = props.headingControls ?? false;
    if (props.id) editorId.value = props.id;
    showPreview.value = props.showPreview ?? showPreview.value;
    if (props.setShowPreview) setShowPreviewExternal = props.setShowPreview;
  };

  const getInitialPriority = () => {
    const storage = {
      get(k: any) {
        try {
          return JSON.parse(window.localStorage.getItem(k) || "null");
        } catch {
          return null;
        }
      },
    };
    const inst =
      propsInstanceId.value || `sre_${Math.random().toString(36).slice(2)}`;
    const saved =
      storage.get(`${priorityKey.value}:${inst}`) ||
      storage.get(priorityKey.value);
    if (Array.isArray(saved) && saved.length) return saved;
    return defaultPriority.value;
  };

  let mounted = false;
  let editorCleanup: (() => void) | undefined;
  let resizeCleanup: (() => void) | undefined;
  let dragCleanup: (() => void) | undefined;
  const itemsRef: Record<string, HTMLElement | null> = {};

  // ----- ids & storage
  const _instanceId =
    propsInstanceId.value || `sre_${Math.random().toString(36).slice(2)}`;
  const storage = {
    get(k: any) {
      try {
        return JSON.parse(window.localStorage.getItem(k) || "null");
      } catch {
        return null;
      }
    },
    set(k: any, v: any) {
      try {
        window.localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };

  // ----- editor dom & state
  const editorRef = { current: null as any };
  const editorObjRef = { current: null as any };
  const canonicalHTMLRef = { current: "" as any };
  const loading = signal(false);
  const setLoading = (value: any) => {
    if (typeof value === "function") loading.value = value(loading.value);
    else loading.value = value;
  };
  const recording = signal(G.RecordingValue || null);
  const setRecording = (value: any) => {
    if (typeof value === "function") recording.value = value(recording.value);
    else recording.value = value;
  };
  const name = signal("");
  const setName = (value: any) => {
    if (typeof value === "function") name.value = value(name.value);
    else name.value = value;
  };
  const link = signal("");
  const setLink = (value: any) => {
    if (typeof value === "function") link.value = value(link.value);
    else link.value = value;
  };
  const commandBoxFilter = signal("");
  const setCommandBoxFilter = (value: any) => {
    if (typeof value === "function")
      commandBoxFilter.value = value(commandBoxFilter.value);
    else commandBoxFilter.value = value;
  };
  const isCommandBox = signal(false);
  const setIsCommandBox = (value: any) => {
    if (typeof value === "function")
      isCommandBox.value = value(isCommandBox.value);
    else isCommandBox.value = value;
  };

  G.SetCommandBoxFilter = setCommandBoxFilter;
  // synced in effect below

  const isTagSuggestionsOpen = signal(false);
  const setIsTagSuggestionsOpen = (value: any) => {
    if (typeof value === "function")
      isTagSuggestionsOpen.value = value(isTagSuggestionsOpen.value);
    else isTagSuggestionsOpen.value = value;
  };
  const isPlaylistSuggestionOpen = signal(false);
  const setIsPlaylistSuggestionOpen = (value: any) => {
    if (typeof value === "function")
      isPlaylistSuggestionOpen.value = value(isPlaylistSuggestionOpen.value);
    else isPlaylistSuggestionOpen.value = value;
  };

  const tagOptions = computed(() => [
    ...(G?.UsedTags || []).map((tag: any) => ({
      key: tag.label,
      label: tag.label,
    })),
  ]);

  const loadingPlaylistOptions = signal(G.isPlaylistLoading || false);
  const setLoadingPlaylistOptions = (value: any) => {
    if (typeof value === "function")
      loadingPlaylistOptions.value = value(loadingPlaylistOptions.value);
    else loadingPlaylistOptions.value = value;
  };

  const playlistOptions = computed(() => [
    ...(G?.[`defaultplaylists`] || []).map((playlist: any) => ({
      key: playlist.id,
      label: playlist.name,
      metaData: playlist,
    })),
  ]);

  const onClickTags = (tag: any) => {
    const tagHTML = `<span id=${showPreview.value ? "hashtag" : ""}>${tag.label}</span><br/>`;
    if (!editorObjRef.current) return;
    const { from } = editorObjRef.current.state.selection;
    // Replace the last typed "#" with "#tag"
    editorObjRef.current
      .chain()
      .focus()
      .insertContentAt({ from: from - 1, to: from }, `${tagHTML} `)
      .run();

    setIsTagSuggestionsOpen(false);
  };

  const savingPlaylist = signal(false);
  const setSavingPlaylist = (value: any) => {
    if (typeof value === "function")
      savingPlaylist.value = value(savingPlaylist.value);
    else savingPlaylist.value = value;
  };

  const createPlaylistLink = async (playlist: any) => {
    G.LatestPlaylistID = null;

    setSavingPlaylist(true);
    let shareProfileName = "Guest";
    let shareProfilePic = DEFAULT_PROFILE;
    const authBot = await os.requestAuthBotInBackground();
    if (authBot?.id) {
      const data = await os.getData(
        thisBot.tags.keyFetchAccountData,
        authBot.id
      );
      if (data.success) {
        const payload = data.data;
        shareProfileName = payload.profileName || "Guest";
        shareProfilePic = payload.photoLink || DEFAULT_PROFILE;
      }
    }

    const playlistObj = {
      ...playlist,
      shareProfileName,
      shareProfilePic,
      sharerID: authBot?.id || "N/A",
    };

    const id = G.createUUID();

    const result = await os.recordData(
      authBot.id,
      `${playlistObj.id}-${id}`,
      playlistObj,
      {
        marker: "publicRead",
      }
    );

    const recordShareKey = `${authBot.id}^_^${playlistObj.id}-${id}`;

    if (result.success) {
      G.LatestPlaylistID = recordShareKey;
      setSavingPlaylist(false);
    } else {
      G.LatestPlaylistID = null;
      ShowNotification({
        message: t("unableToCopy"),
        severity: "error",
      });
      setSavingPlaylist(false);
    }

    setLoading(false);
    return recordShareKey;
  };

  const onClickPlaylist = async (playlist: any) => {
    const playlistFind = playlistOptions.value.find(
      (playlistItr: any) => playlistItr.key === playlist.key
    );
    if (!G.PlaylistReferLinks) {
      G.PlaylistReferLinks = {};
    }

    let refId = "";

    if (!G.PlaylistReferLinks) {
      G.PlaylistReferLinks = {};
    }

    if (!G.PlaylistReferLinks[playlistFind.key]) {
      await createPlaylistLink(playlistFind.metaData);
      if (G.LatestPlaylistID) {
        G.PlaylistReferLinks[playlistFind.key] = G.LatestPlaylistID;
        refId = G.LatestPlaylistID;
      }
    } else {
      refId = G.PlaylistReferLinks[playlistFind.key];
    }

    if (!refId) return;
    if (!playlistFind) return;
    const playlistID = getPlaylistID(playlistFind.metaData.list);
    // let playlistHTML = `<p><span id="${refId}">< [${playlistID}] -----|---- [${playlist.label}]/> </span></p>`;
    let playlistHTML = `<div className="playlist-wrapper-sre">
        <div
          id="${refId}"
          className="playlist-container-sre"
          data-icon="${playlistID}"
          data-label="${playlist.label}"
        >
          <span className="playlist-icon-sre">${playlistID}</span>
          <span className="playlist-label-sre">${playlist.label}</span>
          <span id="${refId}" className="material-symbols-outlined sre-play-circle sre-play-circle-${refId}">play_circle</span> 
        </div>
      </div>
    `;

    if (!editorObjRef.current) return;

    const { from } = editorObjRef.current.state.selection;
    G.NeedToRemoveEmptyPTags = true;
    playlistHTML = fakeEscapeMediaTags(playlistHTML, showPreview.value);

    if (G.ThruCommandBox) {
      editorObjRef.current
        .chain()
        .focus()
        .insertContentAt({ from: from - 1, to: from }, playlistHTML)
        .run();
    } else {
      editorObjRef.current.chain().focus().insertContent(playlistHTML).run();
    }

    G.ThruCommandBox = false;

    setIsPlaylistSuggestionOpen(false);
  };

  const toggleTagSuggestions = () => {
    setIsTagSuggestionsOpen((prev) => !prev);
  };

  const togglePlaylistSuggestions = () => {
    setIsCommandBox(false);
    setIsPlaylistSuggestionOpen((prev) => !prev);
  };

  G.TogglePlaylistSuggestions = togglePlaylistSuggestions;

  const toggleCommandBox = () => {
    setIsCommandBox((prev) => !prev);
  };

  G.ToggleCommandBox = toggleCommandBox;

  const togglePreview = () => {
    setShowPreviewExternal((v: any) => {
      const next = !v;
      showPreview.value = next;
      if (!v && editorObjRef.current) {
        editorObjRef.current.commands.setContent(
          colorizeParagraphs(canonicalHTMLRef.current)
        );
      } else if (editorObjRef.current) {
        const editorHtml = editorObjRef.current.getHTML();
        G.NeedToRemoveEmptyPTags = true;
        const html = fakeEscapeMediaTags(uncolorizeHashtags(editorHtml));
        editorObjRef.current.commands.setContent(html);
      }
      return next;
    });
  };

  G.TogglePreview = togglePreview;

  effect(() => {
    G.RecordingValue = recording.value;
    G.SetLoadingPlaylistOptions = setLoadingPlaylistOptions;
    G.ShowCommandBox = toggleCommandBox;
    G.SetRecordingData = setData;
    G.SetRecording = setRecording;
    return () => {
      G.SetRecordingData = null;
      G.SetRecording = null;
      G.SetLoadingPlaylistOptions = null;
    };
  });

  const handleDropFiles = async (files: any) => {
    if (loading.value) return;
    setLoading(true);
    const data = await G.uploadFilesReusable(files);
    let html = "";

    data.forEach((file: any) => {
      const htmlSuffix = G.appendImageToEditorHTML(file);
      html += fakeEscapeMediaTags(htmlSuffix, showPreview.value);
    });

    if (html) {
      setTimeout(() => {
        if (!editorObjRef.current) return;
        if (G.ThruCommandBox) {
          G.ThruCommandBox = false;
          const { from } = editorObjRef.current.state.selection;
          editorObjRef.current
            .chain()
            .focus()
            .insertContentAt({ from: from - 1, to: from }, html)
            .run();
          return;
        }
        editorObjRef.current.chain().focus().insertContent(html).run();
      }, 50);
    }

    setLoading(false);
  };

  G.HandleUploadFiles = handleDropFiles;

  // colors & font size
  const textColor = signal("#000000");
  const setTextColor = (value: any) => {
    if (typeof value === "function") textColor.value = value(textColor.value);
    else textColor.value = value;
  };
  const bgColor = signal("#ffffff");
  const setBgColor = (value: any) => {
    if (typeof value === "function") bgColor.value = value(bgColor.value);
    else bgColor.value = value;
  };
  const fontPx = signal(16);
  const setFontPx = (value: any) => {
    if (typeof value === "function") fontPx.value = value(fontPx.value);
    else fontPx.value = value;
  };
  const lineSpacing = signal(1.6);
  const setLineSpacing = (value: any) => {
    if (typeof value === "function")
      lineSpacing.value = value(lineSpacing.value);
    else lineSpacing.value = value;
  };

  // padding controls
  const padY = signal(12);
  const setPadY = (value: any) => {
    if (typeof value === "function") padY.value = value(padY.value);
    else padY.value = value;
  };
  const padX = signal(12);
  const setPadX = (value: any) => {
    if (typeof value === "function") padX.value = value(padX.value);
    else padX.value = value;
  };

  // selection scope (all/headings/verses) — keep API parity; “verses/headings” act as all here
  const scope = signal("all");
  const setScope = (value: any) => {
    if (typeof value === "function") scope.value = value(scope.value);
    else scope.value = value;
  };

  // priorities
  const priority = signal<string[]>(getInitialPriority());
  const setPriority = (value: string[] | ((prev: string[]) => string[])) => {
    if (typeof value === "function") priority.value = value(priority.value);
    else priority.value = value;
  };

  // overflow calc
  const toolbarRef = { current: null as any };
  const measurerRef = { current: null as any };
  const itemsRef = useRef<any>({});
  const visibleIds = signal([]);
  const setVisibleIds = (value: any) => {
    if (typeof value === "function") visibleIds.value = value(visibleIds.value);
    else visibleIds.value = value;
  };
  const overflowIds = signal([]);
  const setOverflowIds = (value: any) => {
    if (typeof value === "function")
      overflowIds.value = value(overflowIds.value);
    else overflowIds.value = value;
  };
  const showOverflow = signal(false);
  const setShowOverflow = (value: any) => {
    if (typeof value === "function")
      showOverflow.value = value(showOverflow.value);
    else showOverflow.value = value;
  };

  // tuning modal
  const showTuning = signal(false);
  const setShowTuning = (value: any) => {
    if (typeof value === "function") showTuning.value = value(showTuning.value);
    else showTuning.value = value;
  };
  const draftOrder = signal(priority);
  const setDraftOrder = (value: any) => {
    if (typeof value === "function") draftOrder.value = value(draftOrder.value);
    else draftOrder.value = value;
  };

  // --- priority API per instance
  effect(() => {
    window.SimpleEditorToolbar = window.SimpleEditorToolbar || {};
    window.SimpleEditorToolbar[_instanceId] = {
      setPriorities: (ids: any) => {
        if (!Array.isArray(ids) || !ids.length) return;
        setPriority(ids);
        storage.set(`${priorityKey}:${_instanceId}`, ids);
      },
      getPriorities: () => priority.value.slice(),
      resetPriorities: () => {
        setPriority(defaultPriority);
        storage.set(`${priorityKey}:${_instanceId}`, defaultPriority);
      },
    };
    // cleanup
    return () => {
      delete window.SimpleEditorToolbar?.[_instanceId];
    };
  });

  const onAddExternalLink = (data: any) => {
    console.log("data", data);
  };

  const typingDeboncingTimeout = { current: null as any };

  function applyPadding(py: number, px: number) {
    const el = editorRef.current;
    if (!el) return;
    el.style.paddingTop = `${py}px`;
    el.style.paddingBottom = `${py}px`;
    el.style.paddingLeft = `${px}px`;
    el.style.paddingRight = `${px}px`;
  }

  const initEditor = () => {
    if (!editorRef.current) return;

    const contentHTML = (() => {
      canonicalHTMLRef.current = initialHTML.value;
      if (typeof initialHTML.value === "string")
        return fakeEscapeMediaTags(
          uncolorizeHashtags(initialHTML.value),
          showPreview.value
        );
      if (typeof initialText.value === "string")
        return `<p>${escapeHTML(initialText.value)}</p>`;
      return fakeEscapeMediaTags(
        uncolorizeHashtags(placeholderHTML.value),
        showPreview.value
      );
    })();

    const editor = new Editor({
      element: editorRef.current,
      editable: !readOnly.value,
      extensions: [
        StarterKit.configure({
          heading: true,
          blockquote: true,
          paragraph: { HTMLAttributes: { style: "text-align: left;" } },
        }),
        TextStyle,
        Color.configure({ types: ["textStyle"] }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
          defaultAlignment: "left",
        }),
        Underline,
        Superscript,
        Subscript,
        Highlight.configure({ multicolor: true }),
        BulletList,
        OrderedList,
        Video,
        Iframe,
        ListItem,
        LineHeight,
        Audio,
        CustomImage.configure({ inline: false, allowBase64: true }),
        Link.configure({ openOnClick: true, linkOnPaste: true }),
        CustomSpan,
        CustomDiv,
      ],
      editorProps: {
        handleDOMEvents: {
          keyup: (_: any, event: any) => {
            if (event.key === "Shift") {
              return true;
            }

            G.LASTKEY_COMMAND_BOX = event.key;
            if (G.ISCommandBox) {
              G.SetCommandBoxFilter((prev: any) => {
                const value = `${prev || ""}`;
                if (event.key === "Backspace") {
                  if (G.LASTKEY_COMMAND_BOX === "Backspace") {
                    toggleCommandBox();
                    return "";
                  }
                  if (value.length === 0) {
                    toggleCommandBox();
                    return "";
                  }
                  return value.slice(0, -1);
                }
                return `${value}${event.key}`;
              });

              if (event.key.trim() === "" || event.key.trim() === "Enter") {
                G.SetCommandBoxFilter("");
                setIsCommandBox(false);
              }
              return;
            }
            if (event.key === "/") {
              toggleCommandBox();
              return;
            }
            // setIsCommandBox(false);
            setIsPlaylistSuggestionOpen(false);
            if (event.key === "#" && tagOptions.value.length > 0) {
              toggleTagSuggestions();
              return;
            }
            setIsTagSuggestionsOpen(false);
            return true;
          },
          // Block keyboard and menu copy/cut
          copy: () => {
            // event.preventDefault();
            return true;
          },
          cut: () => {
            // event.preventDefault();
            return true;
          },
          // (Optional) stop dragging out selections / drags
          dragstart: (_: any, event: any) => {
            event.preventDefault();
            return true;
          },
          paste: async (_: any, event: any) => {
            const items = event?.clipboardData?.items;

            // 🔴 STOP DEFAULT PASTE IMMEDIATELY
            event.preventDefault();
            event.stopPropagation();

            const plainText = event.clipboardData.getData("text/plain");
            const htmlText = event.clipboardData.getData("text/html");

            // const pastedText = [];
            if (!items || !items.length) return false;
            const files = [];
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.kind === "file") {
                const file = item.getAsFile();
                if (file) files.push(file);
              }
              // if (item.kind === "string") {
              //   const text = await item.getAsString();
              //   console.log("text", text);
              //   pastedText.push(text);
              // }
            }
            setLoading(true);
            const data = await G.uploadFilesReusable({
              files,
            });
            setLoading(false);

            let html = "";

            data.forEach((file: any) => {
              const htmlSuffix = G.appendImageToEditorHTML(file);
              html += fakeEscapeMediaTags(htmlSuffix, showPreview.value);
            });

            if (plainText) {
              const embedHTML = fakeEscapeMediaTags(
                G.generateEmbedFromUrl(plainText.trim()),
                showPreview
              );

              if (embedHTML) {
                setTimeout(() => {
                  editor.chain().focus().insertContent(embedHTML).run();
                }, 50);
              } else if (htmlText) {
                setTimeout(() => {
                  editor.chain().focus().insertContent(htmlText).run();
                }, 50);
              } else {
                setTimeout(() => {
                  editor.chain().focus().insertContent(plainText).run();
                }, 50);
              }
              return true;
            }

            if (html) {
              setTimeout(() => {
                editor.chain().focus().insertContent(html).run();
              }, 50);
              return true;
            }
          },
          drop: async () => {
            return true;
          },
        },
      },
      content: contentHTML,
    });

    editorObjRef.current = editor;

    editor.on("update", () => {
      try {
        // if the editor html ending with '/' then toggle the command box
        const editorHTML = editor.getHTML();

        const html = fakeUnescapeMediaTags(colorizeParagraphs(editorHTML));
        canonicalHTMLRef.current = html;

        if (onChangeRef.current) {
          onChangeRef.current(
            html.replace(/\bclass(name)?\s*=/gi, "class="),
            editor.getJSON()
          );
        }
      } catch {}
    });

    G[`${editorId.value}ClearEditorContent`] = () =>
      editor.commands.setContent("");

    // apply initial paddings
    applyPadding(padY.value, padX.value);

    return () => {
      editor.destroy();
      editorObjRef.current = null;
    };
  };

  // ---- helpers for marks on whole doc (scope kept for API parity)
  const applyMarkWholeDoc = (markName: any, attrs = null) => {
    const editor = editorObjRef.current;
    if (!editor) return;
    const { state, view } = editor;
    const { tr, schema, doc } = state;
    const mt = schema.marks[markName];
    if (!mt) return;
    const from = 0;
    const to = doc.content.size;
    tr.addMark(from, to, mt.create(attrs || {}));
    if (tr.docChanged) view.dispatch(tr);
  };

  // ---- toolbar commands (same options)
  const Cmds = {
    video: () => {
      shout("startRecording", RECORDING_TYPES.video);
    },
    mic: () => {
      shout("startRecording", RECORDING_TYPES.audio);
    },
    slash: () => {
      shout("showCommandBox", RECORDING_TYPES.audio);
    },
    bold: () => chain("toggleBold"),
    italic: () => chain("toggleItalic"),
    underline: () => chain("toggleUnderline"),
    strikethrough: () => chain("toggleStrike"),
    superscript: () => chainWith("toggleSuperscript"),
    subscript: () => chainWith("toggleSubscript"),
    alignLeft: () => chainArg("setTextAlign", "left"),
    alignCenter: () => chainArg("setTextAlign", "center"),
    alignRight: () => chainArg("setTextAlign", "right"),
    alignJustify: () => chainArg("setTextAlign", "justify"),
    toggleBulletList: () => chainWith("toggleBulletList"),
    toggleOrderedList: () => chainWith("toggleOrderedList"),
    undo: () => chainWith("undo"),
    redo: () => chainWith("redo"),
    clear: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().clearNodes().unsetAllMarks().run();
    },
    setTextColor: (color: any) => {
      setTextColor(color);
      const ed = editorObjRef.current;
      if (!ed) return;
      // keep simple whole-doc behavior for parity
      try {
        ed.chain().focus().setColor(color).run();
      } catch {}
    },
    setHighlightColor: (color: any) => {
      setBgColor(color);
      const ed = editorObjRef.current;
      if (!ed) return;
      try {
        ed.chain().focus().setMark("highlight", { color }).run();
      } catch {}
    },
    setFontFamily: (font: any) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain()
        .focus()
        .setMark("textStyle", { style: `font-family:${font};` })
        .run();
    },
    setFontSize: (px: any) => {
      setFontPx(px);
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain()
        .focus()
        .setMark("textStyle", { style: `font-size:${px}px;` })
        .run();
    },
    setLineHeight: (lh: any) => {
      setLineSpacing(lh);
      const ed = editorObjRef.current;
      if (!ed) return;
      // mark across the whole doc
      const { state, view } = ed;
      const { tr, schema, doc } = state;
      const mt = schema.marks.lineHeight;
      if (!mt) return;
      tr.addMark(0, doc.content.size, mt.create({ lineHeight: lh }));
      if (tr.docChanged) view.dispatch(tr);
    },
    insertImageDataURL: (dataURL: any) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().setImage({ src: dataURL }).run();
    },
    insertLink: (href: any) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
    },
    removeLink: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      ed.chain().focus().unsetLink().run();
    },
    getHTML: () => editorObjRef.current?.getHTML() || "",
    setHTML: (html: any) => editorObjRef.current?.commands.setContent(html),
    exportJSON: () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      const data = JSON.stringify(ed.getJSON(), null, 2);
      const blob = new Blob([data], { type: "application/json;charset=utf-8" });
      triggerDownload(blob, "editor-content.json");
    },
    importJSON: (json: any) => {
      const ed = editorObjRef.current;
      if (!ed) return;
      try {
        const parsed = typeof json === "string" ? JSON.parse(json) : json;
        ed.commands.setContent(parsed);
      } catch (e) {
        alert("Invalid JSON");
      }
    },
    print: () => window.print(),
    aiHighlight: async () => {
      const ed = editorObjRef.current;
      if (!ed) return;
      if (!onAIHighlightRef.current) {
        alert("Provide onAIHighlight prop to enable this.");
        return;
      }
      const html = ed.getHTML();
      try {
        const newHTML = await onAIHighlightRef.current!(html);
        if (newHTML && typeof newHTML === "string") {
          ed.commands.setContent(newHTML);
        }
      } catch (e) {
        console.error(e);
      }
    },
  };

  // chain helpers
  function chain(method: any) {
    const ed = editorObjRef.current;
    if (!ed) return;
    ed.chain().focus()[method]().run();
  }
  function chainWith(method: any) {
    const ed = editorObjRef.current;
    if (!ed) return;
    if (typeof ed.chain().focus()[method] === "function")
      ed.chain().focus()[method]().run();
  }
  function chainArg(method: any, arg: any) {
    const ed = editorObjRef.current;
    if (!ed) return;
    ed.chain().focus()[method](arg).run();
  }

  // ---- uploads: image & JSON via native inputs
  const fileImgInput = { current: null as HTMLInputElement | null };
  const fileJsonInput = { current: null as HTMLInputElement | null };
  const fileLinkInput = { current: null as HTMLInputElement | null };

  const onPickImage = () => fileImgInput.current?.click();
  const onImageSelected = (e: any) => {
    handleDropFiles({
      files: Array.from(e.target.files),
    });
  };

  const onPickJSON = () => fileJsonInput.current?.click();
  const onJSONSelected = (e: any) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => Cmds.importJSON(reader.result);
    reader.readAsText(f, "utf-8");
    e.target.value = "";
  };

  const onAddLink = () => {
    const href = prompt("Enter URL:");
    if (href) Cmds.insertLink(href);
  };

  // ---- responsive overflow compute (auto-size items)
  const computeLayout = () => {
    const toolbarEl = toolbarRef.current;
    const measurerEl = measurerRef.current;
    if (!toolbarEl || !measurerEl) return;

    const ids = orderedIds();
    const toolbarWidth = toolbarEl.clientWidth;
    const overflowBtnWidth = 44;
    const paddingSafety = 8;
    const available = Math.max(
      0,
      toolbarWidth - overflowBtnWidth - paddingSafety
    );

    let used = 0;
    const vis: any[] = [];
    const over: any[] = [];
    for (const id of ids) {
      const el = itemsRef[id];
      if (!el) continue;
      const w = el.offsetWidth + 10;
      if (used + w <= available && (!headingControls.value || vis.length < 3)) {
        vis.push(id);
        used += w;
      } else {
        over.push(id);
      }
    }

    if (headingControls.value) {
      ["text-color", "bg-color", "align"].forEach((ele) => {
        vis.push(ele);
      });
    }

    setVisibleIds(vis);
    setOverflowIds(over);
  };

  const isMic = computed(() => recording.value === RECORDING_TYPES.audio);
  const isVideo = computed(() => recording.value === RECORDING_TYPES.video);
  const isLink = computed(() => recording.value === RECORDING_TYPES.link);

  const data = signal(G.AnnotationsRecordingData || null);
  const setData = (value: any) => {
    if (typeof value === "function") data.value = value(data.value);
    else data.value = value;
  };

  const onSaveAndAdd = async () => {
    if (isLink.value) {
      if (!link.value.trim())
        return ShowNotification({
          message: t("pleaseEnterALinkToSave"),
          severity: "error",
        });

      const originalHTML = G.generateEmbedFromUrl(
        link.value.trim(),
        name.value.trim()
      );
      const embedHTML = fakeEscapeMediaTags(originalHTML, showPreview.value);

      if (embedHTML === null) {
        G.ThruCommandBox = false;
        return ShowNotification({
          message: t("invalidLink"),
          severity: "error",
        });
      }
      if (G.ThruCommandBox) {
        G.ThruCommandBox = false;
        const { from } = editorObjRef.current.state.selection;
        editorObjRef.current
          .chain()
          .focus()
          .insertContentAt({ from: from - 1, to: from }, embedHTML)
          .run();
      } else {
        editorObjRef.current.chain().focus().insertContent(embedHTML).run();
      }
      setLink("");
      setName("");
      setRecording(null);
      return;
    }

    if (recording.value === RECORDING_TYPES.audio && !data.value) {
      return ShowNotification({
        message: t("pleaseRecordSomethingToSave"),
        severity: "error",
      });
    }

    if (recording.value === RECORDING_TYPES.video && !data.value) {
      return ShowNotification({
        message: t("pleaseRecordSomethingToSave"),
        severity: "error",
      });
    }

    await os.sleep(100);

    if (!data.value)
      return ShowNotification({
        message: t("pleaseRecordSomethingToSave"),
        severity: "error",
      });

    const finalData =
      recording.value === RECORDING_TYPES.audio ? G.ORIGINAL_DATA : data.value;

    if (
      recording.value === RECORDING_TYPES.audio ||
      recording.value === RECORDING_TYPES.video
    ) {
      setLoading(true);
      G.IsSavingAndAdding = true;
      const fileSave: any = await os.recordFile(G?.RECORD_STOREKEY, finalData, {
        name: `${new Date().toISOString()}.${recording.value === RECORDING_TYPES.audio ? "webm" : "mp4"}`,
        mimeType: recording.value,
      });

      const url = fileSave.url || fileSave?.existingFileUrl;

      setLoading(false);
      G.IsSavingAndAdding = false;

      if (!url) {
        G.ThruCommandBox = false;
        return ShowNotification({
          message: t("failedToUploadFile"),
          severity: "error",
        });
      }
      let htmlToInsert;
      if (isVideo.value) {
        htmlToInsert = `
        <video
          src="${url}"
          controls
          height="100%"
          style="max-width: 100%;"
        ></video>
        `;
      } else {
        htmlToInsert = `
        <audio controls src="${url}" type="audio/webm" class="annotation-audio">
        </audio>
        `;
      }

      htmlToInsert = fakeEscapeMediaTags(htmlToInsert, showPreview.value);

      if (G.ThruCommandBox) {
        G.ThruCommandBox = false;
        const { from } = editorObjRef.current.state.selection;
        editorObjRef.current
          .chain()
          .focus()
          .insertContentAt({ from: from - 1, to: from }, htmlToInsert)
          .run();
      } else {
        editorObjRef.current.chain().focus().insertContent(htmlToInsert).run();
      }

      setRecording(null);
      setData(null);
    }
  };

  const filteredCommandBoxOptions = computed(() => {
    return COMMAND_BOX_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(commandBoxFilter.value.toLowerCase())
    );
  });

  const moveDraft = (i: number, dir: number) => {
    setDraftOrder((prev: string[]) => {
      const arr = prev.slice();
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  };

  const saveDraft = () => {
    setPriority(draftOrder.value);
    storage.set(`${priorityKey.value}:${_instanceId}`, draftOrder.value);
    setShowTuning(false);
  };

  const allToolbarIds = [
    "mic",
    "video",
    "slash",
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "superscript",
    "subscript",
    "align",
    "list",
    "line-spacing",
    "text-color",
    "bg-color",
    "paragraph",
    "font-family",
    "font-style",
    "font-size",
    "undo",
    "redo",
    "clear",
    "print",
    "margins-y",
    "margins-x",
    "link",
    "image",
    "download",
    "upload",
    "ai",
    "tune",
  ];
  function orderedIds() {
    const known = priority.value.filter((id) => allToolbarIds.includes(id));
    const missing = allToolbarIds.filter((id) => !known.includes(id));
    const out = [...known, ...missing];
    const idxTune = out.indexOf("tune");
    if (idxTune !== -1) out.splice(idxTune, 1);
    out.push("tune");
    return out;
  }

  const setEditorRef = (el: HTMLElement | null) => {
    editorRef.current = el;
    if (el && mounted && !editorObjRef.current) initEditor();
  };
  const setToolbarRef = (el: HTMLElement | null) => {
    toolbarRef.current = el;
  };
  const setMeasurerRef = (el: HTMLElement | null) => {
    measurerRef.current = el;
  };
  const setItemRef = (id: string, el: HTMLElement | null) => {
    itemsRef[id] = el;
  };
  const setFileImgInputRef = (el: HTMLInputElement | null) => {
    fileImgInput.current = el;
  };
  const setFileJsonInputRef = (el: HTMLInputElement | null) => {
    fileJsonInput.current = el;
  };

  const dragState = signal({ isDragOver: false });
  const setDragRootRef = (el: HTMLElement | null) => {
    dragRef.current = el;
    if (!el || dragCleanup) return;
    let dragCounter = 0;
    const handleDragEnter = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter += 1;
      if (dragCounter === 1) dragState.value = { isDragOver: true };
    };
    const handleDragLeave = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter -= 1;
      if (dragCounter === 0) dragState.value = { isDragOver: false };
    };
    const handleDragOver = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      const files = Array.from(e.dataTransfer?.files || []);
      await handleDropFiles({ files });
      dragState.value = { isDragOver: false };
    };
    el.addEventListener("dragenter", handleDragEnter);
    el.addEventListener("dragleave", handleDragLeave);
    el.addEventListener("dragover", handleDragOver);
    el.addEventListener("drop", handleDrop);
    dragCleanup = () => {
      dragCounter = 0;
      el.removeEventListener("dragenter", handleDragEnter);
      el.removeEventListener("dragleave", handleDragLeave);
      el.removeEventListener("dragover", handleDragOver);
      el.removeEventListener("drop", handleDrop);
    };
  };

  const dragRef = { current: null as HTMLElement | null };
  const getInstanceKey = () => _instanceId;

  effect(() => {
    G.ISCommandBox = isCommandBox.value;
  });
  effect(() => {
    G.RecordingValue = recording.value;
  });
  effect(() => {
    G.AnnotationsRecordingData = data.value;
  });

  const mount = () => {
    if (mounted) return;
    mounted = true;
    effect(() => {
      G.RecordingValue = recording.value;
      G.SetLoadingPlaylistOptions = setLoadingPlaylistOptions;
      G.ShowCommandBox = toggleCommandBox;
      G.SetRecordingData = setData;
      G.SetRecording = setRecording;
    });
    if (editorRef.current && !editorObjRef.current) {
      editorCleanup = initEditor() || undefined;
    }
    const ro = new ResizeObserver(() => computeLayout());
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    const onR = () => computeLayout();
    window.addEventListener("resize", onR);
    const t = setTimeout(computeLayout, 120);
    resizeCleanup = () => {
      ro.disconnect();
      window.removeEventListener("resize", onR);
      clearTimeout(t);
    };
    effect(() => {
      priority.value.join("|");
      computeLayout();
    });
    effect(() => {
      applyPadding(padY.value, padX.value);
    });
  };

  const unmount = () => {
    mounted = false;
    editorCleanup?.();
    resizeCleanup?.();
    dragCleanup?.();
    G.SetRecordingData = null;
    G.SetRecording = null;
    G.SetLoadingPlaylistOptions = null;
  };

  return {
    instanceId: propsInstanceId,
    className,
    style,
    minHeight,
    showMoreOptions,
    headingControls,
    editorId,
    showPreview,
    loading,
    recording,
    name,
    link,
    commandBoxFilter,
    isCommandBox,
    isTagSuggestionsOpen,
    isPlaylistSuggestionOpen,
    loadingPlaylistOptions,
    savingPlaylist,
    textColor,
    bgColor,
    fontPx,
    lineSpacing,
    padY,
    padX,
    priority,
    visibleIds,
    overflowIds,
    showOverflow,
    showTuning,
    draftOrder,
    data,
    dragState,
    tagOptions,
    playlistOptions,
    isMic,
    isVideo,
    isLink,
    filteredCommandBoxOptions,
    syncProps,
    mount,
    unmount,
    setEditorRef,
    setToolbarRef,
    setMeasurerRef,
    setItemRef,
    setDragRootRef,
    setFileImgInputRef,
    setFileJsonInputRef,
    getInstanceKey,
    onClickTags,
    onClickPlaylist,
    toggleTagSuggestions,
    togglePlaylistSuggestions,
    toggleCommandBox,
    togglePreview,
    handleDropFiles,
    onSaveAndAdd,
    onImageSelected,
    onJSONSelected,
    onAddLink,
    onPickImage,
    onPickJSON,
    moveDraft,
    saveDraft,
    orderedIds,
    chain,
    chainWith,
    chainArg,
    computeLayout,
    setTextColor,
    setBgColor,
    setFontPx,
    setLineSpacing,
    setPadY,
    setPadX,
    setName,
    setLink,
    setData,
    setRecording,
    setLoading,
    setIsTagSuggestionsOpen,
    setIsPlaylistSuggestionOpen,
    setShowOverflow,
    setShowTuning,
    setDraftOrder,
    Cmds,
  } as CustomAnnotationTextEditorManager;
}
