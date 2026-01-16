// i18n configuration using CDN
// Loads i18next and react-i18next from CDN

const i18nScripts = [
  "https://unpkg.com/i18next@23.16.4/i18next.min.js",
  "https://unpkg.com/react-i18next@15.1.3/react-i18next.min.js",
  "https://unpkg.com/i18next-browser-languagedetector@8.0.2/i18nextBrowserLanguageDetector.min.js",
];

// Default translations embedded for immediate use
const resources = {
  en: {
    translation: {
      // Common actions
      save: "Save",
      saveChanges: "Save changes",
      saveOrder: "Save Order",
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
      deleteAll: "Delete All",
      edit: "Edit",
      add: "Add",
      search: "Search",
      select: "Select",
      deselect: "Deselect",
      selectAll: "Select All",
      reset: "Reset",
      resetToDefault: "Reset to Default",
      install: "Install",
      uninstall: "Uninstall",
      import: "Import",
      export: "Export",
      browse: "Browse",
      share: "Share",
      follow: "Follow",
      invite: "Invite",
      or: "Or",
      on: "On",
      off: "Off",

      // Navigation
      home: "Home",
      back: "Back",
      next: "Next",
      previous: "Previous",
      exit: "Exit",

      // Settings - Main
      settings: "Settings",
      generalSettings: "General Settings",
      spaceSettings: "Space Settings",
      advancedSettings: "Advanced settings",
      manageAccountDesc: "Manage your account, profile, and preferences.",

      // Settings - Categories
      themeAndText: "Theme & Text",
      configureExtensions: "Configure Extensions",
      bibleDefaults: "Bible Defaults",
      bookOrder: "Book Order",
      editor: "Editor",
      ai: "AI",
      tab: "Tab",
      language: "Language",

      // Settings - Account
      yourAccount: "Your account",
      accountSettings: "Account settings",
      billingServices: "Billing & services",
      permissions: "Permissions",
      notifications: "Notifications",
      subscriptions: "Subscriptions",
      createProfile: "Create profile",
      openAccountSettings: "Open account settings",

      // Settings - Space
      loadNewSpace: "Load new space",
      createNewSpace: "Create a new space",
      editSpace: "Edit space",
      importSpace: "Import space",
      enterUrl: "Enter Url",
      propagate: "Propagate",

      // Theme Settings
      theme: "Theme",
      themes: "Themes",
      defaultTheme: "Default",
      darkMode: "Dark Mode",
      purpleSerenity: "Purple Serenity",
      greenNature: "Green Nature",
      oceanBlue: "Ocean Blue",
      warmAmber: "Warm Amber",

      // Theme - Colors
      panelBackground: "Menu background",
      panelBackground: "Panel background",
      pageBackground: "Page Background",
      pageTextColor: "Page text color",
      iconsColor: "Icons color",
      primaryButtonBg: "Primary button background",
      primaryButtonText: "Primary button text",
      secondaryButtonBg: "Secondary button background",
      buttonBorder: "Button border",
      tabSelection: "Tab Selection",
      spaceSelection: "Space selection",
      toolbarBackground: "Toolbar background",
      primaryText: "Primary text",
      secondaryText: "Secondary text",

      // Advanced Settings Sections
      selectMainColors: "Select main colors",
      containerBackgrounds: "Container Backgrounds",
      tab: "Tab",
      buttons: "Buttons",
      scriptureText: "Scripture text",
      sideMenu: "Side menu",
      selectionUIToolbar: "Selection UI & toolbar",
      inputFields: "Input fields",
      branding: "Branding",
      apply: "Apply",
      primary: "Primary",
      secondary: "Secondary",
      tertiary: "Tertiary",

      // Tab section
      activeTabContainer: "Active tab container",
      activeTabBackground: "Active tab background",
      activeTabText: "Active tab text",
      simpleTabText: "Simple tab text",
      inactiveTabText: "Inactive tab text",
      showTabIcon: "Show tab icon",
      border: "Border",
      fill: "Fill",

      // Buttons section
      primaryButton: "Primary button",
      secondaryButton: "Secondary button",
      tertiaryButton: "Tertiary button",
      secondaryButtonText: "Secondary button text",

      // Scripture text section
      bookHeading: "Book heading",
      chapterHeading: "Chapter heading",
      verseNumber: "Verse number",
      verseText: "Verse text",

      // Side menu section
      heading1: "Heading 1",
      heading2: "Heading 2",
      heading3: "Heading 3",
      descriptionText: "Description text",
      menuText: "Menu text",
      breadcrumbs: "Breadcrumbs",
      sectionBackground: "Section background",
      spaceName: "Space Name",
      icons: "Icons",
      selectedSpace: "Selected Space",
      unselectedSpace: "Unselected space",
      spaceNameText: "Space name text",
      addButtonBackground: "Add button background",
      addButtonIcon: "Add button icon",
      selectPanelIcon: "Select panel icon",
      openCloseMenuIcon: "Open/close menu panel icon",
      moreIcon: "More icon",
      settingsIcon: "Settings icon",
      inactiveSpaceIndicator: "Inactive space indicator/icon",
      activeSpaceIndicator: "Active space icon/indicator",
      profileAvatar: "Profile avatar",

      // Selection UI & toolbar section
      toolbar: "Toolbar",
      toolbarIcons: "Toolbar Icons",
      selectionUI: "Selection UI",
      selectionIcons: "Selection Icons",
      selectionUIDescription: "Selection UI menu for your page...",
      showSelectedItems: "Show selected verses",
      showHighlightColors: "Show highlight UI",
      showIconText: "Show Icon text",
      copyVerse: "Copy verse",
      onlyVerseText: "Only verse text",
      verseTextWithReference: "Verse text with reference",

      // Input fields section
      title: "Title",
      placeholder: "Placeholder",
      activeState: "Active state",
      inactiveState: "Inactive state",
      inputBackground: "Input background",
      inputBorder: "Input border",
      inputText: "Input text",
      inputPlaceholder: "Input placeholder",

      // Branding section
      companyName: "Company name",
      logo: "Logo",
      logoColor: "Logo color",
      accentColor: "Accent color",

      // Theme - Options
      showTabIcons: "Show Tab Icons",
      showChapterHeadings: "Show chapter headings",
      showVerseNumbers: "Show verses numbers",
      font: "Font",

      // Text Settings
      textSettings: "Text Settings",

      // Tabs/Spaces
      tabs: "Tabs",
      newTab: "New Tab",
      pageTab: "Page tab",
      newSpace: "New Space",
      closeTab: "Close Tab",
      deleteTab: "Delete tab",
      newFolder: "New folder",
      addToFolder: "Add to {{folder}}",
      editMode: "Edit mode",
      allUsers: "All Users",
      book: "Book",
      chapter: "Chapter",

      // Toolbar
      tools: "Tools",
      fullScreen: "Full screen",
      splitScreen: "Split Screen",
      showSearch: "Show Search",
      hideSearch: "Hide Search",

      // Editor - Toolbar Items
      textSelect: "Text Select",
      bold: "Bold",
      italic: "Italic",
      underline: "Underline",
      strikethrough: "Strikethrough",
      superscript: "Superscript",
      subscript: "Subscript",
      alignment: "Alignment",
      lists: "Lists",
      lineSpacing: "Line Spacing",
      attachFile: "Attach File",
      insertImage: "Insert Image",
      textColor: "Text Color",
      highlightColor: "Highlight Color",
      paragraph: "Paragraph",
      fontFamily: "Font Family",
      fontStyle: "Font Style",
      fontSize: "Font Size",
      undo: "Undo",
      redo: "Redo",
      clearFormatting: "Clear Formatting",
      print: "Print",
      verticalMargin: "Vertical Margin",
      horizontalMargin: "Horizontal Margin",
      aiPrompt: "AI Prompt",
      download: "Download",
      upload: "Upload",
      customizeToolbar: "Customize toolbar",
      editorToolbarOrder: "Editor Toolbar Item Order (Priority)",

      // Editor - Descriptions
      boldDesc: "Make text bold",
      italicDesc: "Make text italic",
      underlineDesc: "Underline text",
      strikethroughDesc: "Strike through text",
      superscriptDesc: "Make text superscript",
      subscriptDesc: "Make text subscript",
      alignmentDesc: "Change text alignment",
      listsDesc: "Create bulleted or numbered lists",
      lineSpacingDesc: "Adjust line spacing",
      attachFileDesc: "Attach a file",
      insertImageDesc: "Insert an image",
      textColorDesc: "Change text color",
      highlightColorDesc: "Highlight text",
      paragraphDesc: "Change paragraph style",
      fontFamilyDesc: "Change font family",
      fontStyleDesc: "Change font style",
      fontSizeDesc: "Change font size",
      undoDesc: "Undo last action",
      redoDesc: "Redo last action",
      clearFormattingDesc: "Clear all formatting",
      printDesc: "Print document",
      verticalMarginDesc: "Adjust vertical margin",
      horizontalMarginDesc: "Adjust horizontal margin",
      aiPromptDesc: "Use AI assistance",
      downloadDesc: "Download document",
      uploadDesc: "Upload document",
      textSelectDesc: "Select text",

      // Editor - Alignment
      left: "Left",
      center: "Center",
      right: "Right",
      justify: "Justify",

      // Editor - Lists
      bulleted: "Bulleted",
      numbered: "Numbered",

      // Sessions
      startSession: "Start session",
      inviteToSession: "Invite to session",
      joinAnotherSession: "Join a session",
      goPrivate: "Go private",
      goPublic: "Go public",
      joinSession: "Join Session",
      enterSessionCode: "Enter session code to join new session",
      sessionCodePlaceholder: "Enter Session code",
      join: "Join",

      // Help
      reportBug: "Report a bug",
      help: "Help",

      // Extensions
      showInToolbar: "Show in Toolbar",
      orShowIn: "Or show in",
      panel: "Panel",
      belowThePage: "Below the page",
      extensionSettingsDesc: "Settings for your Extensions in the page",

      // Canvas/Mindmap
      wordTool: "Word Tool",
      mindmap: "Mindmap",
      chatGPT: "ChatGPT",
      dallE: "Dall-E",
      separateNode: "Separate Node",
      voiceNote: "Voice Note",
      canvasSettingsDesc:
        "Settings for Word Tool and Mindmap features in the canvas",

      // AI Models
      gpt4: "GPT4",
      gpt3: "GPT3",
      claude: "Claude",
      dallE3: "dallE 3",
      dallE2: "dallE 2",
      stabilityAI: "StabilityAI",
      alloy: "Alloy",
      echo: "Echo",
      fable: "Fable",
      onyx: "Onyx",
      nova: "Nova",
      shimmer: "Shimmer",

      // Notifications
      updateAvailable: "AO Lab update available!",
      clickToRestart: "Click to restart",
      whatsNew: "What's new?",

      // Account
      profileNamePlaceholder: "e.g Craig family",
      profileDescPlaceholder: "Enter your profile description...",

      // Messages
      loading: "Loading...",
      error: "Error",
      success: "Success",
      confirm: "Are you sure?",
      noResults: "No results found",

      // Playlist.
      from: "From",
      search_tags: "Search tags",
      reset_filters: "Reset Filters",
      to: "To",
      preview: "Preview",
      search_verses: "Search verses",
      search_sources: "Search sources",
      turnOff: "Turn Off",
      date: "Date",
      sources: "Sources",
      tags: "Tags",
      verses: "Verses",
      anytime: "Anytime",
      yesterday: "Yesterday",
      last_week: "Last week",
      last_month: "Last month",
      last_year: "Last year",
      custom_date_range: "Custom date range",
      selectDateRange: "Select Date Range",
      advancedUI: "Advanced UI",
      turnOn: "Turn On",
      yourScreenIsBeingRecorded: "Your Screen is being recorded.",
      yourVideoIsBeingRecorded: "Your Video is Being Recorded.",
      userNotLoggedIn: "User not logged in!",
      stopRecording: "Stop Recording",
      viewOptionsInfo: "Control the view of the content on the map",
      onlyHostCanAddItemsToQueue: "Only Host can add items to the queue..",
      viewOptions: "View options",
      comingSoon: "Coming Soon!",
      editDate: "Edit Date",
      cannotLinkWithItself: "Cannot Link with itself!",
      alreadyLinkedWithTheItem: "Already Linked with the Item!",
      pleaseEnterAName: "Please Enter a Name!",
      nameAlreadyPresent: "Name Already Present!",
      editYourCollection: "Edit Your Collection",
      addToCollection: "Add To Collection",
      cannotDeleteOriginalPlaylist: "Cannot Delete Original Playlist!",
      addAnotherPlaylist: "Add Another Playlist",
      addAPlaylist: "Add a Playlist",
      selectPlaybackList: "Select Playback List",
      selectParallelList: "Select Parallel List",
      selectPlaylist: "Select Playlist",
      selectPlaylistList: "Select Playlist List",
      playlistAlreadyPresent: "Playlist Already Present",
      regenrationInProgress: "Regenration in progress!",
      playlistNameNotFound: "Playlist Name not found!",
      playlistNameAlreadyPresent: "Playlist Name already present!",
      addDate: "Add Date",
      insertDate: "Insert Date",
      editText: "Edit Text",
      editAttachment: "Edit Attachment",
      updatedSuccessfully: "Updated successfully",
      linkedItems: "Linked Items",
      changeDate: "Change Date",
      addItemsToStartAnnotating: "Add items to start annotating.",
      fetchingAnnotationData: "Fetching Annotation Data",
      noteRangesOfChapterWillBeSkippedInSavingAnnotation:
        "Note: Ranges of chapter will be skipped in saving annoation. Please remove them if you have any.",
      editingAnnotationFor: "Editing Annotation For",
      noFilesUploaded: "No files uploaded",
      publishSettingsDesc:
        "Your annotations will be available to everyone if public. If private only you will have access.",
      embeddedItemsWillBeLost: "Embedded items will be lost.",
      switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue:
        "Switching to another mode will lose the embedded items. Do you want to continue?",
      youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation:
        "You are in edit mode. Editing a anotation cannot embed items inside the annotation.",
      pleaseEmbedSomethingToSaveAnnotations:
        "Please embed something to save annotations!",
      onlyVersesAndChaptersAreAllowedForTopLevelAnnotation:
        "Only Verses and Chapters are allowed for top-level annotation!",
      someOfYourScripturesAreNotEmbedded:
        "Some of your scriptures are not embedded. Please embed or delete them!",
      failedToSaveAnnotations: "Failed to save annotations",
      annotationsSavedSuccessfully: "Annotations saved successfully",
      errorUpdatingAnnotations: "Error updating annotations",
      failedToUpdateAnnotations: "Failed to update annotations",
      cannotSaveEmptyAnnotation:
        "Cannot save empty annotation please use delete instead!",
      youCannotUnlinkAttachmentsInAnnotationMode:
        "You cannot unlink attachments in annotation mode!",
      cannotEmbedEmbeddedItem:
        "Cannot Embed the Embedded item! Content: {{embededItem}}. Please remove it before embeding!",
      failedToFetchAnnotations: "Failed to fetch annotations.",
      errorFetchingAnnotations: "Error fetching annotations",
      cannotChangeWhileBeingInEditMode:
        "Cannot change while being in edit mode!",
      invalidLinkFormat: "Invalid Link format!",
      selectAPlaylistToAnnotate: "Select A Playlist to annotate",
      dragDropOrClickToBrowse: "Drag drop or Click to browse",
      attachmentNameMissing: "Attachment Name missing!",
      recordSomethingToSaveRecording: "Record Something to Save Recording!",
      UPLOAEDJSONERROR: "UPLOAED JSON ERROR",
      infoType: "Image, .pdf, doc, .AUX etc",
      unknownDataType: "Unkown Data Type",
      importJSON: "Import JSON",
      failedToUpload: "Failed to upload File!",
      fileUploadFailed: "File upload failed!",
      noFileUploaded: "No File Uploaded!",
      exampleeg: "e.g.",
      heading: "Heading",
      type: "Type",
      text: "Text",
      role: "Role",
      typeToAddCustomTitle: "(Optional) type to add a custom title",
      importJSONTooltip: "Import JSON File",
      fileRejectedForNotBeingValidJSON:
        "{{count}} file(s) rejected for not being valid JSON Format.",
      video: "Video",
      youtube: "YouTube",
      externalLink: "External Link",
      iframe: "Iframe",
      audio: "Audio",
      screen: "Screen",
      noEmbdedItemsFound: "No Embded Items Found",
      typeToAddScripture: "Type to add scripture (e.g. Gen 1, Rev 2:4)",
      dropFilesHere: "Drop files here",
      releaseToUploadFiles: "Release to upload files",
      tagName: "Tag Name",
      addItemsBelow: "Add items below.",
      clickHereToGeneratePlaylist: "Click here to generate playlist.",
      pleaseFixDatesInWrongOrder: "Plese fix dates in wrong order.",
      pleaseFixRepeatingDates: "Please fix Repeating Dates.",
      cannotEmbedEmbeddedItem:
        "Cannot Embed the Embedded item!. Please remove it before embeding!",
      youCannotEmbedItemsIntoAttachmentItem:
        "You cannot embed items into attachment item.",
      pleaseAddSomeItemsToSavePlaylist:
        "Please Add Some Items to save Playlist!",
      systemPrompt: "System Prompt",
      prompt: "Prompt",
      annotationModeTooltip:
        "Annotation mode is the way to annotate the bible so you can see content while exploring other who have subscribed to you.",
      playlistModeTooltip:
        "Playlist mode is the way to create a playlist of the bible so you can see content while exploring other who have subscribed to you.",
      draft: "Draft",
      copyItems: "Copy Items",
      projectModeTooltip: "Project mode is awesome.",
      copyItemsInstructions:
        "Click & Hold any Playlist to add it to Current playlist.",
      copyItemInstructions:
        "Click & Hold any Playlist item to add that item to the Current playlist.",
      embed: "Embed",
      remove: "Remove",
      mergeMode: "Merge Mode",
      generationPrompt: "Generation Prompt",
      regenerationPrompt: "Regeneration Prompt:",
      describePlaylist: "Describe the playlist you would like to make.",
      describeSystemPrompt: "Describe your system Prompt.",
      systemPromptInfo: "Use $text$ to use your initial prompt as variable.",
      addMedia: "Add Media",
      insertDate: "Insert Date",
      searchAndAdd: "Search & Add",
      typeToSearch: "Type To Search",
      generate: "Generate",
      layers: "layers",
      removeAndSave: " Remove & Save",
      noEmbdedItemsMsg:
        "Some of your item are not embedded. Layers Should have all Embeded Items.",
      annotationMode: "Annotation Mode",
      playlistMode: "Playlist Mode",
      projectMode: "Project Mode",
      playlistSettingsTooltip:
        "Change playlist options below to create new kinds of lists.",
      pleaseLoginToUseMoreFeatures: "Please login to use more features.",
      playlist: "Playlist",
      playlists: "Playlists",
      nothingBookmarked: "Nothing Bookmarked.",
      untitled: "[Untitled]",
      sharedPlaylists: "Shared Playlists",
      editingPlaylists: "Editing Playlists",
      createNewPlaylist: "Create new playlist",
      createNewLayer: "Create new layer",
      generatePlaylist: "Generate playlist",
      generateLayers: "Generate layers",
      generating: "Generating",
      regenerate: "Regenerate",
      playlistSettings: "Playlist Settings",
      publishSettings: "Publish settings",
      publishSettingsDesc:
        "Your annotations will be available to everyone if public. If private only you will have access.",
      privateAccess: "Private Access",
      publicAccess: "Public Access",
      checklist: "Checklist",
      checklistTooltip:
        "Checklist Mode gives your Playlist an option to checkout the visited items so you can keep track of your playlist progress.",
      readingPlan: "Reading Plan",
      readingPlanTooltip:
        "Plan Mode lets you add dates in your playlist which keeps the date and progress in track according to date.",
      revertToPrevious: "Revert to Previous",
      downloadJSON: "Download JSON",
      copyOtherPlaylists: "Copy Other Playlists",
      noPlaylistsToShow: "No Playlists to show.",
      noLayersToShow: "No Layers to show.",
      notEmbeddedItemsFound: "Not Embedded Items Found",
      notEmbeddedItemsMsg:
        "Some of your item are not embedded. Layers Should have all Embedded Items.",
      removeAndSave: "Remove & Save",
      copyItems: "Copy Items",
      copyItemsInstructions:
        "Click & Hold any Playlist to add it to Current playlist.",
      copyItemInstructions:
        "Click & Hold any Playlist item to add that item to the Current playlist.",
      embed: "Embed",
      remove: "Remove",
      mergeMode: "Merge Mode",
      regenerationPrompt: "Regeneration Prompt:",
      describePlaylist: "Describe the playlist you would like to make.",
      describeSystemPrompt: "Describe your system Prompt.",
      systemPromptInfo: "Use $text$ to use your initial prompt as variable.",
      addMedia: "Add Media",
      insertDate: "Insert Date",
      searchAndAdd: "Search & Add",
      typeToSearch: "Type To Search",
      generate: "Generate",
      layers: "layers",

      // PlaylistUI
      discover: "Discover",
      create: "Create",
      welcomeToSeedBible: "Welcome to Seed Bible",
      sharedAPlaylist: "shared a playlist.",
      hereIsYourSharedPlaylist: "Here is your shared playlist.",
      start: "Start",
      thisWillStopPlayingPlaylist: "This will stop playing playlist.",
      playlistCurrentlyPlayingConfirm:
        "A playlist is currently playing. Do you want to stop it to continue?",
      confirm: "Confirm",
      annotation: "Annotation",
      pleaseLoginToUseFeature: "Please login to use this feature.",
      addAnotherParallelPlaylist:
        "Do you want to add another Parallel Playlist?",

      // Discover chips
      all: "All",
      pinnedItems: "Pinned Items",
      shared: "Shared",
      annotations: "Annotations",
      bookmarks: "Bookmarks",

      // AnnotationList
      deleteAnnotation: "Delete annotation",
      deleteAnnotationConfirmation:
        "This annotation and all of it's versions will be permanently deleted. This action cannot be undone! Are you sure you want to delete this?",
      annotationDeletedSuccessfully: "Annotation Deleted Successfully!",
      failedToDeleteAnnotation:
        "Failed to Delete Annotation. Please try again!",
      fetchingAnnotations: "Fetching Annotations",
      noAnnotationsFound: "No Annotations Found.",
      showVersionHistory: "Show version History",
      editAnnotations: "Edit annotations",
      deleteAnnotations: "Delete annotations",
      // AddNewPlaylist
      createManually: "Create Manually",
      importTab: "Import",
      googleSheet: "Google Sheet",
      jsonFormat: "JSON Format",
      backToDiscover: "Back to Discover",
      backToCreate: "Back to Create",
      enterDetailsBelow: "Enter details below.",
      addDetailsToSave: "Add details to save & shared as desired.",
      importHeader: "IMPORT",
      whatsThis: "What's this?",
      jsonDataUploaded: "JSON Data Uploaded",
      chooseColor: "Choose Color",
      chooseIcon: "Choose Icon",
      playlistName: "Playlist name",
      layerName: "Layer name",
      playlistNamePlaceholder: "e.g. Roman's Road",
      descriptionOptional: "(Optional) type to add a description here",
      autoGenerateByDescription: "Auto generate playlist by description.",
      tagsHeader: "Tags",
      tagPlaceholder: "(Optional) e.g. Evangelism",
      uploadFile: "Upload File",
      reUploadFile: "Re-Upload File",
      saving: "Saving..",
      howToCreateFromSheet: "How to create Playlist from Google Spreadsheet",
      sheetInstructions:
        "You can use Google Spreadsheet to create the Playlist Faster.",
      abbreviationsInfo:
        "You can either use Abbreviations or Book name for the user case.",
      spellCorrectly: "But make sure you spell them right.",
      seeSampleList: "See Sample List",
      rememberPublic: "Remember to make your playlist public.",
      jsonInstructions:
        "You can use JSON File Format to create the Playlist Faster.",
      jsonDownloadInfo:
        "You can either use JSON File Format download from our app.",
      seeSampleJSON: "See Sample JSON",
      rememberJSONFormat: "Remember to make JSON in given format.",

      // PlaylistRowItem
      renamePlaylist: "Rename Playlist",
      editPlaylist: "Edit Playlist",
      duplicatePlaylist: "Duplicate Playlist",
      downloadPlaylistJSON: "Download Playlist JSON",
      sharePlaylist: "Share Playlist",
      deletePlaylist: "Delete",
      exportOutside: "Export Outside",
      mergePlaylist: "Merge Playlist",
      nowPlaying: "Now Playing",
      checklistEnabled: "Checklist Enabled",
      planEnabled: "Plan Enabled",
      noItemsYet: "No items yet, add something below.",
      noDescription: "No description",
      editPlaylistTitle: "Edit playlist",
      editSharedPlaylistMsg:
        "Only the creator of this shared playlist can edit this.",
      makeACopy: "Would you like to make a copy?",
      yes: "Yes",
      no: "No",
      shareURLCopied: "Share URL Copied to textboard.",
      playlistShareError:
        "Playlist Can only be shared in published pattern. Please try export.",
      unableToCopy: "Unable to copy playlist. Please try again!",
      cannotMergeNested: "Cannot merge nested playlists!",

      // Error messages
      playlistNameNotFound: "Playlist Name not found!",
      playlistNameExists: "Playlist Name already present!",
      enterPlaylistName: "Enter Playlist Name!",
      enterLinkToImport: "Enter Link to Import Playlist!",
      uploadFileToImport: "Upload a File to Import Data!",
      noValidJSONFound: "No Valid JSON Found!",
      pleaseUploadJSON: "Please Upload JSON format!",
      unableToProcess: "Unable to process the file!",
      noFileUploaded: "No File Uploaded!",
      pleaseUploadImage: "Please Upload Image format!",
      failedToUpload: "Failed to upload File!",
      tagNameMissing: "Tag Name Missing!",
      tagsLimitExceeded: "Tags limit cannot exceeds 8!",
      tagInvalidChars: "Tag Can Only Consist of Number, Alphabets, Spaces, -!",
      tagAlreadyPresent: "Tag Already Present!",
      saveInProgress: "Save in progress!",
      layersShouldHaveTag: "Layers Should Have at least One tag!",
      fillDescriptionForAuto: "Please fill description for auto generation!",
      couldntAutoFind:
        "Couldn't auto find any items for the given description!",
      unableToGeneratePlaylist:
        "Unable to generate playlist. Please Try Again!",
      enterTextForGeneration: "Please enter some text for Playlist Generation!",
      regenerationInProgress: "Regeneration in progress!",
      regenerationFailed: "Regeneration Failed!",
      cannotEmbedEmbedded:
        "Cannot Embed the Embedded item! Content: {{content}}. Please remove it before embedding!",

      // Scripture Map 2D
      show: "Show",
      hide: "Hide",
      timeline: "Timeline",
      closeBooks: "Close books",
      openBooks: "Open books",
      booksColor: "Books color",
      readingHistory: "Reading history",
      userPresence: "User presence",
      labelsText: "Labels",
      zoomLevel: "Zoom level",
      monShort: "Mon",
      wedShort: "Wed",
      friShort: "Fri",
      today: "Today",
      spentHours: "Spent {{count}} hours",
      spentHour: "Spent {{count}} hour",
      spentMinutes: "Spent {{count}} minutes",
      spentMinute: "Spent {{count}} minute",
      readingNow: "reading now",
      you: "You",
      guest: "Guest",
      readDaysAgo: "Read {{count}} days ago",
      readDayAgo: "Read {{count}} day ago",
      readHoursAgo: "Read {{count}} hours ago",
      readHourAgo: "Read {{count}} hour ago",
      readMinutesAgo: "Read {{count}} minutes ago",
      readMinuteAgo: "Read {{count}} minute ago",
      stateNone: "None",
      stateAssigned: "Assigned",
      stateInProgress: "In Progress",
      stateNeedsReview: "Needs Review",
      stateCompleted: "Completed",
      selectionMode: "Selection mode",
      status: "Status",
      clearSelection: "Clear selection",
      done: "Done",
      all: "All",

      // Calendar
      initialTitle: "Initial Title",
      typeCalendarName: "Type calendar name",
      goToCalendar: "Go to Calendar",
      noEventsInView: "No events in view.",
      allDay: "All Day",
      viewMore: "View More",
      to: "to",
      noRepeat: "No Repeat",
      custom: "Custom",
      description: "Description",
      linkOptional: "Link (optional)",
      availablePlaylists: "Available Playlists",
      addTitle: "Add title",
      event: "Event",
      readingPlans: "Reading Plans",
      customRecurrence: "Custom recurrence",
      repeatOn: "Repeat on",
      eventsForSelectedDate: "Events for Selected Date",
      noEventsForDate: "No events found for this date.",
      copy: "Copy",
      copyEvents: "Copy events",
      events: "Events",
      addDescription: "Add Description",
      link: "Link",
      editGroup: "Edit Group",
      groupName: "Group Name",
      addRoomToGroup: "Add Room to Group",
      roomTitle: "Room title",
      addRoom: "Add Room",
      rooms: "Rooms",
      remove: "Remove",
      showLess: "Show Less",
      showMore: "Show More",
      addResource: "Add Resource",
      category: "Category",
      subcategory: "Subcategory",
      enterRoom: "Enter room",
      eventsTab: "Events",
      readingTab: "Reading",
      contentTab: "Content",
      projectsTab: "Projects",
      sourcesTab: "Sources",
      eventsFor: "Events for",
      bibleMap: "Bible Map",
      hideTitle: "Hide Title",
      showTitle: "Show Title",
      hideSchedule: "Hide Schedule",
      showSchedule: "Show Schedule",
      hideHolidays: "Hide Holidays",
      showHolidays: "Show Holidays",
      openCalendar: "Open Calendar",
      openMap: "Open Map",
      openBoth: "Open Both",

      // BookSelector
      searchBook: "Search book...",
      searchTranslation: "Search translations...",
      oldTestament: "Old Testament",
      newTestament: "New Testament",
      oldTestamentShort: "OT",
      newTestamentShort: "NT",
      apocrypha: "Apocrypha",
      allBooks: "All Books",
      customTranslations: "Custom Translations",
      fromId: "from ID",
      fromUrl: "from URL",
      enterId: "Enter ID",
      Queue: "Queue",
    },
  },
  es: {
    translation: {
      // Common actions
      save: "Guardar",
      saveChanges: "Guardar cambios",
      saveOrder: "Guardar orden",
      cancel: "Cancelar",
      close: "Cerrar",
      delete: "Eliminar",
      deleteAll: "Eliminar todo",
      edit: "Editar",
      add: "Agregar",
      search: "Buscar",
      select: "Seleccionar",
      deselect: "Deseleccionar",
      selectAll: "Seleccionar todo",
      reset: "Restablecer",
      resetToDefault: "Restablecer valores",
      install: "Instalar",
      uninstall: "Desinstalar",
      import: "Importar",
      export: "Exportar",
      browse: "Explorar",
      share: "Compartir",
      follow: "Seguir",
      invite: "Invitar",
      or: "O",
      on: "Activado",
      off: "Desactivado",

      // Navigation
      home: "Inicio",
      back: "Atrás",
      next: "Siguiente",
      previous: "Anterior",
      exit: "Salir",

      // Settings - Main
      settings: "Configuración",
      generalSettings: "Configuración general",
      spaceSettings: "Configuración de espacio",
      advancedSettings: "Configuración avanzada",
      manageAccountDesc: "Administra tu cuenta, perfil y preferencias.",

      // Settings - Categories
      themeAndText: "Tema y texto",
      configureExtensions: "Configurar extensiones",
      bibleDefaults: "Valores de Biblia",
      bookOrder: "Orden de libros",
      editor: "Editor",
      ai: "IA",
      tab: "Pestaña",
      language: "Idioma",

      // Settings - Account
      yourAccount: "Tu cuenta",
      accountSettings: "Configuración de cuenta",
      billingServices: "Facturación y servicios",
      permissions: "Permisos",
      notifications: "Notificaciones",
      subscriptions: "Suscripciones",
      createProfile: "Crear perfil",
      openAccountSettings: "Abrir configuración de cuenta",

      // Settings - Space
      loadNewSpace: "Cargar nuevo espacio",
      createNewSpace: "Crear un nuevo espacio",
      editSpace: "Editar espacio",
      importSpace: "Importar espacio",
      enterUrl: "Ingresar URL",
      propagate: "Propagar",

      // Theme Settings
      theme: "Tema",
      themes: "Temas",
      defaultTheme: "Predeterminado",
      darkMode: "Modo oscuro",
      purpleSerenity: "Serenidad púrpura",
      greenNature: "Naturaleza verde",
      oceanBlue: "Azul océano",
      warmAmber: "Ámbar cálido",

      // Theme - Colors
      panelBackground: "Fondo del menú",
      pageBackground: "Fondo de página",
      pageTextColor: "Color de texto",
      iconsColor: "Color de iconos",
      primaryButtonBg: "Fondo botón principal",
      primaryButtonText: "Texto botón principal",
      secondaryButtonBg: "Fondo botón secundario",
      buttonBorder: "Borde de botón",
      tabSelection: "Selección de pestaña",
      spaceSelection: "Selección de espacio",
      toolbarBackground: "Fondo de barra",
      primaryText: "Texto principal",
      secondaryText: "Texto secundario",

      // Theme - Options
      showTabIcons: "Mostrar iconos de pestaña",
      showChapterHeadings: "Mostrar títulos de capítulos",
      showVerseNumbers: "Mostrar números de versículos",
      font: "Fuente",

      // Text Settings
      textSettings: "Configuración de texto",

      // Tabs/Spaces
      tabs: "Pestañas",
      newTab: "Nueva pestaña",
      pageTab: "Pestaña de página",
      newSpace: "Nuevo espacio",
      closeTab: "Cerrar pestaña",
      deleteTab: "Eliminar pestaña",
      newFolder: "Nueva carpeta",
      addToFolder: "Agregar a {{folder}}",
      editMode: "Modo edición",
      allUsers: "Todos los usuarios",
      book: "Libro",
      chapter: "Capítulo",

      // Toolbar
      tools: "Herramientas",
      fullScreen: "Pantalla completa",
      splitScreen: "Pantalla dividida",
      showSearch: "Mostrar búsqueda",
      hideSearch: "Ocultar búsqueda",

      // Editor - Toolbar Items
      textSelect: "Seleccionar texto",
      bold: "Negrita",
      italic: "Cursiva",
      underline: "Subrayado",
      strikethrough: "Tachado",
      superscript: "Superíndice",
      subscript: "Subíndice",
      alignment: "Alineación",
      lists: "Listas",
      lineSpacing: "Interlineado",
      attachFile: "Adjuntar archivo",
      insertImage: "Insertar imagen",
      textColor: "Color de texto",
      highlightColor: "Color de resaltado",
      paragraph: "Párrafo",
      fontFamily: "Familia de fuente",
      fontStyle: "Estilo de fuente",
      fontSize: "Tamaño de fuente",
      undo: "Deshacer",
      redo: "Rehacer",
      clearFormatting: "Limpiar formato",
      print: "Imprimir",
      verticalMargin: "Margen vertical",
      horizontalMargin: "Margen horizontal",
      aiPrompt: "Indicación IA",
      download: "Descargar",
      upload: "Subir",
      customizeToolbar: "Personalizar barra",
      editorToolbarOrder: "Orden de elementos de la barra del editor",

      // Editor - Descriptions
      boldDesc: "Poner texto en negrita",
      italicDesc: "Poner texto en cursiva",
      underlineDesc: "Subrayar texto",
      strikethroughDesc: "Tachar texto",
      superscriptDesc: "Texto en superíndice",
      subscriptDesc: "Texto en subíndice",
      alignmentDesc: "Cambiar alineación",
      listsDesc: "Crear listas",
      lineSpacingDesc: "Ajustar interlineado",
      attachFileDesc: "Adjuntar un archivo",
      insertImageDesc: "Insertar una imagen",
      textColorDesc: "Cambiar color de texto",
      highlightColorDesc: "Resaltar texto",
      paragraphDesc: "Cambiar estilo de párrafo",
      fontFamilyDesc: "Cambiar familia de fuente",
      fontStyleDesc: "Cambiar estilo de fuente",
      fontSizeDesc: "Cambiar tamaño de fuente",
      undoDesc: "Deshacer última acción",
      redoDesc: "Rehacer última acción",
      clearFormattingDesc: "Limpiar todo el formato",
      printDesc: "Imprimir documento",
      verticalMarginDesc: "Ajustar margen vertical",
      horizontalMarginDesc: "Ajustar margen horizontal",
      aiPromptDesc: "Usar asistencia IA",
      downloadDesc: "Descargar documento",
      uploadDesc: "Subir documento",
      textSelectDesc: "Seleccionar texto",

      // Editor - Alignment
      left: "Izquierda",
      center: "Centro",
      right: "Derecha",
      justify: "Justificar",

      // Editor - Lists
      bulleted: "Viñetas",
      numbered: "Numerada",

      // Sessions
      startSession: "Iniciar sesión",
      inviteToSession: "Invitar a sesión",
      joinAnotherSession: "Unirse a otra sesión",
      goPrivate: "Ir a privado",
      goPublic: "Ir a público",
      joinSession: "Unirse a sesión",
      enterSessionCode:
        "Ingrese el código de sesión para unirse a una nueva sesión",
      sessionCodePlaceholder: "Ingrese el código de sesión",
      join: "Unirse",

      // Help
      reportBug: "Reportar error",
      help: "Ayuda",

      // Extensions
      showInToolbar: "Mostrar en barra",
      orShowIn: "O mostrar en",
      panel: "Panel",
      belowThePage: "Debajo de la página",
      extensionSettingsDesc: "Configuración de extensiones en la página",

      // Canvas/Mindmap
      wordTool: "Herramienta de palabras",
      mindmap: "Mapa mental",
      chatGPT: "ChatGPT",
      dallE: "Dall-E",
      separateNode: "Nodo separado",
      voiceNote: "Nota de voz",
      canvasSettingsDesc: "Configuración de herramientas de lienzo",

      // AI Models
      gpt4: "GPT4",
      gpt3: "GPT3",
      claude: "Claude",
      dallE3: "dallE 3",
      dallE2: "dallE 2",
      stabilityAI: "StabilityAI",
      alloy: "Alloy",
      echo: "Echo",
      fable: "Fable",
      onyx: "Onyx",
      nova: "Nova",
      shimmer: "Shimmer",

      // Notifications
      updateAvailable: "¡Actualización disponible!",
      clickToRestart: "Clic para reiniciar",
      whatsNew: "¿Qué hay de nuevo?",

      // Account
      profileNamePlaceholder: "ej. Familia García",
      profileDescPlaceholder: "Ingresa la descripción de tu perfil...",

      // Messages
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      confirm: "¿Estás seguro?",
      noResults: "No se encontraron resultados",

      // Playlist.
      preview: "Vista previa",
      search_tags: "Buscar etiquetas",
      reset_filters: "Restablecer filtros",
      from: "Desde",
      to: "Hasta",
      search_verses: "Buscar versículos",
      search_sources: "Buscar fuentes",
      selectDateRange: "Seleccionar rango de fechas",
      anytime: "En cualquier momento",
      yesterday: "Ayer",
      last_week: "Última semana",
      last_month: "Último mes",
      last_year: "Último año",
      date: "Fecha",
      sources: "Fuentes",
      tags: "Etiquetas",
      verses: "Versos",
      custom_date_range: "Rango de fechas personalizado",
      advancedUI: "Interfaz avanzada",
      turnOff: "Apagar",
      turnOn: "Encender",
      yourScreenIsBeingRecorded: "تسجيل شاشتك يتم...",
      yourVideoIsBeingRecorded: "تسجيل الفيديو يتم...",
      viewOptionsInfo: "Controlar la vista del contenido en el mapa",
      stopRecording: "Detener grabación",
      viewOptions: "Opciones de vista",
      userNotLoggedIn: "User not logged in!",
      cannotLinkWithItself: "No se puede vincular con sí mismo!",
      onlyHostCanAddItemsToQueue:
        "Solo el host puede agregar elementos a la cola.",
      comingSoon: "Próximamente!",
      alreadyLinkedWithTheItem: "Ya está vinculado con el elemento!",
      pleaseEnterAName: "Por favor ingrese un nombre!",
      nameAlreadyPresent: "Nombre ya presente!",
      editYourCollection: "Editar colección",
      addToCollection: "Agregar a colección",
      cannotDeleteOriginalPlaylist: "No se puede eliminar la lista original!",
      addAnotherPlaylist: "Agregar otra lista",
      addAPlaylist: "Agregar una lista",
      selectPlaybackList: "Seleccionar lista de reproducción",
      selectParallelList: "Seleccionar lista paralela",
      selectPlaylist: "Seleccionar lista",
      selectPlaylistList: "Seleccionar lista de listas",
      playlistAlreadyPresent: "Lista ya presente",
      editDate: "Editar fecha",
      regenrationInProgress: "Regenración en progreso!",
      playlistNameNotFound: "Nombre de lista no encontrado!",
      playlistNameAlreadyPresent: "Nombre de lista ya presente!",
      addDate: "Agregar fecha",
      insertDate: "Insertar fecha",
      editAttachment: "Editar archivo",
      editText: "Editar texto",
      updatedSuccessfully: "Actualizado exitosamente",
      linkedItems: "Elementos vinculados",
      changeDate: "Cambiar fecha",
      addItemsToStartAnnotating: "Agregar elementos para empezar a anotar.",
      fetchingAnnotationData: "Obteniendo datos de anotación",
      noteRangesOfChapterWillBeSkippedInSavingAnnotation:
        "Nota: Los rangos de capítulo se omitirán al guardar la anotación. Por favor, elimínalos si tiene alguno.",
      editingAnnotationFor: "Editando anotación para",
      noFilesUploaded: "No se subió ningún archivo!",
      publishSettingsDesc:
        "Tus anotaciones estarán disponibles para todos si es pública. Si es privada, solo tú tendrás acceso.",
      embeddedItemsWillBeLost: "Los elementos incrustados se perderán.",
      switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue:
        "Cambiar a otro modo perderá los elementos incrustados. ¿Deseas continuar?",
      youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation:
        "Estás en modo de edición. No se puede incrustar elementos dentro de la anotación.",
      pleaseEmbedSomethingToSaveAnnotations:
        "Por favor incrusta algo para guardar anotaciones!",
      onlyVersesAndChaptersAreAllowedForTopLevelAnnotation:
        "Solo Versos y Capítulos son permitidos para anotación de nivel superior!",
      someOfYourScripturesAreNotEmbedded:
        "Algunas de tus escrituras no están incrustadas. Por favor incrusta o elimina ellas!",
      failedToSaveAnnotations: "Error al guardar anotaciones",
      annotationsSavedSuccessfully: "Anotaciones guardadas exitosamente",
      youCannotEmbedItemsIntoAttachmentItem:
        "No puedes incrustar elementos en un elemento de entretenimiento.",
      errorUpdatingAnnotations: "Error al actualizar anotaciones",
      failedToUpdateAnnotations: "Error al actualizar anotaciones",
      cannotSaveEmptyAnnotation:
        "No se puede guardar la anotación vacía. Por favor, use eliminar en su lugar!",
      youCannotUnlinkAttachmentsInAnnotationMode:
        "No puedes desvincular los archivos en modo de anotación!",
      cannotEmbedEmbeddedItem:
        "No se puede incrustar el elemento incrustado!. Contenido: {{embededItem}}. Por favor elimínelo antes de incrustar!",
      failedToFetchAnnotations: "Error al obtener anotaciones.",
      errorFetchingAnnotations: "Error al obtener anotaciones",
      cannotChangeWhileBeingInEditMode:
        "No se puede cambiar mientras está en modo de edición!",
      invalidLinkFormat: "Formato de enlace inválido!",
      importJSON: "Importar JSON",
      selectAPlaylistToAnnotate: "Selecciona una lista para anotar",
      attachmentNameMissing: "Nombre de archivo faltante!",
      recordSomethingToSaveRecording:
        "Registra algo para guardar la grabación!",
      UPLOAEDJSONERROR: "ERROR DE JSON CARGADO",
      infoType: "Imagen, .pdf, doc, .AUX etc",
      unknownDataType: "Tipo de datos desconocido",
      dragDropOrClickToBrowse: "Arrastra o haz clic para buscar",
      failedToUpload: "Error al subir archivo!",
      fileUploadFailed: "Error al subir archivos!",
      heading: "Encabezado",
      noFileUploaded: "No se subió ningún archivo!",
      exampleeg: "ej.",
      type: "Tipo",
      text: "Texto",
      role: "Rol",
      typeToAddCustomTitle: "(Opcional) escribe un título personalizado",
      importJSONTooltip: "Importar archivo JSON",
      fileRejectedForNotBeingValidJSON:
        "{{count}} archivo(s) rechazado(s) por no ser un formato JSON válido.",
      video: "Video",
      youtube: "YouTube",
      externalLink: "External Link",
      iframe: "Iframe",
      audio: "Audio",
      screen: "Pantalla",
      playlist: "Lista de reproducción",
      dropFilesHere: "Arrastra archivos aquí",
      typeToAddScripture:
        "Escribe para agregar texto bíblico (ej. Gén 1, Ap 2:4)",
      releaseToUploadFiles: "Libera para subir archivos",
      tagName: "Nombre de la etiqueta",
      addItemsBelow: "Agregar elementos abajo.",
      clickHereToGeneratePlaylist: "Haz clic aquí para generar lista.",
      pleaseFixDatesInWrongOrder:
        "Por favor arregla las fechas en orden incorrecto.",
      pleaseFixRepeatingDates: "Por favor arregla las fechas repetidas.",
      cannotEmbedEmbeddedItem:
        "No se puede incrustar el elemento incrustado!. Por favor elimínelo antes de incrustar!",
      youCannotEmbedItemsIntoAttachmentItem:
        "No puedes incrustar elementos en un elemento de entretenimiento.",
      systemPrompt: "Indicación del sistema",
      pleaseAddSomeItemsToSavePlaylist:
        "Por favor agrega algunos elementos para guardar la lista.",
      prompt: "Indicación",
      generationPrompt: "Indicación de generación:",
      annotationModeTooltip:
        "El modo de anotación es la forma de anotar el bíblia para que puedas ver contenido mientras exploras otros que te han suscrito.",
      playlistModeTooltip:
        "El modo de lista es la forma de crear una lista de reproducción del bíblia para que puedas ver contenido mientras exploras otros que te han suscrito.",
      draft: "Borrador",
      projectModeTooltip: "El modo de proyecto es increíble.",
      annotationMode: "Modo de anotación",
      playlistMode: "Modo de lista",
      projectMode: "Modo de proyecto",
      copyItems: "Copiar elementos",
      copyItemsInstructions:
        "Mantén presionada cualquier lista para agregarla a la lista actual.",
      copyItemInstructions:
        "Mantén presionado cualquier elemento para agregarlo a la lista actual.",
      embed: "Incrustar",
      remove: "Eliminar",
      mergeMode: "Modo fusión",
      regenerationPrompt: "Indicación de regeneración:",
      describePlaylist: "Describe la lista que deseas crear.",
      describeSystemPrompt: "Describe tu indicación del sistema.",
      systemPromptInfo:
        "Usa $text$ para usar tu indicación inicial como variable.",
      addMedia: "Agregar medios",
      insertDate: "Insertar fecha",
      searchAndAdd: "Buscar y agregar",
      typeToSearch: "Escribe para buscar",
      generate: "Generar",
      layers: "capas",
      removeAndSave: "Eliminar y guardar",
      noEmbeddedItemsFound: "No se encontraron elementos incrustados.",
      noEmbeddedItemsMsg:
        "Algunos de tus elementos no están incrustados. Las capas deben tener todos los elementos incrustados.",
      untitled: "[Sin título]",
      nothingBookmarked: "Nada marcado.",
      playlistSettingsTooltip:
        "Cambia las opciones de la lista para crear nuevos tipos de listas.",
      pleaseLoginToUseMoreFeatures:
        "Por favor inicia sesión para usar más funciones.",
      playlists: "Listas de reproducción",
      sharedPlaylists: "Listas compartidas",
      editingPlaylists: "Editando listas",
      createNewPlaylist: "Crear nueva lista",
      createNewLayer: "Crear nueva capa",
      generatePlaylist: "Generar lista",
      generateLayers: "Generar capas",
      generating: "Generando",
      regenerate: "Regenerar",
      playlistSettings: "Configuración de lista",
      publishSettings: "Configuración de publicación",
      publishSettingsDesc:
        "Tus anotaciones estarán disponibles para todos si es pública. Si es privada, solo tú tendrás acceso.",
      privateAccess: "Acceso privado",
      publicAccess: "Acceso público",
      checklist: "Lista de verificación",
      checklistTooltip:
        "El modo de lista de verificación te permite marcar los elementos visitados para seguir tu progreso.",
      readingPlan: "Plan de lectura",
      readingPlanTooltip:
        "El modo de plan te permite agregar fechas en tu lista para mantener el progreso según la fecha.",
      revertToPrevious: "Volver al anterior",
      downloadJSON: "Descargar JSON",
      copyOtherPlaylists: "Copiar otras listas",
      noPlaylistsToShow: "No hay listas para mostrar.",
      noLayersToShow: "No hay capas para mostrar.",
      notEmbeddedItemsFound: "Elementos no incrustados encontrados",
      notEmbeddedItemsMsg:
        "Algunos de tus elementos no están incrustados. Las capas deben tener todos los elementos incrustados.",
      removeAndSave: "Eliminar y guardar",
      copyItems: "Copiar elementos",
      copyItemsInstructions:
        "Mantén presionada cualquier lista para agregarla a la lista actual.",
      copyItemInstructions:
        "Mantén presionado cualquier elemento para agregarlo a la lista actual.",
      embed: "Incrustar",
      remove: "Eliminar",
      mergeMode: "Modo fusión",
      regenerationPrompt: "Indicación de regeneración:",
      describePlaylist: "Describe la lista que deseas crear.",
      describeSystemPrompt: "Describe tu indicación del sistema.",
      systemPromptInfo:
        "Usa $text$ para usar tu indicación inicial como variable.",
      addMedia: "Agregar medios",
      insertDate: "Insertar fecha",
      searchAndAdd: "Buscar y agregar",
      typeToSearch: "Escribe para buscar",
      generate: "Generar",
      layers: "capas",

      // PlaylistUI
      discover: "Descubrir",
      create: "Crear",
      welcomeToSeedBible: "Bienvenido a Seed Bible",
      sharedAPlaylist: "compartió una lista.",
      hereIsYourSharedPlaylist: "Aquí está tu lista compartida.",
      start: "Iniciar",
      thisWillStopPlayingPlaylist: "Esto detendrá la reproducción de la lista.",
      playlistCurrentlyPlayingConfirm:
        "Una lista se está reproduciendo actualmente. ¿Deseas detenerla para continuar?",
      confirm: "Confirmar",
      annotation: "Anotación",
      pleaseLoginToUseFeature:
        "Por favor inicia sesión para usar esta función.",
      addAnotherParallelPlaylist: "¿Deseas agregar otra lista paralela?",

      // Discover chips
      all: "Todo",
      pinnedItems: "Elementos fijados",
      shared: "Compartido",
      annotations: "Anotaciones",
      bookmarks: "Marcadores",

      // AnnotationList
      deleteAnnotation: "Eliminar anotación",
      deleteAnnotationConfirmation:
        "Esta anotación y todas sus versiones se eliminarán permanentemente. ¡Esta acción no se puede deshacer! ¿Estás seguro de que deseas eliminar esto?",
      annotationDeletedSuccessfully: "¡Anotación eliminada exitosamente!",
      failedToDeleteAnnotation:
        "Error al eliminar anotación. ¡Intenta de nuevo!",
      fetchingAnnotations: "Obteniendo anotaciones",
      noAnnotationsFound: "No se encontraron anotaciones.",
      showVersionHistory: "Mostrar historial de versiones",
      editAnnotations: "Editar anotaciones",
      deleteAnnotations: "Eliminar anotaciones",

      // AddNewPlaylist
      createManually: "Crear manualmente",
      importTab: "Importar",
      googleSheet: "Hoja de Google",
      jsonFormat: "Formato JSON",
      backToDiscover: "Volver a descubrir",
      backToCreate: "Volver a crear",
      enterDetailsBelow: "Ingresa los detalles a continuación.",
      addDetailsToSave:
        "Agrega detalles para guardar y compartir según desees.",
      importHeader: "IMPORTAR",
      whatsThis: "¿Qué es esto?",
      jsonDataUploaded: "Datos JSON cargados",
      chooseColor: "Elegir color",
      chooseIcon: "Elegir icono",
      playlistName: "Nombre de la lista",
      layerName: "Nombre de la capa",
      playlistNamePlaceholder: "ej. Camino Romano",
      descriptionOptional: "(Opcional) escribe una descripción aquí",
      autoGenerateByDescription:
        "Generar lista automáticamente por descripción.",
      tagsHeader: "Etiquetas",
      tagPlaceholder: "(Opcional) ej. Evangelismo",
      uploadFile: "Subir archivo",
      reUploadFile: "Volver a subir",
      saving: "Guardando..",
      howToCreateFromSheet: "Cómo crear lista desde hoja de cálculo de Google",
      sheetInstructions:
        "Puedes usar una hoja de cálculo de Google para crear la lista más rápido.",
      abbreviationsInfo: "Puedes usar abreviaturas o nombre del libro.",
      spellCorrectly: "Asegúrate de escribirlo correctamente.",
      seeSampleList: "Ver lista de ejemplo",
      rememberPublic: "Recuerda hacer pública tu lista.",
      jsonInstructions:
        "Puedes usar formato JSON para crear la lista más rápido.",
      jsonDownloadInfo:
        "Puedes usar el formato JSON descargado de nuestra app.",
      seeSampleJSON: "Ver JSON de ejemplo",
      rememberJSONFormat: "Recuerda usar el formato JSON indicado.",

      // PlaylistRowItem
      renamePlaylist: "Renombrar lista",
      editPlaylist: "Editar lista",
      duplicatePlaylist: "Duplicar lista",
      downloadPlaylistJSON: "Descargar JSON de lista",
      sharePlaylist: "Compartir lista",
      deletePlaylist: "Eliminar",
      exportOutside: "Exportar afuera",
      mergePlaylist: "Fusionar lista",
      nowPlaying: "Reproduciendo ahora",
      checklistEnabled: "Lista de verificación activada",
      planEnabled: "Plan activado",
      noItemsYet: "Sin elementos aún, agrega algo abajo.",
      noDescription: "Sin descripción",
      editPlaylistTitle: "Editar lista",
      editSharedPlaylistMsg:
        "Solo el creador de esta lista compartida puede editarla.",
      makeACopy: "¿Te gustaría hacer una copia?",
      yes: "Sí",
      no: "No",
      shareURLCopied: "URL copiada al portapapeles.",
      playlistShareError:
        "La lista solo se puede compartir en patrón publicado. Intenta exportar.",
      unableToCopy: "No se pudo copiar la lista. ¡Intenta de nuevo!",
      cannotMergeNested: "¡No se pueden fusionar listas anidadas!",

      // Error messages
      playlistNameNotFound: "¡Nombre de lista no encontrado!",
      playlistNameExists: "¡El nombre de lista ya existe!",
      enterPlaylistName: "¡Ingresa nombre de lista!",
      enterLinkToImport: "¡Ingresa enlace para importar!",
      uploadFileToImport: "¡Sube un archivo para importar!",
      noValidJSONFound: "¡No se encontró JSON válido!",
      pleaseUploadJSON: "¡Por favor sube formato JSON!",
      unableToProcess: "¡No se pudo procesar el archivo!",
      noFileUploaded: "¡No se subió ningún archivo!",
      pleaseUploadImage: "¡Por favor sube formato de imagen!",
      failedToUpload: "¡Error al subir archivo!",
      tagNameMissing: "¡Falta nombre de etiqueta!",
      tagsLimitExceeded: "¡El límite de etiquetas es 8!",
      tagInvalidChars:
        "¡La etiqueta solo puede tener números, letras, espacios, -!",
      tagAlreadyPresent: "¡La etiqueta ya existe!",
      saveInProgress: "¡Guardado en progreso!",
      layersShouldHaveTag: "¡Las capas deben tener al menos una etiqueta!",
      fillDescriptionForAuto:
        "¡Completa la descripción para generación automática!",
      couldntAutoFind:
        "¡No se pudieron encontrar elementos para la descripción!",
      unableToGeneratePlaylist:
        "No se pudo generar la lista. ¡Intenta de nuevo!",
      enterTextForGeneration: "¡Ingresa texto para generar lista!",
      regenerationInProgress: "¡Regeneración en progreso!",
      regenerationFailed: "¡Regeneración fallida!",
      cannotEmbedEmbedded:
        "¡No se puede incrustar el elemento incrustado! Contenido: {{content}}. ¡Elimínalo antes de incrustar!",

      // Scripture Map 2D
      show: "Mostrar",
      hide: "Ocultar",
      timeline: "Línea de tiempo",
      closeBooks: "Cerrar libros",
      openBooks: "Abrir libros",
      booksColor: "Color de libros",
      readingHistory: "Historial de lectura",
      userPresence: "Presencia de usuario",
      labelsText: "Etiquetas",
      zoomLevel: "Nivel de zoom",
      monShort: "Lun",
      wedShort: "Mié",
      friShort: "Vie",
      today: "Hoy",
      spentHours: "Pasó {{count}} horas",
      spentHour: "Pasó {{count}} hora",
      spentMinutes: "Pasó {{count}} minutos",
      spentMinute: "Pasó {{count}} minuto",
      readingNow: "leyendo ahora",
      you: "Tú",
      guest: "Invitado",
      readDaysAgo: "Leído hace {{count}} días",
      readDayAgo: "Leído hace {{count}} día",
      readHoursAgo: "Leído hace {{count}} horas",
      readHourAgo: "Leído hace {{count}} hora",
      readMinutesAgo: "Leído hace {{count}} minutos",
      readMinuteAgo: "Leído hace {{count}} minuto",
      stateNone: "Ninguno",
      stateAssigned: "Asignado",
      stateInProgress: "En progreso",
      stateNeedsReview: "Necesita revisión",
      stateCompleted: "Completado",
      selectionMode: "Modo de selección",
      status: "Estado",
      clearSelection: "Limpiar selección",
      done: "Hecho",
      all: "Todos",

      // Calendar
      initialTitle: "Título inicial",
      typeCalendarName: "Escribe el nombre del calendario",
      goToCalendar: "Ir al calendario",
      noEventsInView: "No hay eventos a la vista.",
      allDay: "Todo el día",
      viewMore: "Ver más",
      to: "a",
      noRepeat: "Sin repetición",
      custom: "Personalizado",
      description: "Descripción",
      linkOptional: "Enlace (opcional)",
      availablePlaylists: "Listas de reproducción disponibles",
      addTitle: "Agregar título",
      event: "Evento",
      readingPlans: "Planes de lectura",
      customRecurrence: "Recurrencia personalizada",
      repeatOn: "Repetir en",
      eventsForSelectedDate: "Eventos para la fecha seleccionada",
      noEventsForDate: "No se encontraron eventos para esta fecha.",
      copy: "Copiar",
      copyEvents: "Copiar eventos",
      events: "Eventos",
      addDescription: "Agregar descripción",
      link: "Enlace",
      editGroup: "Editar grupo",
      groupName: "Nombre del grupo",
      addRoomToGroup: "Agregar sala al grupo",
      roomTitle: "Título de la sala",
      addRoom: "Agregar sala",
      rooms: "Salas",
      remove: "Eliminar",
      showLess: "Ver menos",
      showMore: "Ver más",
      addResource: "Agregar recurso",
      category: "Categoría",
      subcategory: "Subcategoría",
      enterRoom: "Ingresar sala",
      eventsTab: "Eventos",
      readingTab: "Lectura",
      contentTab: "Contenido",
      projectsTab: "Proyectos",
      sourcesTab: "Fuentes",
      eventsFor: "Eventos para",
      bibleMap: "Mapa Bíblico",
      hideTitle: "Ocultar título",
      showTitle: "Mostrar título",
      hideSchedule: "Ocultar horario",
      showSchedule: "Mostrar horario",
      hideHolidays: "Ocultar días festivos",
      showHolidays: "Mostrar días festivos",
      openCalendar: "Abrir calendario",
      openMap: "Abrir mapa",
      openBoth: "Abrir ambos",

      // BookSelector
      searchBook: "Buscar libro...",
      searchTranslation: "Buscar traducciones...",
      oldTestament: "Antiguo Testamento",
      newTestament: "Nuevo Testamento",
      oldTestamentShort: "AT",
      newTestamentShort: "NT",
      apocrypha: "Apocrypha",
      allBooks: "Todos los libros",
      customTranslations: "Traducciones personalizadas",
      fromId: "desde ID",
      fromUrl: "desde URL",
      enterId: "Ingresar ID",
      Queue: "Cola",
    },
  },
  ar: {
    translation: {
      // Common actions
      save: "حفظ",
      saveChanges: "حفظ التغييرات",
      saveOrder: "حفظ الترتيب",
      cancel: "إلغاء",
      close: "إغلاق",
      delete: "حذف",
      deleteAll: "حذف الكل",
      edit: "تحرير",
      add: "إضافة",
      search: "بحث",
      select: "تحديد",
      deselect: "إلغاء التحديد",
      selectAll: "تحديد الكل",
      reset: "إعادة تعيين",
      resetToDefault: "استعادة الافتراضي",
      install: "تثبيت",
      uninstall: "إلغاء التثبيت",
      import: "استيراد",
      export: "تصدير",
      browse: "استعراض",
      share: "مشاركة",
      follow: "متابعة",
      invite: "دعوة",
      or: "أو",
      on: "تشغيل",
      off: "إيقاف",

      // Navigation
      home: "الرئيسية",
      back: "رجوع",
      next: "التالي",
      previous: "السابق",
      exit: "خروج",

      // Settings - Main
      settings: "الإعدادات",
      generalSettings: "الإعدادات العامة",
      spaceSettings: "إعدادات المساحة",
      advancedSettings: "الإعدادات المتقدمة",
      manageAccountDesc: "إدارة حسابك وملفك الشخصي وتفضيلاتك.",

      // Settings - Categories
      themeAndText: "المظهر والنص",
      configureExtensions: "تكوين الإضافات",
      bibleDefaults: "إعدادات الكتاب المقدس",
      bookOrder: "ترتيب الكتب",
      editor: "المحرر",
      ai: "الذكاء الاصطناعي",
      tab: "علامة تبويب",
      language: "اللغة",

      // Settings - Account
      yourAccount: "حسابك",
      accountSettings: "إعدادات الحساب",
      billingServices: "الفواتير والخدمات",
      permissions: "الأذونات",
      notifications: "الإشعارات",
      subscriptions: "الاشتراكات",
      createProfile: "إنشاء ملف شخصي",
      openAccountSettings: "فتح إعدادات الحساب",

      // Settings - Space
      loadNewSpace: "تحميل مساحة جديدة",
      createNewSpace: "إنشاء مساحة جديدة",
      editSpace: "تحرير المساحة",
      importSpace: "استيراد مساحة",
      enterUrl: "أدخل الرابط",
      propagate: "نشر",

      // Theme Settings
      theme: "المظهر",
      themes: "المظاهر",
      defaultTheme: "افتراضي",
      darkMode: "الوضع الداكن",
      purpleSerenity: "هدوء بنفسجي",
      greenNature: "طبيعة خضراء",
      oceanBlue: "أزرق المحيط",
      warmAmber: "عنبر دافئ",

      // Theme - Colors
      panelBackground: "خلفية القائمة",
      pageBackground: "خلفية الصفحة",
      pageTextColor: "لون نص الصفحة",
      iconsColor: "لون الأيقونات",
      primaryButtonBg: "خلفية الزر الأساسي",
      primaryButtonText: "نص الزر الأساسي",
      secondaryButtonBg: "خلفية الزر الثانوي",
      buttonBorder: "حدود الزر",
      tabSelection: "تحديد علامة التبويب",
      spaceSelection: "تحديد المساحة",
      toolbarBackground: "خلفية شريط الأدوات",
      primaryText: "النص الأساسي",
      secondaryText: "النص الثانوي",

      // Theme - Options
      showTabIcons: "إظهار أيقونات التبويب",
      showChapterHeadings: "إظهار عناوين الفصول",
      showVerseNumbers: "إظهار أرقام الآيات",
      font: "الخط",

      // Text Settings
      textSettings: "إعدادات النص",

      // Tabs/Spaces
      tabs: "علامات التبويب",
      newTab: "تبويب جديد",
      pageTab: "تبويب الصفحة",
      newSpace: "مساحة جديدة",
      closeTab: "إغلاق التبويب",
      deleteTab: "حذف التبويب",
      newFolder: "مجلد جديد",
      addToFolder: "إضافة إلى {{folder}}",
      editMode: "وضع التحرير",
      allUsers: "جميع المستخدمين",
      book: "كتاب",
      chapter: "فصل",

      // Toolbar
      tools: "الأدوات",
      fullScreen: "ملء الشاشة",
      splitScreen: "تقسيم الشاشة",
      showSearch: "إظهار البحث",
      hideSearch: "إخفاء البحث",

      // Editor - Toolbar Items
      textSelect: "تحديد النص",
      bold: "عريض",
      italic: "مائل",
      underline: "تسطير",
      strikethrough: "يتوسطه خط",
      superscript: "مرتفع",
      subscript: "منخفض",
      alignment: "المحاذاة",
      lists: "القوائم",
      lineSpacing: "تباعد الأسطر",
      attachFile: "إرفاق ملف",
      insertImage: "إدراج صورة",
      textColor: "لون النص",
      highlightColor: "لون التمييز",
      paragraph: "فقرة",
      fontFamily: "عائلة الخط",
      fontStyle: "نمط الخط",
      fontSize: "حجم الخط",
      undo: "تراجع",
      redo: "إعادة",
      clearFormatting: "مسح التنسيق",
      print: "طباعة",
      verticalMargin: "الهامش العمودي",
      horizontalMargin: "الهامش الأفقي",
      aiPrompt: "موجه الذكاء الاصطناعي",
      download: "تحميل",
      upload: "رفع",
      customizeToolbar: "تخصيص شريط الأدوات",
      editorToolbarOrder: "ترتيب عناصر شريط أدوات المحرر",

      // Editor - Descriptions
      boldDesc: "جعل النص عريضاً",
      italicDesc: "جعل النص مائلاً",
      underlineDesc: "تسطير النص",
      strikethroughDesc: "شطب النص",
      superscriptDesc: "نص مرتفع",
      subscriptDesc: "نص منخفض",
      alignmentDesc: "تغيير المحاذاة",
      listsDesc: "إنشاء قوائم",
      lineSpacingDesc: "ضبط تباعد الأسطر",
      attachFileDesc: "إرفاق ملف",
      insertImageDesc: "إدراج صورة",
      textColorDesc: "تغيير لون النص",
      highlightColorDesc: "تمييز النص",
      paragraphDesc: "تغيير نمط الفقرة",
      fontFamilyDesc: "تغيير عائلة الخط",
      fontStyleDesc: "تغيير نمط الخط",
      fontSizeDesc: "تغيير حجم الخط",
      undoDesc: "التراجع عن الإجراء",
      redoDesc: "إعادة الإجراء",
      clearFormattingDesc: "مسح كل التنسيق",
      printDesc: "طباعة المستند",
      verticalMarginDesc: "ضبط الهامش العمودي",
      horizontalMarginDesc: "ضبط الهامش الأفقي",
      aiPromptDesc: "استخدام مساعدة الذكاء الاصطناعي",
      downloadDesc: "تحميل المستند",
      uploadDesc: "رفع المستند",
      textSelectDesc: "تحديد النص",

      // Editor - Alignment
      left: "يسار",
      center: "وسط",
      right: "يمين",
      justify: "ضبط",

      // Editor - Lists
      bulleted: "نقطية",
      numbered: "مرقمة",

      // Sessions
      startSession: "بدء الجلسة",
      inviteToSession: "دعوة للجلسة",
      joinAnotherSession: "الانضمام لجلسة أخرى",
      goPrivate: "الذهاب للخاص",
      goPublic: "الذهاب للعام",
      joinSession: "الانضمام للجلسة",
      enterSessionCode: "أدخل رمز الجلسة للانضمام إلى جلسة جديدة",
      sessionCodePlaceholder: "أدخل رمز الجلسة",
      join: "انضمام",

      // Help
      reportBug: "الإبلاغ عن خطأ",
      help: "مساعدة",

      // Extensions
      showInToolbar: "إظهار في شريط الأدوات",
      orShowIn: "أو إظهار في",
      panel: "لوحة",
      belowThePage: "أسفل الصفحة",
      extensionSettingsDesc: "إعدادات الإضافات في الصفحة",

      // Canvas/Mindmap
      wordTool: "أداة الكلمات",
      mindmap: "خريطة ذهنية",
      chatGPT: "ChatGPT",
      dallE: "Dall-E",
      separateNode: "عقدة منفصلة",
      voiceNote: "ملاحظة صوتية",
      canvasSettingsDesc: "إعدادات أدوات اللوحة",

      // AI Models
      gpt4: "GPT4",
      gpt3: "GPT3",
      claude: "Claude",
      dallE3: "dallE 3",
      dallE2: "dallE 2",
      stabilityAI: "StabilityAI",
      alloy: "Alloy",
      echo: "Echo",
      fable: "Fable",
      onyx: "Onyx",
      nova: "Nova",
      shimmer: "Shimmer",

      // Notifications
      updateAvailable: "تحديث متاح!",
      clickToRestart: "انقر لإعادة التشغيل",
      whatsNew: "ما الجديد؟",

      // Account
      profileNamePlaceholder: "مثال: عائلة أحمد",
      profileDescPlaceholder: "أدخل وصف ملفك الشخصي...",

      // Messages
      loading: "جارٍ التحميل...",
      error: "خطأ",
      success: "نجاح",
      confirm: "هل أنت متأكد؟",
      noResults: "لم يتم العثور على نتائج",

      // Playlist.
      anytime: "كيفية أي وقت",
      reset_filters: "إعادة تعيين التصفيات",
      search_tags: "بحث العلامات",
      from: "من",
      to: "إلى",
      search_verses: "بحث الآيات",
      yesterday: "اليوم السابق",
      search_sources: "بحث المصادر",
      last_week: "الأسبوع الماضي",
      last_month: "الشهر الماضي",
      last_year: "العام الماضي",
      date: "التاريخ",
      sources: "المصادر",
      tags: "العلامات",
      verses: "الآيات",
      custom_date_range: "الفترة الزمنية المخصصة",
      selectDateRange: "اختر نطاق التاريخ",
      preview: "معاينة",
      advancedUI: "واجهة متقدمة",
      turnOff: "إيقاف",
      turnOn: "تشغيل",
      yourScreenIsBeingRecorded: "تسجيل شاشتك يتم...",
      yourVideoIsBeingRecorded: "تسجيل الفيديو يتم...",
      userNotLoggedIn: "لم يتم تسجيل الدخول!",
      editDate: "تحرير التاريخ",
      stopRecording: "توقف التسجيل",
      viewOptions: "خيارات العرض",
      viewOptionsInfo: "تحكم في طريقة العرض للمحتوى على الخريطة",
      comingSoon: "قريبا!",
      onlyHostCanAddItemsToQueue: "فقط المضيف يمكن إضافة العناصر إلى المكان!",
      cannotLinkWithItself: "لا يمكنك ربط القائمة مع نفسها!",
      alreadyLinkedWithTheItem: "القائمة مرتبطة مع العنصر!",
      pleaseEnterAName: "يرجى إدخال الاسم!",
      nameAlreadyPresent: "الاسم موجود بالفعل!",
      editYourCollection: "تحرير القائمة",
      addToCollection: "إضافة للقائمة",
      cannotDeleteOriginalPlaylist: "لا يمكنك حذف القائمة الأصلية!",
      addAnotherPlaylist: "إضافة قائمة أخرى",
      addAPlaylist: "إضافة قائمة",
      selectPlaybackList: "اختر قائمة التشغيل",
      selectParallelList: "اختر قائمة متوازية",
      selectPlaylist: "اختر قائمة",
      selectPlaylistList: "اختر قائمة القوائم",
      playlistAlreadyPresent: "القائمة موجودة بالفعل",
      regenrationInProgress: "جارٍ الإعادة!",
      playlistNameNotFound: "اسم القائمة غير موجود!",
      playlistNameAlreadyPresent: "اسم القائمة موجود بالفعل!",
      addDate: "إضافة التاريخ",
      insertDate: "إدراج التاريخ",
      editAttachment: "تحرير المرفق",
      updatedSuccessfully: "تم التحديث بنجاح",
      editText: "تحرير النص",
      changeDate: "تغيير التاريخ",
      linkedItems: "عناصر مرتبطة",
      addItemsToStartAnnotating: "إضافة العناصر لبدء التعليقات التوضيحية.",
      fetchingAnnotationData: "إنتظار تحميل بيانات التعليقات التوضيحية",
      noteRangesOfChapterWillBeSkippedInSavingAnnotation:
        "ملاحظة: سيتم تخطي النطاقات الخاصة بالفصول عند حفظ التعليقات التوضيحية. يرجى إزالتها إذا كان لديك أي.",
      editingAnnotationFor: "تحرير التعليقات التوضيحية ل",
      importJSON: "استيراد JSON",
      publishSettingsDesc:
        "ستكون ملاحظاتك متاحة للجميع إذا كانت عامة. إذا كانت خاصة، ستتمكن أنت فقط من الوصول.",
      embeddedItemsWillBeLost: "سيتم فقد العناصر المضمنة.",
      switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue:
        "تبديل إلى وضع آخر سيفقد العناصر المضمنة. هل تريد الاستمرار؟",
      youCannotEmbedItemsIntoAttachmentItem:
        "لا يمكنك تضمين العناصر في عنصر الترفيه.",
      youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation:
        "أنت في وضع التحرير. لا يمكن تضمين العناصر داخل التعليقات التوضيحية.",
      failedToSaveAnnotations: "خطأ في حفظ التعليقات التوضيحية",
      pleaseEmbedSomethingToSaveAnnotations:
        "يرجى تضمين شيء لحفظ التعليقات التوضيحية!",
      onlyVersesAndChaptersAreAllowedForTopLevelAnnotation:
        "يسمح فقط بالأصول والفصول للتعليقات التوضيحية من المستوى العلوي!",
      someOfYourScripturesAreNotEmbedded:
        "بعض الأصول الخاصة بك غير مضمنة. يرجى تضمينها أو حذفها!",
      annotationsSavedSuccessfully: "تم حفظ التعليقات التوضيحية بنجاح",
      errorUpdatingAnnotations: "خطأ في تحديث التعليقات التوضيحية",
      failedToUpdateAnnotations: "خطأ في تحديث التعليقات التوضيحية",
      cannotSaveEmptyAnnotation:
        "لا يمكن حفظ التعليقات التوضيحية الفارغة. يرجى استخدام الحذف بدلاً من ذلك!",
      youCannotUnlinkAttachmentsInAnnotationMode:
        "لا يمكنك تفكيك المرفقات في وضع التعليقات التوضيحية!",
      cannotEmbedEmbeddedItem:
        "لا يمكن تضمين عنصر مُضمَّن بالفعل! المحتوى: {{embededItem}}. يرجى إزالته قبل التضمين.",
      failedToFetchAnnotations: "خطأ في الحصول على التعليقات التوضيحية.",
      errorFetchingAnnotations: "خطأ في الحصول على التعليقات التوضيحية",
      cannotChangeWhileBeingInEditMode: "لا يمكنك تغيير الوضع أثناء التحرير!",
      invalidLinkFormat: "صيغة الرابط غير صالحة!",
      selectAPlaylistToAnnotate: "اختر قائمة لتعليقها",
      noFilesUploaded: "لم يتم تحميل أي ملف!",
      attachmentNameMissing: "اسم المرفق مفقود!",
      recordSomethingToSaveRecording: "احفظ التسجيل بتسجيل شيء!",
      UPLOAEDJSONERROR: "خطأ في تحميل JSON",
      infoType: "صورة, .pdf, doc, .AUX etc",
      unknownDataType: "نوع البيانات غير معروف",
      dragDropOrClickToBrowse: "اسحب وأفلت للبحث",
      fileUploadFailed: "خطأ في تحميل الملفات!",
      failedToUpload: "خطأ في تحميل الملف!",
      heading: "عنوان",
      noFileUploaded: "لم يتم تحميل أي ملف!",
      type: "نوع",
      exampleeg: "مثال",
      text: "نص",
      role: "دور",
      importJSONTooltip: "استيراد ملف JSON",
      typeToAddCustomTitle: "(اختياري) اكتب اسماً مخصصاً",
      playlist: "قائمة التشغيل",
      fileRejectedForNotBeingValidJSON:
        "{{count}} ملف(s) رفض(ت) لأنه(ه)ا ليس من التنسيق الصالح JSON.",
      video: "فيديو",
      youtube: "يوتيوب",
      externalLink: "رابط خارجي",
      iframe: "إطار",
      audio: "صوت",
      screen: "شاشة",
      dropFilesHere: "أفلت الملفات هنا",
      typeToAddScripture: "اكتب لإضافة نص بيئي (مثال: ج 1, ح 2:4)",
      releaseToUploadFiles: "إطلاق لتحميل الملفات",
      tagName: "اسم العلامة",
      addItemsBelow: "إضافة العناصر أسفل.",
      clickHereToGeneratePlaylist: "اضغط هنا لإنشاء قائمة.",
      pleaseFixDatesInWrongOrder: "يرجى إصلاح التواريخ في الترتيب الخاطئ.",
      pleaseFixRepeatingDates: "يرجى إصلاح التواريخ المتكررة.",
      cannotEmbedEmbeddedItem: "لا يمكنك تضمين العناصر في عنصر الترفيه.",
      youCannotEmbedItemsIntoAttachmentItem:
        "لا يمكنك تضمين العناصر في عنصر الترفيه.",
      prompt: "موجه",
      pleaseAddSomeItemsToSavePlaylist: "يرجى إضافة بعض العناصر لحفظ القائمة.",
      systemPrompt: "موجه النظام",
      generationPrompt: "موجه الإنشاء:",
      annotationModeTooltip:
        "وضع التعليق هو الطريقة التي يتم بها تعليق الكتاب المقرأ لذلك يمكنك أن ترى المحتوى بينما تستكشف أشخاص آخرين الذين قد سجلوا عليك.",
      playlistModeTooltip:
        "وضع القائمة هو الطريقة التي يتم بها إنشاء قائمة التشغيل من الكتاب المقرأ لذلك يمكنك أن ترى المحتوى بينما تستكشف أشخاص آخرين الذين قد سجلوا عليك.",
      copyItems: "نسخ العناصر",
      draft: "رسم",
      annotationMode: "وضع التعليق",
      projectModeTooltip: "وضع المشروع مذهل.",
      playlistMode: "وضع القائمة",
      projectMode: "وضع المشروع",
      copyItemsInstructions:
        "اضغط مع الاستمرار على أي قائمة لإضافتها إلى القائمة الحالية.",
      copyItemInstructions:
        "اضغط مع الاستمرار على أي عنصر لإضافته إلى القائمة الحالية.",
      embed: "تضمين",
      remove: "إزالة",
      mergeMode: "وضع الدمج",
      regenerationPrompt: "موجه إعادة الإنشاء:",
      describePlaylist: "صف القائمة التي تريد إنشاءها.",
      describeSystemPrompt: "صف موجه النظام الخاص بك.",
      systemPromptInfo: "استخدم $text$ لاستخدام موجهك الأولي كمتغير.",
      addMedia: "إضافة وسائط",
      insertDate: "إدراج تاريخ",
      searchAndAdd: "بحث وإضافة",
      typeToSearch: "اكتب للبحث",
      generate: "إنشاء",
      layers: "طبقات",
      removeAndSave: "إزالة وحفظ",
      noEmbdedItemsFound: "لم يتم العثور على عناصر مضمنة.",
      noEmbdedItemsMsg:
        "بعض عناصرك غير مضمنة. يجب أن تحتوي الطبقات على جميع العناصر المضمنة.",
      untitled: "[بدون عنوان]",
      nothingBookmarked: "لا توجد عناصر محفوظة.",
      playlistSettingsTooltip: "اختر خيارات القائمة التي تريد إنشاءها.",
      pleaseLoginToUseMoreFeatures:
        "يرجى تسجيل الدخول لاستخدام الميزات الأخرى.",
      playlists: "قوائم التشغيل",
      sharedPlaylists: "قوائم مشتركة",
      editingPlaylists: "تحرير القوائم",
      createNewPlaylist: "إنشاء قائمة جديدة",
      createNewLayer: "إنشاء طبقة جديدة",
      generatePlaylist: "إنشاء قائمة",
      generateLayers: "إنشاء طبقات",
      generating: "جارٍ الإنشاء",
      regenerate: "إعادة الإنشاء",
      playlistSettings: "إعدادات القائمة",
      publishSettings: "إعدادات النشر",
      publishSettingsDesc:
        "ستكون ملاحظاتك متاحة للجميع إذا كانت عامة. إذا كانت خاصة، ستتمكن أنت فقط من الوصول.",
      privateAccess: "وصول خاص",
      publicAccess: "وصول عام",
      checklist: "قائمة تحقق",
      checklistTooltip:
        "وضع قائمة التحقق يتيح لك تحديد العناصر التي زرتها لتتبع تقدمك.",
      readingPlan: "خطة القراءة",
      readingPlanTooltip:
        "وضع الخطة يتيح لك إضافة تواريخ في قائمتك للحفاظ على التقدم حسب التاريخ.",
      revertToPrevious: "العودة للسابق",
      downloadJSON: "تحميل JSON",
      copyOtherPlaylists: "نسخ قوائم أخرى",
      noPlaylistsToShow: "لا توجد قوائم للعرض.",
      noLayersToShow: "لا توجد طبقات للعرض.",
      notEmbeddedItemsFound: "تم العثور على عناصر غير مضمنة",
      notEmbeddedItemsMsg:
        "بعض عناصرك غير مضمنة. يجب أن تحتوي الطبقات على جميع العناصر المضمنة.",
      removeAndSave: "إزالة وحفظ",
      copyItems: "نسخ العناصر",
      copyItemsInstructions:
        "اضغط مع الاستمرار على أي قائمة لإضافتها إلى القائمة الحالية.",
      copyItemInstructions:
        "اضغط مع الاستمرار على أي عنصر لإضافته إلى القائمة الحالية.",
      embed: "تضمين",
      remove: "إزالة",
      mergeMode: "وضع الدمج",
      regenerationPrompt: "موجه إعادة الإنشاء:",
      describePlaylist: "صف القائمة التي تريد إنشاءها.",
      describeSystemPrompt: "صف موجه النظام الخاص بك.",
      systemPromptInfo: "استخدم $text$ لاستخدام موجهك الأولي كمتغير.",
      addMedia: "إضافة وسائط",
      insertDate: "إدراج تاريخ",
      searchAndAdd: "بحث وإضافة",
      typeToSearch: "اكتب للبحث",
      generate: "إنشاء",
      layers: "طبقات",

      // PlaylistUI
      discover: "اكتشف",
      create: "إنشاء",
      welcomeToSeedBible: "مرحباً بك في Seed Bible",
      sharedAPlaylist: "شارك قائمة.",
      hereIsYourSharedPlaylist: "إليك قائمتك المشتركة.",
      start: "ابدأ",
      thisWillStopPlayingPlaylist: "سيؤدي هذا إلى إيقاف تشغيل القائمة.",
      playlistCurrentlyPlayingConfirm:
        "يتم تشغيل قائمة حالياً. هل تريد إيقافها للمتابعة؟",
      confirm: "تأكيد",
      annotation: "تعليق توضيحي",
      pleaseLoginToUseFeature: "يرجى تسجيل الدخول لاستخدام هذه الميزة.",
      addAnotherParallelPlaylist: "هل تريد إضافة قائمة موازية أخرى؟",

      // Discover chips
      all: "الكل",
      pinnedItems: "العناصر المثبتة",
      shared: "مشترك",
      annotations: "التعليقات التوضيحية",
      bookmarks: "الإشارات المرجعية",

      // AnnotationList
      deleteAnnotation: "حذف التعليق التوضيحي",
      deleteAnnotationConfirmation:
        "سيتم حذف هذا التعليق التوضيحي وجميع نسخه بشكل دائم. لا يمكن التراجع عن هذا الإجراء! هل أنت متأكد أنك تريد حذف هذا؟",
      annotationDeletedSuccessfully: "تم حذف التعليق التوضيحي بنجاح!",
      failedToDeleteAnnotation: "فشل حذف التعليق التوضيحي. حاول مرة أخرى!",
      fetchingAnnotations: "جارٍ جلب التعليقات التوضيحية",
      noAnnotationsFound: "لم يتم العثور على تعليقات توضيحية.",
      showVersionHistory: "عرض سجل الإصدارات",
      editAnnotations: "تحرير التعليقات التوضيحية",
      deleteAnnotations: "حذف التعليقات التوضيحية",

      // AddNewPlaylist
      createManually: "إنشاء يدوياً",
      importTab: "استيراد",
      googleSheet: "جدول بيانات جوجل",
      jsonFormat: "تنسيق JSON",
      backToDiscover: "العودة للاكتشاف",
      backToCreate: "العودة للإنشاء",
      enterDetailsBelow: "أدخل التفاصيل أدناه.",
      addDetailsToSave: "أضف التفاصيل للحفظ والمشاركة كما تريد.",
      importHeader: "استيراد",
      whatsThis: "ما هذا؟",
      jsonDataUploaded: "تم تحميل بيانات JSON",
      chooseColor: "اختر لوناً",
      chooseIcon: "اختر أيقونة",
      playlistName: "اسم القائمة",
      layerName: "اسم الطبقة",
      playlistNamePlaceholder: "مثال: طريق رومية",
      descriptionOptional: "(اختياري) اكتب وصفاً هنا",
      autoGenerateByDescription: "إنشاء قائمة تلقائياً بالوصف.",
      tagsHeader: "الوسوم",
      tagPlaceholder: "(اختياري) مثال: التبشير",
      uploadFile: "تحميل ملف",
      reUploadFile: "إعادة التحميل",
      saving: "جارٍ الحفظ..",
      howToCreateFromSheet: "كيفية إنشاء قائمة من جدول بيانات جوجل",
      sheetInstructions:
        "يمكنك استخدام جدول بيانات جوجل لإنشاء القائمة بشكل أسرع.",
      abbreviationsInfo: "يمكنك استخدام الاختصارات أو اسم الكتاب.",
      spellCorrectly: "تأكد من كتابتها بشكل صحيح.",
      seeSampleList: "عرض قائمة نموذجية",
      rememberPublic: "تذكر جعل قائمتك عامة.",
      jsonInstructions: "يمكنك استخدام تنسيق JSON لإنشاء القائمة بشكل أسرع.",
      jsonDownloadInfo: "يمكنك استخدام تنسيق JSON المحمل من تطبيقنا.",
      seeSampleJSON: "عرض JSON نموذجي",
      rememberJSONFormat: "تذكر استخدام تنسيق JSON المحدد.",

      // PlaylistRowItem
      renamePlaylist: "إعادة تسمية القائمة",
      editPlaylist: "تحرير القائمة",
      duplicatePlaylist: "تكرار القائمة",
      downloadPlaylistJSON: "تحميل JSON للقائمة",
      sharePlaylist: "مشاركة القائمة",
      deletePlaylist: "حذف",
      exportOutside: "تصدير للخارج",
      mergePlaylist: "دمج القائمة",
      nowPlaying: "قيد التشغيل الآن",
      checklistEnabled: "قائمة التحقق مفعلة",
      planEnabled: "الخطة مفعلة",
      noItemsYet: "لا توجد عناصر بعد، أضف شيئاً أدناه.",
      noDescription: "بدون وصف",
      editPlaylistTitle: "تحرير القائمة",
      editSharedPlaylistMsg: "فقط منشئ هذه القائمة المشتركة يمكنه تحريرها.",
      makeACopy: "هل تريد عمل نسخة؟",
      yes: "نعم",
      no: "لا",
      shareURLCopied: "تم نسخ رابط المشاركة.",
      playlistShareError:
        "يمكن مشاركة القائمة فقط في النمط المنشور. جرب التصدير.",
      unableToCopy: "تعذر نسخ القائمة. حاول مرة أخرى!",
      cannotMergeNested: "لا يمكن دمج القوائم المتداخلة!",

      // Error messages
      playlistNameNotFound: "اسم القائمة غير موجود!",
      playlistNameExists: "اسم القائمة موجود بالفعل!",
      enterPlaylistName: "أدخل اسم القائمة!",
      enterLinkToImport: "أدخل رابطاً للاستيراد!",
      uploadFileToImport: "حمل ملفاً للاستيراد!",
      noValidJSONFound: "لم يتم العثور على JSON صالح!",
      pleaseUploadJSON: "يرجى تحميل تنسيق JSON!",
      unableToProcess: "تعذرت معالجة الملف!",
      noFileUploaded: "لم يتم تحميل أي ملف!",
      pleaseUploadImage: "يرجى تحميل تنسيق صورة!",
      failedToUpload: "فشل تحميل الملف!",
      tagNameMissing: "اسم الوسم مفقود!",
      tagsLimitExceeded: "لا يمكن تجاوز حد 8 وسوم!",
      tagInvalidChars: "الوسم يمكن أن يحتوي فقط على أرقام وحروف ومسافات و-!",
      tagAlreadyPresent: "الوسم موجود بالفعل!",
      saveInProgress: "جارٍ الحفظ!",
      layersShouldHaveTag: "يجب أن تحتوي الطبقات على وسم واحد على الأقل!",
      fillDescriptionForAuto: "يرجى ملء الوصف للإنشاء التلقائي!",
      couldntAutoFind: "تعذر العثور على عناصر للوصف المحدد!",
      unableToGeneratePlaylist: "تعذر إنشاء القائمة. حاول مرة أخرى!",
      enterTextForGeneration: "أدخل نصاً لإنشاء القائمة!",
      regenerationInProgress: "إعادة الإنشاء قيد التقدم!",
      regenerationFailed: "فشلت إعادة الإنشاء!",
      cannotEmbedEmbedded:
        "لا يمكن تضمين العنصر المضمن! المحتوى: {{content}}. يرجى إزالته قبل التضمين!",

      // Scripture Map 2D
      show: "إظهار",
      hide: "إخفاء",
      timeline: "الجدول الزمني",
      closeBooks: "إغلاق الكتب",
      openBooks: "فتح الكتب",
      booksColor: "لون الكتب",
      readingHistory: "سجل القراءة",
      userPresence: "حضور المستخدم",
      labelsText: "التسميات",
      zoomLevel: "مستوى التكبير",
      monShort: "إث",
      wedShort: "أر",
      friShort: "جم",
      today: "اليوم",
      spentHours: "قضى {{count}} ساعات",
      spentHour: "قضى {{count}} ساعة",
      spentMinutes: "قضى {{count}} دقائق",
      spentMinute: "قضى {{count}} دقيقة",
      readingNow: "يقرأ الآن",
      you: "أنت",
      guest: "ضيف",
      readDaysAgo: "قرأ منذ {{count}} أيام",
      readDayAgo: "قرأ منذ {{count}} يوم",
      readHoursAgo: "قرأ منذ {{count}} ساعات",
      readHourAgo: "قرأ منذ {{count}} ساعة",
      readMinutesAgo: "قرأ منذ {{count}} دقائق",
      readMinuteAgo: "قرأ منذ {{count}} دقيقة",
      stateNone: "لا شيء",
      stateAssigned: "معين",
      stateInProgress: "قيد التقدم",
      stateNeedsReview: "يحتاج مراجعة",
      stateCompleted: "مكتمل",
      selectionMode: "وضع التحديد",
      status: "الحالة",
      clearSelection: "مسح التحديد",
      done: "تم",
      all: "الكل",

      // Calendar
      initialTitle: "العنوان الأولي",
      typeCalendarName: "اكتب اسم التقويم",
      goToCalendar: "الذهاب إلى التقويم",
      noEventsInView: "لا توجد أحداث في العرض.",
      allDay: "طوال اليوم",
      viewMore: "عرض المزيد",
      to: "إلى",
      noRepeat: "بدون تكرار",
      custom: "مخصص",
      description: "الوصف",
      linkOptional: "الرابط (اختياري)",
      availablePlaylists: "قوائم التشغيل المتاحة",
      addTitle: "إضافة عنوان",
      event: "حدث",
      readingPlans: "خطط القراءة",
      customRecurrence: "تكرار مخصص",
      repeatOn: "تكرار في",
      eventsForSelectedDate: "أحداث التاريخ المحدد",
      noEventsForDate: "لم يتم العثور على أحداث لهذا التاريخ.",
      copy: "نسخ",
      copyEvents: "نسخ الأحداث",
      events: "الأحداث",
      addDescription: "إضافة وصف",
      link: "رابط",
      editGroup: "تعديل المجموعة",
      groupName: "اسم المجموعة",
      addRoomToGroup: "إضافة غرفة إلى المجموعة",
      roomTitle: "عنوان الغرفة",
      addRoom: "إضافة غرفة",
      rooms: "الغرف",
      remove: "إزالة",
      showLess: "عرض أقل",
      showMore: "عرض المزيد",
      addResource: "إضافة مورد",
      category: "الفئة",
      subcategory: "الفئة الفرعية",
      enterRoom: "أدخل الغرفة",
      eventsTab: "الأحداث",
      readingTab: "القراءة",
      contentTab: "المحتوى",
      projectsTab: "المشاريع",
      sourcesTab: "المصادر",
      eventsFor: "أحداث",
      bibleMap: "خريطة الكتاب المقدس",
      hideTitle: "إخفاء العنوان",
      showTitle: "إظهار العنوان",
      hideSchedule: "إخفاء الجدول",
      showSchedule: "إظهار الجدول",
      hideHolidays: "إخفاء العطلات",
      showHolidays: "إظهار العطلات",
      openCalendar: "فتح التقويم",
      openMap: "فتح الخريطة",
      openBoth: "فتح كليهما",

      // BookSelector
      searchBook: "بحث عن كتاب...",
      searchTranslation: "بحث عن ترجمة...",
      oldTestament: "العهد القديم",
      newTestament: "العهد الجديد",
      oldTestamentShort: "العهد القديم",
      newTestamentShort: "العهد الجديد",
      apocrypha: "الأبوكريفا",
      allBooks: "جميع الكتب",
      customTranslations: "ترجمات مخصصة",
      fromId: "من ID",
      fromUrl: "من URL",
      enterId: "أدخل ID",
      Queue: "الطابور",
    },
  },
  hi: {
    translation: {
      // Common actions
      save: "सहेजें",
      saveChanges: "परिवर्तन सहेजें",
      saveOrder: "क्रम सहेजें",
      cancel: "रद्द करें",
      close: "बंद करें",
      delete: "हटाएं",
      deleteAll: "सभी हटाएं",
      edit: "संपादित करें",
      add: "जोड़ें",
      search: "खोजें",
      select: "चुनें",
      deselect: "चयन हटाएं",
      selectAll: "सभी चुनें",
      reset: "रीसेट",
      resetToDefault: "डिफ़ॉल्ट पर रीसेट",
      install: "इंस्टॉल करें",
      uninstall: "अनइंस्टॉल करें",
      import: "आयात करें",
      export: "निर्यात करें",
      browse: "ब्राउज़ करें",
      share: "शेयर करें",
      follow: "फॉलो करें",
      invite: "आमंत्रित करें",
      or: "या",
      on: "चालू",
      off: "बंद",

      // Navigation
      home: "होम",
      back: "वापस",
      next: "अगला",
      previous: "पिछला",
      exit: "बाहर निकलें",

      // Settings - Main
      settings: "सेटिंग्स",
      generalSettings: "सामान्य सेटिंग्स",
      spaceSettings: "स्पेस सेटिंग्स",
      advancedSettings: "उन्नत सेटिंग्स",
      manageAccountDesc: "अपना खाता, प्रोफ़ाइल और प्राथमिकताएं प्रबंधित करें।",

      // Settings - Categories
      themeAndText: "थीम और टेक्स्ट",
      configureExtensions: "एक्सटेंशन कॉन्फ़िगर करें",
      bibleDefaults: "बाइबिल डिफ़ॉल्ट",
      bookOrder: "पुस्तक क्रम",
      editor: "संपादक",
      ai: "AI",
      tab: "टैब",
      language: "भाषा",

      // Settings - Account
      yourAccount: "आपका खाता",
      accountSettings: "खाता सेटिंग्स",
      billingServices: "बिलिंग और सेवाएं",
      permissions: "अनुमतियाँ",
      notifications: "सूचनाएं",
      subscriptions: "सदस्यताएं",
      createProfile: "प्रोफ़ाइल बनाएं",
      openAccountSettings: "खाता सेटिंग्स खोलें",

      // Settings - Space
      loadNewSpace: "नया स्पेस लोड करें",
      createNewSpace: "नया स्पेस बनाएं",
      editSpace: "स्पेस संपादित करें",
      importSpace: "स्पेस आयात करें",
      enterUrl: "URL दर्ज करें",
      propagate: "प्रसारित करें",

      // Theme Settings
      theme: "थीम",
      themes: "थीम्स",
      defaultTheme: "डिफ़ॉल्ट",
      darkMode: "डार्क मोड",
      purpleSerenity: "बैंगनी शांति",
      greenNature: "हरी प्रकृति",
      oceanBlue: "समुद्री नीला",
      warmAmber: "गर्म एम्बर",

      // Theme - Colors
      panelBackground: "मेनू पृष्ठभूमि",
      pageBackground: "पृष्ठ पृष्ठभूमि",
      pageTextColor: "पृष्ठ टेक्स्ट रंग",
      iconsColor: "आइकन रंग",
      primaryButtonBg: "प्राथमिक बटन पृष्ठभूमि",
      primaryButtonText: "प्राथमिक बटन टेक्स्ट",
      secondaryButtonBg: "द्वितीयक बटन पृष्ठभूमि",
      buttonBorder: "बटन बॉर्डर",
      tabSelection: "टैब चयन",
      spaceSelection: "स्पेस चयन",
      toolbarBackground: "टूलबार पृष्ठभूमि",
      primaryText: "प्राथमिक टेक्स्ट",
      secondaryText: "द्वितीयक टेक्स्ट",

      // Theme - Options
      showTabIcons: "टैब आइकन दिखाएं",
      showChapterHeadings: "अध्याय शीर्षक दिखाएं",
      showVerseNumbers: "आयत संख्या दिखाएं",
      font: "फ़ॉन्ट",

      // Text Settings
      textSettings: "टेक्स्ट सेटिंग्स",

      // Tabs/Spaces
      tabs: "टैब्स",
      newTab: "नया टैब",
      pageTab: "पेज टैब",
      newSpace: "नया स्पेस",
      closeTab: "टैब बंद करें",
      deleteTab: "टैब हटाएं",
      newFolder: "नया फ़ोल्डर",
      addToFolder: "{{folder}} में जोड़ें",
      editMode: "संपादन मोड",
      allUsers: "सभी उपयोगकर्ता",
      book: "पुस्तक",
      chapter: "अध्याय",

      // Toolbar
      tools: "उपकरण",
      fullScreen: "पूर्ण स्क्रीन",
      splitScreen: "स्क्रीन विभाजित करें",
      showSearch: "खोज दिखाएं",
      hideSearch: "खोज छुपाएं",

      // Editor - Toolbar Items
      textSelect: "टेक्स्ट चुनें",
      bold: "बोल्ड",
      italic: "इटैलिक",
      underline: "अंडरलाइन",
      strikethrough: "स्ट्राइकथ्रू",
      superscript: "सुपरस्क्रिप्ट",
      subscript: "सबस्क्रिप्ट",
      alignment: "संरेखण",
      lists: "सूचियां",
      lineSpacing: "लाइन स्पेसिंग",
      attachFile: "फ़ाइल संलग्न करें",
      insertImage: "छवि डालें",
      textColor: "टेक्स्ट रंग",
      highlightColor: "हाइलाइट रंग",
      paragraph: "पैराग्राफ",
      fontFamily: "फ़ॉन्ट परिवार",
      fontStyle: "फ़ॉन्ट शैली",
      fontSize: "फ़ॉन्ट आकार",
      undo: "पूर्ववत करें",
      redo: "फिर से करें",
      clearFormatting: "फ़ॉर्मेटिंग साफ़ करें",
      print: "प्रिंट करें",
      verticalMargin: "लंबवत मार्जिन",
      horizontalMargin: "क्षैतिज मार्जिन",
      aiPrompt: "AI प्रॉम्प्ट",
      download: "डाउनलोड",
      upload: "अपलोड",
      customizeToolbar: "टूलबार कस्टमाइज़ करें",
      editorToolbarOrder: "संपादक टूलबार आइटम क्रम",

      // Editor - Descriptions
      boldDesc: "टेक्स्ट बोल्ड करें",
      italicDesc: "टेक्स्ट इटैलिक करें",
      underlineDesc: "टेक्स्ट अंडरलाइन करें",
      strikethroughDesc: "टेक्स्ट स्ट्राइक करें",
      superscriptDesc: "सुपरस्क्रिप्ट बनाएं",
      subscriptDesc: "सबस्क्रिप्ट बनाएं",
      alignmentDesc: "संरेखण बदलें",
      listsDesc: "सूची बनाएं",
      lineSpacingDesc: "लाइन स्पेसिंग समायोजित करें",
      attachFileDesc: "फ़ाइल संलग्न करें",
      insertImageDesc: "छवि डालें",
      textColorDesc: "टेक्स्ट रंग बदलें",
      highlightColorDesc: "टेक्स्ट हाइलाइट करें",
      paragraphDesc: "पैराग्राफ शैली बदलें",
      fontFamilyDesc: "फ़ॉन्ट परिवार बदलें",
      fontStyleDesc: "फ़ॉन्ट शैली बदलें",
      fontSizeDesc: "फ़ॉन्ट आकार बदलें",
      undoDesc: "अंतिम क्रिया पूर्ववत करें",
      redoDesc: "अंतिम क्रिया फिर से करें",
      clearFormattingDesc: "सभी फ़ॉर्मेटिंग साफ़ करें",
      printDesc: "दस्तावेज़ प्रिंट करें",
      verticalMarginDesc: "लंबवत मार्जिन समायोजित करें",
      horizontalMarginDesc: "क्षैतिज मार्जिन समायोजित करें",
      aiPromptDesc: "AI सहायता का उपयोग करें",
      downloadDesc: "दस्तावेज़ डाउनलोड करें",
      uploadDesc: "दस्तावेज़ अपलोड करें",
      textSelectDesc: "टेक्स्ट चुनें",

      // Editor - Alignment
      left: "बाएं",
      center: "केंद्र",
      right: "दाएं",
      justify: "जस्टिफाई",

      // Editor - Lists
      bulleted: "बुलेटेड",
      numbered: "क्रमांकित",

      // Sessions
      startSession: "सत्र शुरू करें",
      inviteToSession: "सत्र में आमंत्रित करें",
      joinAnotherSession: "दूसरे सत्र में शामिल हों",
      goPrivate: "निजी में जाएं",
      goPublic: "सार्वजनिक में जाएं",
      joinSession: "सत्र में शामिल हों",
      enterSessionCode: "नए सत्र में शामिल होने के लिए सत्र कोड दर्ज करें",
      sessionCodePlaceholder: "सत्र कोड दर्ज करें",
      join: "शामिल हों",

      // Help
      reportBug: "बग रिपोर्ट करें",
      help: "मदद",

      // Extensions
      showInToolbar: "टूलबार में दिखाएं",
      orShowIn: "या इसमें दिखाएं",
      panel: "पैनल",
      belowThePage: "पेज के नीचे",
      extensionSettingsDesc: "पेज में एक्सटेंशन सेटिंग्स",

      // Canvas/Mindmap
      wordTool: "शब्द उपकरण",
      mindmap: "माइंडमैप",
      chatGPT: "ChatGPT",
      dallE: "Dall-E",
      separateNode: "अलग नोड",
      voiceNote: "वॉइस नोट",
      canvasSettingsDesc: "कैनवास उपकरण सेटिंग्स",

      // AI Models
      gpt4: "GPT4",
      gpt3: "GPT3",
      claude: "Claude",
      dallE3: "dallE 3",
      dallE2: "dallE 2",
      stabilityAI: "StabilityAI",
      alloy: "Alloy",
      echo: "Echo",
      fable: "Fable",
      onyx: "Onyx",
      nova: "Nova",
      shimmer: "Shimmer",

      // Notifications
      updateAvailable: "AO Lab अपडेट उपलब्ध!",
      clickToRestart: "पुनः आरंभ करने के लिए क्लिक करें",
      whatsNew: "नया क्या है?",

      // Account
      profileNamePlaceholder: "उदा. शर्मा परिवार",
      profileDescPlaceholder: "अपना प्रोफ़ाइल विवरण दर्ज करें...",

      // Messages
      loading: "लोड हो रहा है...",
      error: "त्रुटि",
      success: "सफल",
      confirm: "क्या आप निश्चित हैं?",
      noResults: "कोई परिणाम नहीं मिला",

      // Playlist.
      preview: "पूर्वावलोकन",
      anytime: "किसी भी समय",
      reset_filters: "फ़िल्टर रीसेट करें",
      from: "से",
      to: "तक",
      search_sources: "स्रोत खोजें",
      search_verses: "अध्याय खोजें",
      search_tags: "टैग खोजें",
      yesterday: "कल",
      last_week: "पिछले सप्ताह",
      last_month: "पिछले महीने",
      last_year: "पिछले वर्ष",
      custom_date_range: "विशिष्ट तारीख दर्जा",
      selectDateRange: "तारीख दर्जा चुनें",
      date: "तारीख",
      sources: "स्रोत",
      tags: "टैग",
      verses: "अध्याय",
      userNotLoggedIn: "उपयोगकर्ता लॉग इन नहीं है!",
      advancedUI: "उन्नत UI",
      yourScreenIsBeingRecorded: "आपकी स्क्रीन रिकॉर्ड हो रही है...",
      yourVideoIsBeingRecorded: "आईटम जोड़ रहा है",
      viewOptions: "दृश्य विकल्प",
      stopRecording: "रिकॉर्डिंग रोकें",
      turnOff: "बंद करें",
      turnOn: "चालू करें",
      viewOptionsInfo: "दृश्य विकल्प को नियंत्रित करें",
      onlyHostCanAddItemsToQueue:
        "केवल मूल आयताकार को आइटम्स को कूद में जोड़ सकता है।",
      comingSoon: "जल्द हो रहा है!",
      editDate: "तारीख संपादित कर रहा है",
      cannotLinkWithItself: "आप स्वयं से जोड़ नहीं सकते!",
      alreadyLinkedWithTheItem: "आइटम से पहले जोड़ा गया है!",
      pleaseEnterAName: "कृपया एक नाम दर्ज करें!",
      nameAlreadyPresent: "नाम पहले से मौजूद है!",
      editYourCollection: "आपकी कलेक्शन संपादित कर रहा है",
      addToCollection: "कलेक्शन में जोड़ रहा है",
      cannotDeleteOriginalPlaylist: "मूल प्लेलिस्ट नहीं हटा सकते!",
      addAnotherPlaylist: "अन्य प्लेलिस्ट जोड़ रहा है",
      addAPlaylist: "प्लेलिस्ट जोड़ रहा है",
      selectPlaybackList: "प्लेलिस्ट चुन रहा है",
      selectParallelList: "पारलेल प्लेलिस्ट चुन रहा है",
      selectPlaylist: "प्लेलिस्ट चुन रहा है",
      selectPlaylistList: "प्लेलिस्ट की सूची चुन रहा है",
      playlistAlreadyPresent: "प्लेलिस्ट पहले से मौजूद है!",
      regenrationInProgress: "रिजनरेशन इं प्रोग्रेस!",
      playlistNameNotFound: "प्लेलिस्ट नाम नहीं मिला!",
      playlistNameAlreadyPresent: "प्लेलिस्ट नाम पहले से मौजूद है!",
      linkedItems: "संबंधित आइटम",
      addDate: "तारीख जोड़ रहा है",
      insertDate: "तारीख डाल रहा है",
      editAttachment: "एट्चिमेंट संपादित कर रहा है",
      editText: "टेक्स्ट संपादित कर रहा है",
      updatedSuccessfully: "सफलतापूर्वक अपडेट किया गया",
      changeDate: "तारीख बदल रहा है",
      addItemsToStartAnnotating: "आइटम्स जोड़ें टिप्पणी शुरू करने के लिए।",
      fetchingAnnotationData: "टिप्पणी डेटा लोड हो रहा है",
      editingAnnotationFor: "टिप्पणी के लिए संपादन कर रहा है",
      noteRangesOfChapterWillBeSkippedInSavingAnnotation:
        "माला: अध्याय के दायरे सहेजने में छोड़ दिए जाएंगे। कृपया अगर आपके पास कोई है तो उन्हें हटा दें।",
      playlist: "प्लेलिस्ट",
      publishSettingsDesc:
        "आपकी टिप्पणियां सार्वजनिक होने पर सभी के लिए उपलब्ध होंगी. यदि खास हो, तो केवल आप ही पहुंच प्राप्त कर सकते हैं.",
      failedToSaveAnnotations: "टिप्पणियां सहेजने में विफल!",
      embeddedItemsWillBeLost: "एम्बेड आइटम खो जाएंगे.",
      switchingToAnotherModeWillLoseTheEmbeddedItemsDoYouWantToContinue:
        "अन्य मोड पर जाने से एम्बेड आइटम खो जाएंगे. क्या आप जारी रखना चाहते हैं?",
      youCannotEmbedItemsIntoAttachmentItem:
        "आप आइटम्स को एट्चिमेंट आइटम में एम्बेड नहीं कर सकते।",
      youAreInEditModeEditingANotationCannotEmbedItemsInsideTheAnnotation:
        "आप संपादन मोड में हैं. एट्चिमेंट आइटम में आइटम्स को एम्बेड नहीं किया जा सकता!",
      pleaseEmbedSomethingToSaveAnnotations:
        "कृपया कुछ डालें टिप्पणियां सहेजने के लिए!",
      onlyVersesAndChaptersAreAllowedForTopLevelAnnotation:
        "केवल अध्याय और अध्याय को टिप्पणी के शीर्ष स्तर के लिए अनुमति दी गई है!",
      someOfYourScripturesAreNotEmbedded:
        "आपके अध्यायों में कुछ अध्याय अनुमति दी गई है अध्याय को टिप्पणी के शीर्ष स्तर के लिए अनुमति दी गई है!",
      annotationsSavedSuccessfully: "टिप्पणियां सफलतापूर्वक सहेजी गईं",
      errorUpdatingAnnotations: "टिप्पणियां अपडेट करने में त्रुटि",
      failedToUpdateAnnotations: "टिप्पणियां अपडेट करने में विफल!",
      cannotSaveEmptyAnnotation:
        "टिप्पणियां खाली नहीं बचा सकते. कृपया हटाने का उपयोग करें!",
      youCannotUnlinkAttachmentsInAnnotationMode:
        "आप टिप्पणी मोड में टिप्पणियां अनलिंक नहीं कर सकते!",
      cannotEmbedEmbeddedItem:
        "पहले से एम्बेड किए गए आइटम को एम्बेड नहीं किया जा सकता! सामग्री: {{embededItem}}। कृपया एम्बेड करने से पहले इसे हटा दें।",
      failedToFetchAnnotations: "टिप्पणियां प्राप्त करने में विफल!",
      errorFetchingAnnotations: "टिप्पणियां प्राप्त करने में त्रुटि",
      cannotChangeWhileBeingInEditMode:
        "आप संपादन मोड में होने पर बदल सकते नहीं!",
      invalidLinkFormat: "अवैध लिंक प्रारूप!",
      UPLOAEDJSONERROR: "JSON अपलोड त्रुटि",
      selectAPlaylistToAnnotate: "एक प्लेलिस्ट को टिप्पणी करने के लिए चुनें",
      attachmentNameMissing: "अधिकार नाम गायब है!",
      noFilesUploaded: "कोई फ़ाइल अपलोड नहीं की गई!",
      recordSomethingToSaveRecording: "रिकॉर्ड कुछ बचाने के लिए रिकॉर्ड करें!",
      infoType: "छवि, .pdf, doc, .AUX etc",
      unknownDataType: "अज्ञात डेटा प्रकार",
      dragDropOrClickToBrowse: "ड्रॉप ड्रॉप या क्लिक करें खोजने के लिए",
      failedToUploadSomeFiles: "कुछ फ़ाइलें अपलोड करने में विफल!",
      heading: "शीर्षक",
      failedToUpload: "फ़ाइल अपलोड करने में विफल!",
      noFileUploaded: "कोई फ़ाइल अपलोड नहीं की गई!",
      exampleeg: "जैसे",
      type: "प्रकार",
      text: "पाठ",
      role: "भूमिका",
      typeToAddCustomTitle: "(वैकल्पिक) एक अनुकूल शीर्षक जोड़ने के लिटाइप करें",
      fileRejectedForNotBeingValidJSON:
        "{{count}} फ़ाइल(s) अस्वीकृत कर दिया गया क्योंकि यह एक सही JSON प्रारूप नहीं है।",
      video: "वीडियो",
      youtube: "यूट्यूब",
      externalLink: "बाहरी लिंक",
      iframe: "इफ्रेम",
      audio: "ऑडियो",
      screen: "स्क्रीन",
      importJSON: "JSON इम्पोर्ट करें",
      importJSONTooltip: "JSON फ़ाइल इम्पोर्ट करें",
      typeToAddScripture: "पाठ जोड़ने के लिए टाइप करें (जैसे: जन 1, विषय 2:4)",
      tagName: "टैग नाम",
      dropFilesHere: "फ़ाइलें यहां ड्रॉप करें",
      releaseToUploadFiles: "फ़ाइलें अपलोड करने के लिए जारी करें",
      addItemsBelow: "आइटम्स नीचे जोड़ें।",
      clickHereToGeneratePlaylist: "जनरेट प्लेलिस्ट के लिए यहां क्लिक करें।",
      pleaseFixDatesInWrongOrder: "कृपया तारीखें गलत क्रम में ठीक करें।",
      pleaseFixRepeatingDates: "कृपया दोहराए गए तारीखों को ठीक करें।",
      cannotEmbedEmbeddedItem:
        "आप आइटम्स को एट्चिमेंट आइटम में एम्बेड नहीं कर सकते।",
      youCannotEmbedItemsIntoAttachmentItem:
        "आप आइटम्स को एट्चिमेंट आइटम में एम्बेड नहीं कर सकते।",
      systemPrompt: "सिस्टम प्रॉम्प्ट",
      pleaseAddSomeItemsToSavePlaylist:
        "कृपया कुछ आइटम जोड़ें प्लेलिस्ट बनाने के लिए!",
      prompt: "प्रॉम्प्ट",
      generationPrompt: "जनरेट प्रॉम्प्ट:",
      annotationModeTooltip:
        "टिप्पणी मोड बायबल को टिप्पणी करने का तरीका है ताकि आप अन्य व्यक्तियों के सदस्यों के साथ सामग्री देख सकें।",
      playlistModeTooltip:
        "प्लेलिस्ट मोड बायबल को प्लेलिस्ट बनाने का तरीका है ताकि आप अन्य व्यक्तियों के सदस्यों के सामग्री देख सकें।",
      annotationMode: "टिप्पणी मोड",
      projectModeTooltip: "प्रोजेक्ट मोड अद्भुत है।",
      draft: "ड्राफ्ट",
      playlistMode: "प्लेलिस्ट मोड",
      projectMode: "प्रोजेक्ट मोड",
      copyItems: "आइटम्स कॉपी करें",
      copyItemsInstructions:
        "वर्तमान प्लेलिस्ट में जोड़ने के लिए किसी भी प्लेलिस्ट को दबाए रखें।",
      copyItemInstructions:
        "वर्तमान प्लेलिस्ट में जोड़ने के लिए किसी भी आइटम को दबाए रखें।",
      embed: "एम्बेड करें",
      remove: "हटाएं",
      mergeMode: "मर्ज मोड",
      regenerationPrompt: "पुनर्जनन प्रॉम्प्ट:",
      describePlaylist: "आप जो प्लेलिस्ट बनाना चाहते हैं उसका वर्णन करें।",
      describeSystemPrompt: "अपना सिस्टम प्रॉम्प्ट वर्णित करें।",
      systemPromptInfo:
        "अपने प्रारंभिक प्रॉम्प्ट को वेरिएबल के रूप में उपयोग करने के लिए $text$ का उपयोग करें।",
      addMedia: "मीडिया जोड़ें",
      insertDate: "तारीख डालें",
      searchAndAdd: "खोजें और जोड़ें",
      typeToSearch: "खोजने के लिए टाइप करें",
      generate: "जनरेट करें",
      layers: "लेयर्स",
      removeAndSave: "हटाएं और सहेजें",
      noEmbdedItemsFound: "एम्बेडेड आइटम्स नहीं मिले",
      noEmbdedItemsMsg:
        "आपके कुछ आइटम्स एम्बेडेड नहीं हैं। परतों में सभी एम्बेडेड आइटम्स होने चाहिए।",
      playlistSettingsTooltip:
        "प्लेलिस्ट विकल्पों को नीचे बदलकर नए प्रकार की सूचियां बनाएं।",
      pleaseLoginToUseMoreFeatures:
        "कृपया लॉगिन करें अधिक सुविधाओं का उपयोग करने के लिए।",
      playlists: "प्लेलिस्ट्स",
      untitled: "[शीर्षकहीन]",
      nothingBookmarked: "कुछ भी बुकमार्क नहीं किया गया।",
      sharedPlaylists: "साझा प्लेलिस्ट्स",
      editingPlaylists: "प्लेलिस्ट्स संपादित करें",
      createNewPlaylist: "नई प्लेलिस्ट बनाएं",
      createNewLayer: "नई परत बनाएं",
      generatePlaylist: "प्लेलिस्ट जनरेट करें",
      generateLayers: "परतें जनरेट करें",
      generating: "जनरेट हो रहा है",
      regenerate: "पुनः जनरेट करें",
      playlistSettings: "प्लेलिस्ट सेटिंग्स",
      publishSettings: "प्रकाशन सेटिंग्स",
      publishSettingsDesc:
        "यदि सार्वजनिक है तो आपकी टिप्पणियां सभी के लिए उपलब्ध होंगी। निजी होने पर केवल आप एक्सेस कर सकते हैं।",
      privateAccess: "निजी पहुंच",
      publicAccess: "सार्वजनिक पहुंच",
      checklist: "चेकलिस्ट",
      checklistTooltip:
        "चेकलिस्ट मोड आपको विज़िट किए गए आइटम्स को चेक करके अपनी प्रगति ट्रैक करने देता है।",
      readingPlan: "पठन योजना",
      readingPlanTooltip:
        "प्लान मोड आपको अपनी प्लेलिस्ट में तारीखें जोड़ने देता है जो तारीख के अनुसार प्रगति ट्रैक करता है।",
      revertToPrevious: "पिछले पर वापस जाएं",
      downloadJSON: "JSON डाउनलोड करें",
      copyOtherPlaylists: "अन्य प्लेलिस्ट कॉपी करें",
      noPlaylistsToShow: "दिखाने के लिए कोई प्लेलिस्ट नहीं।",
      noLayersToShow: "दिखाने के लिए कोई परत नहीं।",
      notEmbeddedItemsFound: "गैर-एम्बेडेड आइटम्स मिले",
      notEmbeddedItemsMsg:
        "आपके कुछ आइटम्स एम्बेडेड नहीं हैं। परतों में सभी एम्बेडेड आइटम्स होने चाहिए।",
      removeAndSave: "हटाएं और सहेजें",
      copyItems: "आइटम्स कॉपी करें",
      copyItemsInstructions:
        "वर्तमान प्लेलिस्ट में जोड़ने के लिए किसी भी प्लेलिस्ट को दबाए रखें।",
      copyItemInstructions:
        "वर्तमान प्लेलिस्ट में जोड़ने के लिए किसी भी आइटम को दबाए रखें।",
      embed: "एम्बेड करें",
      remove: "हटाएं",
      mergeMode: "मर्ज मोड",
      regenerationPrompt: "पुनर्जनन प्रॉम्प्ट:",
      describePlaylist: "आप जो प्लेलिस्ट बनाना चाहते हैं उसका वर्णन करें।",
      describeSystemPrompt: "अपना सिस्टम प्रॉम्प्ट वर्णित करें।",
      systemPromptInfo:
        "अपने प्रारंभिक प्रॉम्प्ट को वेरिएबल के रूप में उपयोग करने के लिए $text$ का उपयोग करें।",
      addMedia: "मीडिया जोड़ें",
      insertDate: "तारीख डालें",
      searchAndAdd: "खोजें और जोड़ें",
      typeToSearch: "खोजने के लिए टाइप करें",
      generate: "जनरेट करें",
      layers: "लेयर्स",

      // PlaylistUI
      discover: "खोजें",
      create: "बनाएं",
      welcomeToSeedBible: "Seed Bible में आपका स्वागत है",
      sharedAPlaylist: "ने एक प्लेलिस्ट साझा की।",
      hereIsYourSharedPlaylist: "यह है आपकी साझा प्लेलिस्ट।",
      start: "शुरू करें",
      thisWillStopPlayingPlaylist: "इससे प्लेलिस्ट बजना बंद हो जाएगी।",
      playlistCurrentlyPlayingConfirm:
        "एक प्लेलिस्ट वर्तमान में चल रही है। क्या आप इसे रोककर जारी रखना चाहते हैं?",
      confirm: "पुष्टि करें",
      annotation: "एनोटेशन",
      pleaseLoginToUseFeature:
        "कृपया इस सुविधा का उपयोग करने के लिए लॉगिन करें।",
      addAnotherParallelPlaylist:
        "क्या आप एक और समानांतर प्लेलिस्ट जोड़ना चाहते हैं?",

      // Discover chips
      all: "सभी",
      pinnedItems: "पिन किए गए आइटम",
      shared: "साझा",
      annotations: "एनोटेशन",
      bookmarks: "बुकमार्क्स",

      // AnnotationList
      deleteAnnotation: "एनोटेशन हटाएं",
      deleteAnnotationConfirmation:
        "यह एनोटेशन और इसके सभी संस्करण स्थायी रूप से हटा दिए जाएंगे। यह क्रिया पूर्ववत नहीं की जा सकती! क्या आप वाकई इसे हटाना चाहते हैं?",
      annotationDeletedSuccessfully: "एनोटेशन सफलतापूर्वक हटाया गया!",
      failedToDeleteAnnotation:
        "एनोटेशन हटाने में विफल। कृपया पुनः प्रयास करें!",
      fetchingAnnotations: "एनोटेशन प्राप्त हो रहे हैं",
      noAnnotationsFound: "कोई एनोटेशन नहीं मिला।",
      showVersionHistory: "संस्करण इतिहास दिखाएं",
      editAnnotations: "एनोटेशन संपादित करें",
      deleteAnnotations: "एनोटेशन हटाएं",

      // AddNewPlaylist
      createManually: "मैन्युअल रूप से बनाएं",
      importTab: "इम्पोर्ट",
      googleSheet: "Google शीट",
      jsonFormat: "JSON फॉर्मेट",
      backToDiscover: "खोज पर वापस",
      backToCreate: "बनाने पर वापस",
      enterDetailsBelow: "नीचे विवरण दर्ज करें।",
      addDetailsToSave: "इच्छानुसार सहेजने और साझा करने के लिए विवरण जोड़ें।",
      importHeader: "इम्पोर्ट",
      whatsThis: "यह क्या है?",
      jsonDataUploaded: "JSON डेटा अपलोड हुआ",
      chooseColor: "रंग चुनें",
      chooseIcon: "आइकन चुनें",
      playlistName: "प्लेलिस्ट का नाम",
      layerName: "परत का नाम",
      playlistNamePlaceholder: "उदा. रोमियों की राह",
      descriptionOptional: "(वैकल्पिक) यहां विवरण टाइप करें",
      autoGenerateByDescription: "विवरण से स्वत: प्लेलिस्ट जनरेट करें।",
      tagsHeader: "टैग्स",
      tagPlaceholder: "(वैकल्पिक) उदा. प्रचार",
      uploadFile: "फ़ाइल अपलोड करें",
      reUploadFile: "पुनः अपलोड करें",
      saving: "सहेज रहा है..",
      howToCreateFromSheet: "Google स्प्रेडशीट से प्लेलिस्ट कैसे बनाएं",
      sheetInstructions:
        "आप प्लेलिस्ट तेज़ी से बनाने के लिए Google स्प्रेडशीट का उपयोग कर सकते हैं।",
      abbreviationsInfo: "आप संक्षिप्त नाम या पुस्तक का नाम उपयोग कर सकते हैं।",
      spellCorrectly: "सुनिश्चित करें कि आप सही वर्तनी लिखें।",
      seeSampleList: "नमूना सूची देखें",
      rememberPublic: "अपनी प्लेलिस्ट को सार्वजनिक करना याद रखें।",
      jsonInstructions:
        "आप प्लेलिस्ट तेज़ी से बनाने के लिए JSON फॉर्मेट का उपयोग कर सकते हैं।",
      jsonDownloadInfo:
        "आप हमारे ऐप से डाउनलोड किए गए JSON फॉर्मेट का उपयोग कर सकते हैं।",
      seeSampleJSON: "नमूना JSON देखें",
      rememberJSONFormat: "दिए गए फॉर्मेट में JSON बनाना याद रखें।",

      // PlaylistRowItem
      renamePlaylist: "प्लेलिस्ट का नाम बदलें",
      editPlaylist: "प्लेलिस्ट संपादित करें",
      duplicatePlaylist: "प्लेलिस्ट डुप्लिकेट करें",
      downloadPlaylistJSON: "प्लेलिस्ट JSON डाउनलोड करें",
      sharePlaylist: "प्लेलिस्ट साझा करें",
      deletePlaylist: "हटाएं",
      exportOutside: "बाहर निर्यात करें",
      mergePlaylist: "प्लेलिस्ट मर्ज करें",
      nowPlaying: "अभी चल रहा है",
      checklistEnabled: "चेकलिस्ट सक्षम",
      planEnabled: "योजना सक्षम",
      noItemsYet: "अभी तक कोई आइटम नहीं, नीचे कुछ जोड़ें।",
      noDescription: "कोई विवरण नहीं",
      editPlaylistTitle: "प्लेलिस्ट संपादित करें",
      editSharedPlaylistMsg:
        "इस साझा प्लेलिस्ट को केवल निर्माता ही संपादित कर सकता है।",
      makeACopy: "क्या आप एक कॉपी बनाना चाहेंगे?",
      yes: "हां",
      no: "नहीं",
      shareURLCopied: "शेयर URL क्लिपबोर्ड पर कॉपी हुआ।",
      playlistShareError:
        "प्लेलिस्ट केवल प्रकाशित पैटर्न में साझा की जा सकती है। निर्यात करें।",
      unableToCopy: "प्लेलिस्ट कॉपी नहीं हो सकी। पुनः प्रयास करें!",
      cannotMergeNested: "नेस्टेड प्लेलिस्ट मर्ज नहीं हो सकती!",

      // Error messages
      playlistNameNotFound: "प्लेलिस्ट का नाम नहीं मिला!",
      playlistNameExists: "प्लेलिस्ट का नाम पहले से मौजूद है!",
      enterPlaylistName: "प्लेलिस्ट का नाम दर्ज करें!",
      enterLinkToImport: "इम्पोर्ट के लिए लिंक दर्ज करें!",
      uploadFileToImport: "इम्पोर्ट के लिए फ़ाइल अपलोड करें!",
      noValidJSONFound: "कोई वैध JSON नहीं मिला!",
      pleaseUploadJSON: "कृपया JSON फॉर्मेट अपलोड करें!",
      unableToProcess: "फ़ाइल प्रोसेस नहीं हो सकी!",
      noFileUploaded: "कोई फ़ाइल अपलोड नहीं हुई!",
      pleaseUploadImage: "कृपया इमेज फॉर्मेट अपलोड करें!",
      failedToUpload: "फ़ाइल अपलोड विफल!",
      tagNameMissing: "टैग का नाम गायब है!",
      tagsLimitExceeded: "टैग्स की सीमा 8 से अधिक नहीं हो सकती!",
      tagInvalidChars: "टैग में केवल नंबर, अक्षर, स्पेस, - हो सकते हैं!",
      tagAlreadyPresent: "टैग पहले से मौजूद है!",
      saveInProgress: "सहेजना जारी है!",
      layersShouldHaveTag: "परतों में कम से कम एक टैग होना चाहिए!",
      fillDescriptionForAuto: "ऑटो जनरेशन के लिए विवरण भरें!",
      couldntAutoFind: "दिए गए विवरण के लिए आइटम नहीं मिले!",
      unableToGeneratePlaylist:
        "प्लेलिस्ट जनरेट नहीं हो सकी। पुनः प्रयास करें!",
      enterTextForGeneration: "प्लेलिस्ट जनरेशन के लिए टेक्स्ट दर्ज करें!",
      regenerationInProgress: "पुनर्जनन जारी है!",
      regenerationFailed: "पुनर्जनन विफल!",
      cannotEmbedEmbedded:
        "एम्बेडेड आइटम को एम्बेड नहीं कर सकते! सामग्री: {{content}}। एम्बेड करने से पहले इसे हटाएं!",

      // Scripture Map 2D
      show: "दिखाएं",
      hide: "छुपाएं",
      timeline: "समयरेखा",
      closeBooks: "पुस्तकें बंद करें",
      openBooks: "पुस्तकें खोलें",
      booksColor: "पुस्तकों का रंग",
      readingHistory: "पढ़ने का इतिहास",
      userPresence: "उपयोगकर्ता उपस्थिति",
      labelsText: "लेबल",
      zoomLevel: "ज़ूम स्तर",
      monShort: "सोम",
      wedShort: "बुध",
      friShort: "शुक्र",
      today: "आज",
      spentHours: "{{count}} घंटे बिताए",
      spentHour: "{{count}} घंटा बिताया",
      spentMinutes: "{{count}} मिनट बिताए",
      spentMinute: "{{count}} मिनट बिताया",
      readingNow: "अभी पढ़ रहे हैं",
      you: "आप",
      guest: "अतिथि",
      readDaysAgo: "{{count}} दिन पहले पढ़ा",
      readDayAgo: "{{count}} दिन पहले पढ़ा",
      readHoursAgo: "{{count}} घंटे पहले पढ़ा",
      readHourAgo: "{{count}} घंटा पहले पढ़ा",
      readMinutesAgo: "{{count}} मिनट पहले पढ़ा",
      readMinuteAgo: "{{count}} मिनट पहले पढ़ा",
      stateNone: "कोई नहीं",
      stateAssigned: "सौंपा गया",
      stateInProgress: "प्रगति में",
      stateNeedsReview: "समीक्षा आवश्यक",
      stateCompleted: "पूर्ण",
      selectionMode: "चयन मोड",
      status: "स्थिति",
      clearSelection: "चयन साफ़ करें",
      done: "हो गया",
      all: "सभी",

      // Calendar
      initialTitle: "प्रारंभिक शीर्षक",
      typeCalendarName: "कैलेंडर का नाम टाइप करें",
      goToCalendar: "कैलेंडर पर जाएं",
      noEventsInView: "दृश्य में कोई कार्यक्रम नहीं।",
      allDay: "पूरे दिन",
      viewMore: "और देखें",
      to: "से",
      noRepeat: "कोई दोहराव नहीं",
      custom: "कस्टम",
      description: "विवरण",
      linkOptional: "लिंक (वैकल्पिक)",
      availablePlaylists: "उपलब्ध प्लेलिस्ट",
      addTitle: "शीर्षक जोड़ें",
      event: "कार्यक्रम",
      readingPlans: "पढ़ने की योजनाएं",
      customRecurrence: "कस्टम पुनरावृत्ति",
      repeatOn: "इस पर दोहराएं",
      eventsForSelectedDate: "चयनित तिथि के कार्यक्रम",
      noEventsForDate: "इस तिथि के लिए कोई कार्यक्रम नहीं मिला।",
      copy: "कॉपी करें",
      copyEvents: "कार्यक्रम कॉपी करें",
      events: "कार्यक्रम",
      addDescription: "विवरण जोड़ें",
      link: "लिंक",
      editGroup: "समूह संपादित करें",
      groupName: "समूह का नाम",
      addRoomToGroup: "समूह में कमरा जोड़ें",
      roomTitle: "कमरे का शीर्षक",
      addRoom: "कमरा जोड़ें",
      rooms: "कमरे",
      remove: "हटाएं",
      showLess: "कम दिखाएं",
      showMore: "अधिक दिखाएं",
      addResource: "संसाधन जोड़ें",
      category: "श्रेणी",
      subcategory: "उप-श्रेणी",
      enterRoom: "कमरा दर्ज करें",
      eventsTab: "कार्यक्रम",
      readingTab: "पढ़ना",
      contentTab: "सामग्री",
      projectsTab: "परियोजनाएं",
      sourcesTab: "स्रोत",
      eventsFor: "कार्यक्रम",
      bibleMap: "बाइबिल मानचित्र",
      hideTitle: "शीर्षक छुपाएं",
      showTitle: "शीर्षक दिखाएं",
      hideSchedule: "अनुसूची छुपाएं",
      showSchedule: "अनुसूची दिखाएं",
      hideHolidays: "छुट्टियां छुपाएं",
      showHolidays: "छुट्टियां दिखाएं",
      openCalendar: "कैलेंडर खोलें",
      openMap: "मानचित्र खोलें",
      openBoth: "दोनों खोलें",

      searchBook: "पुस्तक खोजें...",
      searchTranslation: "अनुवाद खोजें...",
      oldTestament: "पुराना नियम",
      newTestament: "नया नियम",
      oldTestamentShort: "पु.नि",
      newTestamentShort: "न.नि",
      apocrypha: "अपोक्रिफल",
      allBooks: "सभी पुस्तकें",
      customTranslations: "अनुवाद में कस्टमाइज़ करें",
      fromId: "ID से",
      fromUrl: "URL से",
      enterId: "ID दर्ज करें",
      Queue: "क्यू",
    },
  },
};

// Available languages for UI
export const availableLanguages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "ar", name: "Arabic", nativeName: "العربية", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
];

// Initialize i18n instance
let i18nInstance: any = null;
let isInitialized = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

// Get browser language and map to supported language
function getBrowserLanguage(): string {
  const supportedLangs = ["en", "es", "ar", "hi"];

  // Use navigator.language API
  const browserLang =
    navigator.language || (navigator as any).userLanguage || "en";

  // Extract the primary language code (e.g., "en" from "en-US")
  const primaryLang = browserLang.split("-")[0].toLowerCase();

  // Check if the primary language is supported
  if (supportedLangs.includes(primaryLang)) {
    return primaryLang;
  }

  // Check navigator.languages for fallback options
  if (navigator.languages && navigator.languages.length > 0) {
    for (const lang of navigator.languages) {
      const code = lang.split("-")[0].toLowerCase();
      if (supportedLangs.includes(code)) {
        return code;
      }
    }
  }

  return "en"; // Default fallback
}

export async function initI18n(): Promise<any> {
  if (isInitialized && i18nInstance) {
    return i18nInstance;
  }

  // Load scripts sequentially
  for (const src of i18nScripts) {
    await loadScript(src);
  }

  // Access i18next from global
  const i18next = (globalThis as any).i18next;

  if (!i18next) {
    throw new Error("i18next failed to load from CDN");
  }

  // Get saved language from localStorage, or detect from browser using navigator.language
  const savedLang = localStorage.getItem("i18nextLng");
  const detectedLang = savedLang || getBrowserLanguage();

  await i18next.init({
    resources,
    lng: detectedLang,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

  // Save detected language to localStorage for persistence
  if (!savedLang) {
    localStorage.setItem("i18nextLng", detectedLang);
  }

  i18nInstance = i18next;
  isInitialized = true;

  // Expose globally
  globalThis.i18n = i18next;
  globalThis.t = i18next.t.bind(i18next);

  return i18next;
}

// Translation function that works before/after init
export function t(key: string, options?: any): string {
  if (i18nInstance) {
    return i18nInstance.t(key, options);
  }
  // Fallback to English if not initialized
  const keys = key.split(".");
  let value: any = resources.en.translation;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

// Change language
export function changeLanguage(lng: string): Promise<void> {
  if (i18nInstance) {
    localStorage.setItem("i18nextLng", lng);
    // Update document direction for RTL languages
    const langConfig = availableLanguages.find((l) => l.code === lng);
    document.documentElement.dir = langConfig?.rtl ? "rtl" : "ltr";
    document.documentElement.lang = lng;
    shout("onLanguageChanged", { lng });
    return i18nInstance.changeLanguage(lng);
  }
  return Promise.resolve();
}

// Get current language
export function getCurrentLanguage(): string {
  if (i18nInstance) {
    return i18nInstance.language;
  }
  return localStorage.getItem("i18nextLng") || "en";
}

// Check if current language is RTL
export function isRTL(): boolean {
  const lang = getCurrentLanguage();
  const langConfig = availableLanguages.find((l) => l.code === lang);
  return langConfig?.rtl || false;
}

// Get all translations for current language
export function getTranslations(): Record<string, string> {
  const lang = getCurrentLanguage();
  return (
    resources[lang as keyof typeof resources]?.translation ||
    resources.en.translation
  );
}

const numberTranslations: Record<string, string[]> = {
  hi: ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"],
  ar: ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"],
  en: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  es: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
};

export function getTranslatedNumber(num: number): string {
  const lang = getCurrentLanguage();
  const numStringArr = String(num).split("");
  const digitsForLang = numberTranslations[lang] ?? numberTranslations["en"];
  return numStringArr
    .map((digit) => {
      if (digit >= "0" && digit <= "9") {
        const idx = parseInt(digit, 10);
        const translated = digitsForLang?.[idx];
        return translated ?? digit;
      }
      return digit;
    })
    .join("");
}

export { resources };
