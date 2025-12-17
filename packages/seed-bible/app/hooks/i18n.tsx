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
      menuBackground: "Menu Background",
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
      joinAnotherSession: "Join another session",

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
      menuBackground: "Fondo del menú",
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
      menuBackground: "خلفية القائمة",
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
      menuBackground: "मेनू पृष्ठभूमि",
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
  const LanguageDetector = (globalThis as any).i18nextBrowserLanguageDetector;

  if (!i18next) {
    throw new Error("i18next failed to load from CDN");
  }

  // Get saved language or detect
  const savedLang = localStorage.getItem("i18nextLng");

  await i18next.use(LanguageDetector).init({
    resources,
    lng: savedLang || undefined,
    fallbackLng: "en",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

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

export { resources };
