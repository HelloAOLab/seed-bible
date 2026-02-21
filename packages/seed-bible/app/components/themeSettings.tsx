const { useEffect, useState, useRef } = os.appHooks;
import { getStyleOf } from "app.styles.styler";
import { MenuIcon, ThemeIcon } from "app.components.icons";
import { useTabsContext } from "app.hooks.tabs";
import { useSideBarContext } from "app.hooks.sideBar";
import { useBibleContext } from "app.hooks.bibleVariables";

// ————————————————————————————————————————————————————————————
// Fields shown in the screenshot, rendered dynamically below
// ————————————————————————————————————————————————————————————
const COLOR_FIELDS = [
  { labelKey: "panelBackground", field: "panelBackground" },
  { labelKey: "pageBackground", field: "pageBackground" },
  { labelKey: "pageTextColor", field: "pageTextColor" },
  { labelKey: "iconsColor", field: "iconColor" },
  { labelKey: "primaryButtonBg", field: "primaryButton" },
  { labelKey: "primaryButtonText", field: "primaryButtonColor" },
  { labelKey: "secondaryButtonBg", field: "secondaryButton" },
  { labelKey: "secondaryButtonBg", field: "secondaryButton" },
  { labelKey: "buttonBorder", field: "buttonBorder" },
  { labelKey: "tabSelection", field: "tabSelection" },
  { labelKey: "spaceSelection", field: "spaceSelection" },
  { labelKey: "toolbarBackground", field: "toolbarBackground" },
  { labelKey: "primaryText", field: "text1" },
  { labelKey: "secondaryText", field: "text2" },
];

// ————————————————————————————————————————————————————————————
// Advanced Settings Sections Configuration
// ————————————————————————————————————————————————————————————
const ADVANCED_SETTINGS_SECTIONS = {
  containerBackgrounds: {
    labelKey: "containerBackgrounds",
    fields: [
      { labelKey: "panelBackground", field: "panelBackground" },
      { labelKey: "pageBackground", field: "pageBackground" },
    ],
  },
  tab: {
    labelKey: "tab",
    fields: [
      { labelKey: "tabSelection", field: "tabSelection" },
      { labelKey: "activeTabBackground", field: "activeTabBackground" },
      { labelKey: "activeTabText", field: "activeTabText" },
      { labelKey: "simpleTabText", field: "simpleTabText" },
    ],
  },
  buttons: {
    labelKey: "buttons",
    fields: [
      { labelKey: "primaryButtonBg", field: "primaryButton" },
      { labelKey: "primaryButtonText", field: "primaryButtonColor" },
      { labelKey: "secondaryButtonBg", field: "secondaryButton" },
      { labelKey: "buttonBorder", field: "buttonBorder" },
    ],
  },
  scriptureText: {
    labelKey: "scriptureText",
    fields: [
      { labelKey: "bookHeading", field: "bookHeadingColor" },
      { labelKey: "chapterHeading", field: "chapterHeadingColor" },
      { labelKey: "verseNumber", field: "verseNumberColor" },
      { labelKey: "verseText", field: "verseTextColor" },
      { labelKey: "pageBackground", field: "pageBackground" },
    ],
  },
  sideMenu: {
    labelKey: "sideMenu",
    fields: [
      { labelKey: "panelBackground", field: "panelBackground" },
      { labelKey: "spaceNameText", field: "spaceNameText" },
      { labelKey: "addButtonBackground", field: "addButtonBackground" },
      { labelKey: "addButtonIcon", field: "addButtonIcon" },
      { labelKey: "selectPanelIcon", field: "selectPanelIcon" },
      { labelKey: "openCloseMenuIcon", field: "openCloseMenuIcon" },
      { labelKey: "moreIcon", field: "moreIcon" },
      { labelKey: "settingsIcon", field: "settingsIcon" },
      { labelKey: "inactiveSpaceIndicator", field: "inactiveSpaceIndicator" },
      { labelKey: "activeSpaceIndicator", field: "activeSpaceIndicator" },
      { labelKey: "profileAvatar", field: "profileAvatar" },
    ],
  },
  selectionUIToolbar: {
    labelKey: "selectionUIToolbar",
    fields: [
      { labelKey: "toolbarBackground", field: "toolbarBackground" },
      { labelKey: "iconsColor", field: "iconColor" },
    ],
  },
  inputFields: {
    labelKey: "inputFields",
    fields: [
      { labelKey: "inputBackground", field: "inputBackground" },
      { labelKey: "inputBorder", field: "inputBorder" },
      { labelKey: "inputText", field: "inputText" },
      { labelKey: "inputPlaceholder", field: "inputPlaceholder" },
    ],
  },
  bibleArrangements: {
    labelKey: "Bible Arrangements",
    fields: [],
  },
  branding: {
    labelKey: "branding",
    fields: [
      { labelKey: "logoColor", field: "logoColor" },
      { labelKey: "accentColor", field: "accentColor" },
    ],
  },
};

// Default Theme - Warm Orange/Amber accent
// Based on the design mockup with orange accent colors
const builtinDefaultTheme = {
  // Main colors
  firstToolbarbutton: "#dfdede",
  primaryColor: "#FFFFFF",
  secondaryColor: "#E07B4C",
  tertiaryColor: "#FADDD1",
  // Container backgrounds
  themeSideMenu: "#FFFFFF",
  panelBackground: "#F8FAFC",
  // Tab
  tabSelection: "#E07B4C",
  activeTabBackground: "#FADDD1",
  activeTabText: "#E07B4C",
  activeTabBorder: "#E07B4C",
  activeTabFill: "#FADDD1",
  simpleTabText: "#333333",
  inactiveTabText: "#333333",
  // Buttons
  primaryButton: "#E07B4C",
  primaryButtonColor: "#FFFFFF",
  primaryButtonBorder: "#E07B4C",
  primaryButtonFill: "#E07B4C",
  secondaryButton: "#D2691E",
  secondaryButtonColor: "#FFFFFF",
  secondaryButtonBorder: "#D2691E",
  secondaryButtonFill: "#D2691E",
  tertiaryButtonColor: "#333333",
  buttonBorder: "#E1E3EA",
  // Scripture text
  bookHeadingColor: "#333333",
  chapterHeadingColor: "#333333",
  verseNumberColor: "#000000",
  verseTextColor: "#333333",
  pageBackground: "#FFFFFF",
  pageTextColor: "#333333",
  // Side menu
  heading1Color: "#333333",
  heading2Color: "#333333",
  heading3Color: "#333333",
  descriptionTextColor: "#666666",
  menuTextColor: "#333333",
  breadcrumbsColor: "#666666",
  sectionBackground: "#E07B4C",
  spaceNameColor: "#333333",
  sideMenuIconsColor: "#333333",
  selectedSpaceColor: "#E07B4C",
  unselectedSpaceColor: "#E1E3EA",
  spaceNameText: "#333333",
  addButtonBackground: "#E07B4C",
  addButtonIcon: "#FFFFFF",
  selectPanelIcon: "#333333",
  openCloseMenuIcon: "#333333",
  moreIcon: "#666666",
  settingsIcon: "#666666",
  inactiveSpaceIndicator: "#E1E3EA",
  activeSpaceIndicator: "#E07B4C",
  profileAvatar: "#E07B4C",
  // Selection UI & toolbar
  toolbarBorder: "#E1E3EA",
  toolbarFill: "#FFFFFF",
  toolbarIconsColor: "#333333",
  selectionUIBorder: "#E1E3EA",
  selectionUIFill: "#FFFFFF",
  selectionIconsColor: "#333333",
  toolbarBackground: "#FFFFFF",
  iconColor: "#333333",
  // Input fields
  inputTitleColor: "#333333",
  inputPlaceholderColor: "#999999",
  inputActiveBorder: "#E07B4C",
  inputActiveFill: "#FFFFFF",
  inputInactiveBorder: "#E1E3EA",
  inputInactiveFill: "#FFFFFF",
  inputBackground: "#FFFFFF",
  inputBorder: "#E1E3EA",
  inputText: "#333333",
  inputPlaceholder: "#999999",
  // Branding
  logoColor: "#333333",
  accentColor: "#E07B4C",
  // Space selection
  spaceSelection: "#E07B4C",
  // Text colors
  text1: "#333333",
  text2: "#666666",
  showTabIcons: true,

  // Bible arrangements - TaNaK order
  torahBorder: "#E1E3EA",
  torahFill: "#E07B4C",
  torahFont: "DM Sans",
  torahSize: "12",
  neviimBorder: "#E1E3EA",
  neviimFill: "#9CB32C",
  neviimFont: "DM Sans",
  neviimSize: "12",
  ketuvimBorder: "#E1E3EA",
  ketuvimFill: "#00BCD4",
  ketuvimFont: "DM Sans",
  ketuvimSize: "12",
  bookTextColor: "#4A4A4A",
  bookTextFont: "DM Sans",
  bookTextSize: "12",
  chapterTextColor: "#4A4A4A",
  chapterTextFont: "DM Sans",
  chapterTextSize: "12",
  chapterColorBorder: "#E1E3EA",
  chapterColorFill: "#E1E3EA",
  // Bible arrangements - Traditional order
  pentateuchBorder: "#E1E3EA",
  pentateuchFill: "#E07B4C",
  pentateuchFont: "DM Sans",
  pentateuchSize: "12",
  historicalBorder: "#E1E3EA",
  historicalFill: "#4CAF50",
  historicalFont: "DM Sans",
  historicalSize: "12",
  poeticBorder: "#E1E3EA",
  poeticFill: "#9C27B0",
  poeticFont: "DM Sans",
  poeticSize: "12",
  propheticBorder: "#E1E3EA",
  propheticFill: "#FF9800",
  propheticFont: "DM Sans",
  propheticSize: "12",

  primaryLight: "#FADDD1",
  onPrimaryLight: "#8B4513",
  primaryBase: "#E07B4C",
  onPrimaryBase: "#FFFFFF",
  primaryDark: "#C65D2D",
  onPrimaryDark: "#FFFFFF",
  secondaryLight: "#FFE4C4",
  onSecondaryLight: "#8B4513",
  secondaryBase: "#D2691E",
  onSecondaryBase: "#FFFFFF",
  secondaryDark: "#A0522D",
  onSecondaryDark: "#FFFFFF",
  tertiaryLight: "#FFEFD5",
  onTertiaryLight: "#8B4513",
  tertiaryBase: "#CD853F",
  onTertiaryBase: "#FFFFFF",
  tertiaryDark: "#A0522D",
  onTertiaryDark: "#FFFFFF",
  background: "#FFFFFF",
  onBackground: "#333333",
  surface: "#FAFAFA",
  onSurface: "#333333",
  "filter-mode": "invert(0)",
  text3: "#333333",
  "secondary-filter-mode": "invert(100%)",
};

// ————————————————————————————————————————————————————————————
// Ready Themes Collection
// ————————————————————————————————————————————————————————————
const defaultThemes = [
  {
    name: "Default",
    colors: builtinDefaultTheme,
  },
  {
    name: "Dark Mode",
    colors: {
      firstToolbarbutton: "#5C5C5C",

      // Main colors
      primaryColor: "#1A1A1A",
      secondaryColor: "#5A67D8",
      tertiaryColor: "#404040",
      // Container backgrounds
      themeSideMenu: "#2D2D2D",
      panelBackground: "#1A1A1A",

      // Tab
      tabSelection: "#5A67D8",
      activeTabBackground: "#404040",
      activeTabText: "#FFFFFF",
      activeTabBorder: "#5A67D8",
      activeTabFill: "#5A67D894",
      simpleTabText: "#AAAAAA",
      inactiveTabText: "#AAAAAA",
      // Buttons
      primaryButton: "#404040",
      primaryButtonColor: "#FFFFFF",
      primaryButtonBorder: "#5A67D8",
      primaryButtonFill: "#5A67D8",
      secondaryButton: "#5A67D8",
      secondaryButtonColor: "#FFFFFF",
      secondaryButtonBorder: "#5A67D8",
      secondaryButtonFill: "#5A67D8",
      tertiaryButtonColor: "#FFFFFF",
      buttonBorder: "#5A67D8",
      // Scripture text
      bookHeadingColor: "#FFFFFF",
      chapterHeadingColor: "#FFFFFF",
      verseNumberColor: "#FFFFFF",
      verseTextColor: "#FFFFFF",
      pageBackground: "#121212",
      pageTextColor: "#FFFFFF",
      // Side menu
      heading1Color: "#FFFFFF",
      heading2Color: "#FFFFFF",
      heading3Color: "#FFFFFF",
      descriptionTextColor: "#AAAAAA",
      menuTextColor: "#FFFFFF",
      breadcrumbsColor: "#AAAAAA",
      sectionBackground: "#5A67D8",
      spaceNameColor: "#FFFFFF",
      sideMenuIconsColor: "#FFFFFF",
      selectedSpaceColor: "#5A67D8",
      unselectedSpaceColor: "#666666",
      spaceNameText: "#FFFFFF",
      addButtonBackground: "#404040",
      addButtonIcon: "#5A67D8",
      selectPanelIcon: "#FFFFFF",
      openCloseMenuIcon: "#FFFFFF",
      moreIcon: "#AAAAAA",
      settingsIcon: "#AAAAAA",
      inactiveSpaceIndicator: "#666666",
      activeSpaceIndicator: "#5A67D8",
      profileAvatar: "#5A67D8",
      // Selection UI & toolbar
      toolbarBorder: "#FFFFFF24",
      toolbarFill: "#2D2D2D",
      toolbarIconsColor: "#FFFFFF",
      selectionUIBorder: "#FFFFFF24",
      selectionUIFill: "#2D2D2D",
      selectionIconsColor: "#FFFFFF",
      toolbarBackground: "#1A1A1A",
      iconColor: "#FFFFFF",
      "filter-mode": "invert(100%)",
      "secondary-filter-mode": "invert(0%)",
      // Input fields
      inputTitleColor: "#FFFFFF",
      inputPlaceholderColor: "#AAAAAA",
      inputActiveBorder: "#5A67D8",
      inputActiveFill: "#2D2D2D",
      inputInactiveBorder: "#666666",
      inputInactiveFill: "#2D2D2D",
      inputBackground: "#2D2D2D",
      inputBorder: "#666666",
      inputText: "#FFFFFF",
      inputPlaceholder: "#AAAAAA",
      // Branding
      logoColor: "#FFFFFF",
      accentColor: "#5A67D8",
      // Space selection
      spaceSelection: "#5A67D8",
      // Text colors
      text1: "#FFFFFF",
      text2: "#AAAAAA",
      showTabIcons: true,
      // Semantic colors
      primaryLight: "#93C5FD",
      onPrimaryLight: "#3B82F6",
      primaryBase: "#60A5FA",
      onPrimaryBase: "#111827",
      primaryDark: "#3B82F6",
      onPrimaryDark: "#FFFFFF",
      secondaryLight: "#C4B5FD",
      onSecondaryLight: "#8B5CF6",
      secondaryBase: "#A78BFA",
      onSecondaryBase: "#111827",
      secondaryDark: "#8B5CF6",
      onSecondaryDark: "#FFFFFF",
      tertiaryLight: "#6EE7B7",
      onTertiaryLight: "#10B981",
      tertiaryBase: "#34D399",
      onTertiaryBase: "#111827",
      tertiaryDark: "#FFFFFF",
      onTertiaryDark: "#10B981",
      background: "#0F172A",
      onBackground: "#FFFFFF",
      surface: "#1E293B",
      onSurface: "#FFFFFF",
      text3: "#F1F5F9",
      // Bible arrangements - TaNaK order
      torahBorder: "#666666",
      torahFill: "#E07B4C",
      torahFont: "DM Sans",
      torahSize: "12",
      neviimBorder: "#666666",
      neviimFill: "#9CB32C",
      neviimFont: "DM Sans",
      neviimSize: "12",
      ketuvimBorder: "#666666",
      ketuvimFill: "#00BCD4",
      ketuvimFont: "DM Sans",
      ketuvimSize: "12",
      bookTextColor: "#FFFFFF",
      bookTextFont: "DM Sans",
      bookTextSize: "12",
      chapterTextColor: "#FFFFFF",
      chapterTextFont: "DM Sans",
      chapterTextSize: "12",
      chapterColorBorder: "#666666",
      chapterColorFill: "#666666",
      // Bible arrangements - Traditional order
      pentateuchBorder: "#666666",
      pentateuchFill: "#E07B4C",
      pentateuchFont: "DM Sans",
      pentateuchSize: "12",
      historicalBorder: "#666666",
      historicalFill: "#4CAF50",
      historicalFont: "DM Sans",
      historicalSize: "12",
      poeticBorder: "#666666",
      poeticFill: "#9C27B0",
      poeticFont: "DM Sans",
      poeticSize: "12",
      propheticBorder: "#666666",
      propheticFill: "#FF9800",
      propheticFont: "DM Sans",
      propheticSize: "12",
    },
  },
  {
    name: "Purple Serenity",
    colors: {
      firstToolbarbutton: "#dfdede",
      "filter-mode": "invert(0)",
      "secondary-filter-mode": "invert(0%)",
      // Main colors
      primaryColor: "#FFFFFF",
      secondaryColor: "#7C3AED",
      tertiaryColor: "#EDE9FE",
      // Container backgrounds
      themeSideMenu: "#F5F3FF",
      panelBackground: "#EDE9FE",
      // Tab
      tabSelection: "#7C3AED",
      activeTabBackground: "#FFFFFF",
      activeTabText: "#4C1D95",
      activeTabBorder: "#7C3AED",
      activeTabFill: "#7C3AED94",
      simpleTabText: "#6B7280",
      inactiveTabText: "#6B7280",
      // Buttons
      primaryButton: "#7C3AED",
      primaryButtonColor: "#FFFFFF",
      primaryButtonBorder: "#7C3AED",
      primaryButtonFill: "#7C3AED",
      secondaryButton: "#A78BFA",
      secondaryButtonColor: "#FFFFFF",
      secondaryButtonBorder: "#A78BFA",
      secondaryButtonFill: "#A78BFA",
      tertiaryButtonColor: "#4C1D95",
      buttonBorder: "#DDD6FE",
      // Scripture text
      bookHeadingColor: "#4C1D95",
      chapterHeadingColor: "#4C1D95",
      verseNumberColor: "#7C3AED",
      verseTextColor: "#1F2937",
      pageBackground: "#FFFFFF",
      pageTextColor: "#1F2937",
      // Side menu
      heading1Color: "#4C1D95",
      heading2Color: "#4C1D95",
      heading3Color: "#5B21B6",
      descriptionTextColor: "#6B7280",
      menuTextColor: "#4C1D95",
      breadcrumbsColor: "#6B7280",
      sectionBackground: "#7C3AED",
      spaceNameColor: "#4C1D95",
      sideMenuIconsColor: "#4C1D95",
      selectedSpaceColor: "#7C3AED",
      unselectedSpaceColor: "#DDD6FE",
      spaceNameText: "#4C1D95",
      addButtonBackground: "transparent",
      addButtonIcon: "#7C3AED",
      selectPanelIcon: "#4C1D95",
      openCloseMenuIcon: "#4C1D95",
      moreIcon: "#6B7280",
      settingsIcon: "#6B7280",
      inactiveSpaceIndicator: "#DDD6FE",
      activeSpaceIndicator: "#7C3AED",
      profileAvatar: "#A78BFA",
      // Selection UI & toolbar
      toolbarBorder: "#DDD6FE",
      toolbarFill: "#FFFFFF",
      toolbarIconsColor: "#4C1D95",
      selectionUIBorder: "#DDD6FE",
      selectionUIFill: "#FFFFFF",
      selectionIconsColor: "#4C1D95",
      toolbarBackground: "#FFFFFF",
      iconColor: "#4C1D95",
      // Input fields
      inputTitleColor: "#4C1D95",
      inputPlaceholderColor: "#9CA3AF",
      inputActiveBorder: "#7C3AED",
      inputActiveFill: "#FFFFFF",
      inputInactiveBorder: "#DDD6FE",
      inputInactiveFill: "#FFFFFF",
      inputBackground: "#FFFFFF",
      inputBorder: "#DDD6FE",
      inputText: "#1F2937",
      inputPlaceholder: "#9CA3AF",
      // Branding
      logoColor: "#4C1D95",
      accentColor: "#7C3AED",
      // Space selection
      spaceSelection: "#7C3AED",
      // Text colors
      text1: "#4C1D95",
      text2: "#6B7280",
      showTabIcons: true,
      // Semantic colors
      primaryLight: "#EDE9FE",
      onPrimaryLight: "#5B21B6",
      primaryBase: "#7C3AED",
      onPrimaryBase: "#FFFFFF",
      primaryDark: "#5B21B6",
      onPrimaryDark: "#FFFFFF",
      secondaryLight: "#F5F3FF",
      onSecondaryLight: "#6D28D9",
      secondaryBase: "#A78BFA",
      onSecondaryBase: "#FFFFFF",
      secondaryDark: "#6D28D9",
      onSecondaryDark: "#FFFFFF",
      tertiaryLight: "#DDD6FE",
      onTertiaryLight: "#4C1D95",
      tertiaryBase: "#8B5CF6",
      onTertiaryBase: "#FFFFFF",
      tertiaryDark: "#6D28D9",
      onTertiaryDark: "#FFFFFF",
      background: "#FFFFFF",
      onBackground: "#4C1D95",
      surface: "#F5F3FF",
      onSurface: "#1F2937",
      text3: "#374151",
      // Bible arrangements - TaNaK order
      torahBorder: "#DDD6FE",
      torahFill: "#7C3AED",
      torahFont: "DM Sans",
      torahSize: "12",
      neviimBorder: "#DDD6FE",
      neviimFill: "#A78BFA",
      neviimFont: "DM Sans",
      neviimSize: "12",
      ketuvimBorder: "#DDD6FE",
      ketuvimFill: "#8B5CF6",
      ketuvimFont: "DM Sans",
      ketuvimSize: "12",
      bookTextColor: "#4C1D95",
      bookTextFont: "DM Sans",
      bookTextSize: "12",
      chapterTextColor: "#4C1D95",
      chapterTextFont: "DM Sans",
      chapterTextSize: "12",
      chapterColorBorder: "#DDD6FE",
      chapterColorFill: "#DDD6FE",
      // Bible arrangements - Traditional order
      pentateuchBorder: "#DDD6FE",
      pentateuchFill: "#7C3AED",
      pentateuchFont: "DM Sans",
      pentateuchSize: "12",
      historicalBorder: "#DDD6FE",
      historicalFill: "#A78BFA",
      historicalFont: "DM Sans",
      historicalSize: "12",
      poeticBorder: "#DDD6FE",
      poeticFill: "#8B5CF6",
      poeticFont: "DM Sans",
      poeticSize: "12",
      propheticBorder: "#DDD6FE",
      propheticFill: "#6D28D9",
      propheticFont: "DM Sans",
      propheticSize: "12",
    },
  },
  {
    name: "Green Nature",
    colors: {
      firstToolbarbutton: "#dfdede",
      "filter-mode": "invert(0)",
      "secondary-filter-mode": "invert(100%)",
      // Main colors
      primaryColor: "#FFFFFF",
      secondaryColor: "#059669",
      tertiaryColor: "#D1FAE5",
      // Container backgrounds
      themeSideMenu: "#ECFDF5",
      panelBackground: "#D1FAE5",
      // Tab
      tabSelection: "#059669",
      activeTabBackground: "#FFFFFF",
      activeTabText: "#064E3B",
      activeTabBorder: "#059669",
      activeTabFill: "#05966994",
      simpleTabText: "#6B7280",
      inactiveTabText: "#6B7280",
      // Buttons
      primaryButton: "#059669",
      primaryButtonColor: "#FFFFFF",
      primaryButtonBorder: "#059669",
      primaryButtonFill: "#059669",
      secondaryButton: "#10B981",
      secondaryButtonColor: "#FFFFFF",
      secondaryButtonBorder: "#10B981",
      secondaryButtonFill: "#10B981",
      tertiaryButtonColor: "#064E3B",
      buttonBorder: "#A7F3D0",
      // Scripture text
      bookHeadingColor: "#064E3B",
      chapterHeadingColor: "#064E3B",
      verseNumberColor: "#059669",
      verseTextColor: "#1F2937",
      pageBackground: "#FFFFFF",
      pageTextColor: "#1F2937",
      // Side menu
      heading1Color: "#064E3B",
      heading2Color: "#064E3B",
      heading3Color: "#047857",
      descriptionTextColor: "#6B7280",
      menuTextColor: "#064E3B",
      breadcrumbsColor: "#6B7280",
      sectionBackground: "#059669",
      spaceNameColor: "#064E3B",
      sideMenuIconsColor: "#064E3B",
      selectedSpaceColor: "#059669",
      unselectedSpaceColor: "#A7F3D0",
      spaceNameText: "#064E3B",
      addButtonBackground: "transparent",
      addButtonIcon: "#059669",
      selectPanelIcon: "#064E3B",
      openCloseMenuIcon: "#064E3B",
      moreIcon: "#6B7280",
      settingsIcon: "#6B7280",
      inactiveSpaceIndicator: "#A7F3D0",
      activeSpaceIndicator: "#059669",
      profileAvatar: "#10B981",
      // Selection UI & toolbar
      toolbarBorder: "#A7F3D0",
      toolbarFill: "#FFFFFF",
      toolbarIconsColor: "#064E3B",
      selectionUIBorder: "#A7F3D0",
      selectionUIFill: "#FFFFFF",
      selectionIconsColor: "#064E3B",
      toolbarBackground: "#FFFFFF",
      iconColor: "#064E3B",
      // Input fields
      inputTitleColor: "#064E3B",
      inputPlaceholderColor: "#9CA3AF",
      inputActiveBorder: "#059669",
      inputActiveFill: "#FFFFFF",
      inputInactiveBorder: "#A7F3D0",
      inputInactiveFill: "#FFFFFF",
      inputBackground: "#FFFFFF",
      inputBorder: "#A7F3D0",
      inputText: "#1F2937",
      inputPlaceholder: "#9CA3AF",
      // Branding
      logoColor: "#064E3B",
      accentColor: "#059669",
      // Space selection
      spaceSelection: "#059669",
      // Text colors
      text1: "#064E3B",
      text2: "#6B7280",
      showTabIcons: true,
      // Semantic colors
      primaryLight: "#D1FAE5",
      onPrimaryLight: "#047857",
      primaryBase: "#059669",
      onPrimaryBase: "#FFFFFF",
      primaryDark: "#047857",
      onPrimaryDark: "#FFFFFF",
      secondaryLight: "#ECFDF5",
      onSecondaryLight: "#059669",
      secondaryBase: "#10B981",
      onSecondaryBase: "#FFFFFF",
      secondaryDark: "#059669",
      onSecondaryDark: "#FFFFFF",
      tertiaryLight: "#A7F3D0",
      onTertiaryLight: "#064E3B",
      tertiaryBase: "#34D399",
      onTertiaryBase: "#064E3B",
      tertiaryDark: "#10B981",
      onTertiaryDark: "#FFFFFF",
      background: "#FFFFFF",
      onBackground: "#064E3B",
      surface: "#ECFDF5",
      onSurface: "#1F2937",
      text3: "#374151",
      // Bible arrangements - TaNaK order
      torahBorder: "#A7F3D0",
      torahFill: "#059669",
      torahFont: "DM Sans",
      torahSize: "12",
      neviimBorder: "#A7F3D0",
      neviimFill: "#10B981",
      neviimFont: "DM Sans",
      neviimSize: "12",
      ketuvimBorder: "#A7F3D0",
      ketuvimFill: "#34D399",
      ketuvimFont: "DM Sans",
      ketuvimSize: "12",
      bookTextColor: "#064E3B",
      bookTextFont: "DM Sans",
      bookTextSize: "12",
      chapterTextColor: "#064E3B",
      chapterTextFont: "DM Sans",
      chapterTextSize: "12",
      chapterColorBorder: "#A7F3D0",
      chapterColorFill: "#A7F3D0",
      // Bible arrangements - Traditional order
      pentateuchBorder: "#A7F3D0",
      pentateuchFill: "#059669",
      pentateuchFont: "DM Sans",
      pentateuchSize: "12",
      historicalBorder: "#A7F3D0",
      historicalFill: "#10B981",
      historicalFont: "DM Sans",
      historicalSize: "12",
      poeticBorder: "#A7F3D0",
      poeticFill: "#34D399",
      poeticFont: "DM Sans",
      poeticSize: "12",
      propheticBorder: "#A7F3D0",
      propheticFill: "#047857",
      propheticFont: "DM Sans",
      propheticSize: "12",
    },
  },
  {
    name: "Ocean Blue",
    colors: {
      firstToolbarbutton: "#dfdede",
      "filter-mode": "invert(0)",
      "secondary-filter-mode": "invert(100%)",
      // Main colors
      primaryColor: "#FFFFFF",
      secondaryColor: "#0284C7",
      tertiaryColor: "#E0F2FE",
      // Container backgrounds
      themeSideMenu: "#F0F9FF",
      panelBackground: "#E0F2FE",
      // Tab
      tabSelection: "#0284C7",
      activeTabBackground: "#FFFFFF",
      activeTabText: "#0C4A6E",
      activeTabBorder: "#0284C7",
      activeTabFill: "#0284C794",
      simpleTabText: "#6B7280",
      inactiveTabText: "#6B7280",
      // Buttons
      primaryButton: "#0284C7",
      primaryButtonColor: "#FFFFFF",
      primaryButtonBorder: "#0284C7",
      primaryButtonFill: "#0284C7",
      secondaryButton: "#0EA5E9",
      secondaryButtonColor: "#FFFFFF",
      secondaryButtonBorder: "#0EA5E9",
      secondaryButtonFill: "#0EA5E9",
      tertiaryButtonColor: "#0C4A6E",
      buttonBorder: "#BAE6FD",
      // Scripture text
      bookHeadingColor: "#0C4A6E",
      chapterHeadingColor: "#0C4A6E",
      verseNumberColor: "#0284C7",
      verseTextColor: "#1F2937",
      pageBackground: "#FFFFFF",
      pageTextColor: "#1F2937",
      // Side menu
      heading1Color: "#0C4A6E",
      heading2Color: "#0C4A6E",
      heading3Color: "#075985",
      descriptionTextColor: "#6B7280",
      menuTextColor: "#0C4A6E",
      breadcrumbsColor: "#6B7280",
      sectionBackground: "#0284C7",
      spaceNameColor: "#0C4A6E",
      sideMenuIconsColor: "#0C4A6E",
      selectedSpaceColor: "#0284C7",
      unselectedSpaceColor: "#BAE6FD",
      spaceNameText: "#0C4A6E",
      addButtonBackground: "transparent",
      addButtonIcon: "#0284C7",
      selectPanelIcon: "#0C4A6E",
      openCloseMenuIcon: "#0C4A6E",
      moreIcon: "#6B7280",
      settingsIcon: "#6B7280",
      inactiveSpaceIndicator: "#BAE6FD",
      activeSpaceIndicator: "#0284C7",
      profileAvatar: "#0EA5E9",
      // Selection UI & toolbar
      toolbarBorder: "#BAE6FD",
      toolbarFill: "#FFFFFF",
      toolbarIconsColor: "#0C4A6E",
      selectionUIBorder: "#BAE6FD",
      selectionUIFill: "#FFFFFF",
      selectionIconsColor: "#0C4A6E",
      toolbarBackground: "#FFFFFF",
      iconColor: "#0C4A6E",
      // Input fields
      inputTitleColor: "#0C4A6E",
      inputPlaceholderColor: "#9CA3AF",
      inputActiveBorder: "#0284C7",
      inputActiveFill: "#FFFFFF",
      inputInactiveBorder: "#BAE6FD",
      inputInactiveFill: "#FFFFFF",
      inputBackground: "#FFFFFF",
      inputBorder: "#BAE6FD",
      inputText: "#1F2937",
      inputPlaceholder: "#9CA3AF",
      // Branding
      logoColor: "#0C4A6E",
      accentColor: "#0284C7",
      // Space selection
      spaceSelection: "#0284C7",
      // Text colors
      text1: "#0C4A6E",
      text2: "#6B7280",
      showTabIcons: true,
      // Semantic colors
      primaryLight: "#E0F2FE",
      onPrimaryLight: "#075985",
      primaryBase: "#0284C7",
      onPrimaryBase: "#FFFFFF",
      primaryDark: "#075985",
      onPrimaryDark: "#FFFFFF",
      secondaryLight: "#F0F9FF",
      onSecondaryLight: "#0284C7",
      secondaryBase: "#0EA5E9",
      onSecondaryBase: "#FFFFFF",
      secondaryDark: "#0284C7",
      onSecondaryDark: "#FFFFFF",
      tertiaryLight: "#BAE6FD",
      onTertiaryLight: "#0C4A6E",
      tertiaryBase: "#38BDF8",
      onTertiaryBase: "#0C4A6E",
      tertiaryDark: "#0EA5E9",
      onTertiaryDark: "#FFFFFF",
      background: "#FFFFFF",
      onBackground: "#0C4A6E",
      surface: "#F0F9FF",
      onSurface: "#1F2937",
      text3: "#374151",
      // Bible arrangements - TaNaK order
      torahBorder: "#BAE6FD",
      torahFill: "#0284C7",
      torahFont: "DM Sans",
      torahSize: "12",
      neviimBorder: "#BAE6FD",
      neviimFill: "#0EA5E9",
      neviimFont: "DM Sans",
      neviimSize: "12",
      ketuvimBorder: "#BAE6FD",
      ketuvimFill: "#38BDF8",
      ketuvimFont: "DM Sans",
      ketuvimSize: "12",
      bookTextColor: "#0C4A6E",
      bookTextFont: "DM Sans",
      bookTextSize: "12",
      chapterTextColor: "#0C4A6E",
      chapterTextFont: "DM Sans",
      chapterTextSize: "12",
      chapterColorBorder: "#BAE6FD",
      chapterColorFill: "#BAE6FD",
      // Bible arrangements - Traditional order
      pentateuchBorder: "#BAE6FD",
      pentateuchFill: "#0284C7",
      pentateuchFont: "DM Sans",
      pentateuchSize: "12",
      historicalBorder: "#BAE6FD",
      historicalFill: "#0EA5E9",
      historicalFont: "DM Sans",
      historicalSize: "12",
      poeticBorder: "#BAE6FD",
      poeticFill: "#38BDF8",
      poeticFont: "DM Sans",
      poeticSize: "12",
      propheticBorder: "#BAE6FD",
      propheticFill: "#075985",
      propheticFont: "DM Sans",
      propheticSize: "12",
    },
  },
  {
    name: "Warm Amber",
    colors: {
      firstToolbarbutton: "#dfdede",
      "filter-mode": "invert(0)",
      "secondary-filter-mode": "invert(100%)",
      // Main colors
      primaryColor: "#FFFFFF",
      secondaryColor: "#D97706",
      tertiaryColor: "#FEF3C7",
      // Container backgrounds
      themeSideMenu: "#FFFBEB",
      panelBackground: "#FEF3C7",
      // Tab
      tabSelection: "#D97706",
      activeTabBackground: "#FFFFFF",
      activeTabText: "#78350F",
      activeTabBorder: "#D97706",
      activeTabFill: "#D9770694",
      simpleTabText: "#6B7280",
      inactiveTabText: "#6B7280",
      // Buttons
      primaryButton: "#D97706",
      primaryButtonColor: "#FFFFFF",
      primaryButtonBorder: "#D97706",
      primaryButtonFill: "#D97706",
      secondaryButton: "#F59E0B",
      secondaryButtonColor: "#FFFFFF",
      secondaryButtonBorder: "#F59E0B",
      secondaryButtonFill: "#F59E0B",
      tertiaryButtonColor: "#78350F",
      buttonBorder: "#FDE68A",
      // Scripture text
      bookHeadingColor: "#78350F",
      chapterHeadingColor: "#78350F",
      verseNumberColor: "#D97706",
      verseTextColor: "#1F2937",
      pageBackground: "#FFFFFF",
      pageTextColor: "#1F2937",
      // Side menu
      heading1Color: "#78350F",
      heading2Color: "#78350F",
      heading3Color: "#92400E",
      descriptionTextColor: "#6B7280",
      menuTextColor: "#78350F",
      breadcrumbsColor: "#6B7280",
      sectionBackground: "#D97706",
      spaceNameColor: "#78350F",
      sideMenuIconsColor: "#78350F",
      selectedSpaceColor: "#D97706",
      unselectedSpaceColor: "#FDE68A",
      spaceNameText: "#78350F",
      addButtonBackground: "transparent",
      addButtonIcon: "#D97706",
      selectPanelIcon: "#78350F",
      openCloseMenuIcon: "#78350F",
      moreIcon: "#6B7280",
      settingsIcon: "#6B7280",
      inactiveSpaceIndicator: "#FDE68A",
      activeSpaceIndicator: "#D97706",
      profileAvatar: "#F59E0B",
      // Selection UI & toolbar
      toolbarBorder: "#FDE68A",
      toolbarFill: "#FFFFFF",
      toolbarIconsColor: "#78350F",
      selectionUIBorder: "#FDE68A",
      selectionUIFill: "#FFFFFF",
      selectionIconsColor: "#78350F",
      toolbarBackground: "#FFFFFF",
      iconColor: "#78350F",
      // Input fields
      inputTitleColor: "#78350F",
      inputPlaceholderColor: "#9CA3AF",
      inputActiveBorder: "#D97706",
      inputActiveFill: "#FFFFFF",
      inputInactiveBorder: "#FDE68A",
      inputInactiveFill: "#FFFFFF",
      inputBackground: "#FFFFFF",
      inputBorder: "#FDE68A",
      inputText: "#1F2937",
      inputPlaceholder: "#9CA3AF",
      // Branding
      logoColor: "#78350F",
      accentColor: "#D97706",
      // Space selection
      spaceSelection: "#D97706",
      // Text colors
      text1: "#78350F",
      text2: "#6B7280",
      showTabIcons: true,
      // Semantic colors
      primaryLight: "#FEF3C7",
      onPrimaryLight: "#92400E",
      primaryBase: "#D97706",
      onPrimaryBase: "#FFFFFF",
      primaryDark: "#92400E",
      onPrimaryDark: "#FFFFFF",
      secondaryLight: "#FFFBEB",
      onSecondaryLight: "#D97706",
      secondaryBase: "#F59E0B",
      onSecondaryBase: "#FFFFFF",
      secondaryDark: "#D97706",
      onSecondaryDark: "#FFFFFF",
      tertiaryLight: "#FDE68A",
      onTertiaryLight: "#78350F",
      tertiaryBase: "#FBBF24",
      onTertiaryBase: "#78350F",
      tertiaryDark: "#F59E0B",
      onTertiaryDark: "#FFFFFF",
      background: "#FFFFFF",
      onBackground: "#78350F",
      surface: "#FFFBEB",
      onSurface: "#1F2937",
      text3: "#374151",
      // Bible arrangements - TaNaK order
      torahBorder: "#FDE68A",
      torahFill: "#D97706",
      torahFont: "DM Sans",
      torahSize: "12",
      neviimBorder: "#FDE68A",
      neviimFill: "#F59E0B",
      neviimFont: "DM Sans",
      neviimSize: "12",
      ketuvimBorder: "#FDE68A",
      ketuvimFill: "#FBBF24",
      ketuvimFont: "DM Sans",
      ketuvimSize: "12",
      bookTextColor: "#78350F",
      bookTextFont: "DM Sans",
      bookTextSize: "12",
      chapterTextColor: "#78350F",
      chapterTextFont: "DM Sans",
      chapterTextSize: "12",
      chapterColorBorder: "#FDE68A",
      chapterColorFill: "#FDE68A",
      // Bible arrangements - Traditional order
      pentateuchBorder: "#FDE68A",
      pentateuchFill: "#D97706",
      pentateuchFont: "DM Sans",
      pentateuchSize: "12",
      historicalBorder: "#FDE68A",
      historicalFill: "#F59E0B",
      historicalFont: "DM Sans",
      historicalSize: "12",
      poeticBorder: "#FDE68A",
      poeticFill: "#FBBF24",
      poeticFont: "DM Sans",
      poeticSize: "12",
      propheticBorder: "#FDE68A",
      propheticFill: "#92400E",
      propheticFont: "DM Sans",
      propheticSize: "12",
    },
  },
];

const presetConfig =
  tags?.settingsConfigs?.presets?.[
    configBot?.tags?.settingsPreset || thisBot.tags.settingsPreset || "full"
  ];
const presetThemes: typeof defaultThemes =
  presetConfig?.availableThemes?.length > 0
    ? presetConfig.availableThemes
    : defaultThemes;

if (presetThemes.length === 0) {
  console.error(
    "No themes available in preset configuration. Falling back to default themes."
  );
}

export const defaultTheme = presetThemes[0]?.colors ?? builtinDefaultTheme;
export const READY_THEMES = presetThemes;

// ----------- DEBOUNCE (no CDN needed) -----------
function debounce(fn, delay = 250) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// ----------- CACHE -----------
const filterCache = new Map();

class Color {
  constructor(r, g, b) {
    this.set(r, g, b);
  }
  set(r, g, b) {
    this.r = this.clamp(r);
    this.g = this.clamp(g);
    this.b = this.clamp(b);
  }
  clamp(v) {
    return Math.max(0, Math.min(255, v));
  }
  multiply(m) {
    const r = this.r,
      g = this.g,
      b = this.b;
    this.r = this.clamp(r * m[0] + g * m[1] + b * m[2]);
    this.g = this.clamp(r * m[3] + g * m[4] + b * m[5]);
    this.b = this.clamp(r * m[6] + g * m[7] + b * m[8]);
  }
  invert(v = 1) {
    this.r = this.clamp((v + (this.r / 255) * (1 - 2 * v)) * 255);
    this.g = this.clamp((v + (this.g / 255) * (1 - 2 * v)) * 255);
    this.b = this.clamp((v + (this.b / 255) * (1 - 2 * v)) * 255);
  }
  sepia(v = 1) {
    this.multiply([
      0.393 + 0.607 * (1 - v),
      0.769 - 0.769 * (1 - v),
      0.189 - 0.189 * (1 - v),
      0.349 - 0.349 * (1 - v),
      0.686 + 0.314 * (1 - v),
      0.168 - 0.168 * (1 - v),
      0.272 - 0.272 * (1 - v),
      0.534 - 0.534 * (1 - v),
      0.131 + 0.869 * (1 - v),
    ]);
  }
  saturate(v = 1) {
    this.multiply([
      0.213 + 0.787 * v,
      0.715 - 0.715 * v,
      0.072 - 0.072 * v,
      0.213 - 0.213 * v,
      0.715 + 0.285 * v,
      0.072 - 0.072 * v,
      0.213 - 0.213 * v,
      0.715 - 0.715 * v,
      0.072 + 0.928 * v,
    ]);
  }
  hueRotate(angle = 0) {
    const rad = (angle * Math.PI) / 180,
      sin = Math.sin(rad),
      cos = Math.cos(rad);
    this.multiply([
      0.213 + cos * 0.787 - sin * 0.213,
      0.715 - cos * 0.715 - sin * 0.715,
      0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143,
      0.715 + cos * 0.285 + sin * 0.14,
      0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787,
      0.715 - cos * 0.715 + sin * 0.715,
      0.072 + cos * 0.928 + sin * 0.072,
    ]);
  }
  brightness(v = 1) {
    this.linear(v);
  }
  contrast(v = 1) {
    this.linear(v, -(0.5 * v) + 0.5);
  }
  linear(s = 1, i = 0) {
    this.r = this.clamp(this.r * s + i * 255);
    this.g = this.clamp(this.g * s + i * 255);
    this.b = this.clamp(this.b * s + i * 255);
  }
  hsl() {
    const r = this.r / 255,
      g = this.g / 255,
      b = this.b / 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h,
      s,
      l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return { h: h * 100, s: s * 100, l: l * 100 };
  }
}

// ======================
//   OPTIMIZED SOLVER ENGINE
// ======================
class Solver {
  constructor(target) {
    this.target = target;
    this.targetHSL = target.hsl();
    this.tmp = new Color(0, 0, 0);
  }

  solve() {
    const wide = this.solveWide();
    const narrow = this.solveNarrow(wide);
    return this.css(narrow.values);
  }

  // greatly reduced iteration count
  solveWide() {
    const A = 5,
      c = 15;
    const a = [60, 180, 18000, 600, 1.2, 1.2];
    const initial = [50, 20, 3750, 50, 100, 100];
    return this.spsa(A, a, c, initial, 30); // ← was 150
  }

  solveNarrow(wide) {
    const A = wide.loss,
      c = 2;
    const A1 = A + 1;
    const a = [0.25 * A1, 0.25 * A1, A1, 0.25 * A1, 0.2 * A1, 0.2 * A1];
    return this.spsa(A, a, c, wide.values, 15); // ← was 80
  }

  spsa(A, a, c, values, iters) {
    const alpha = 1,
      gamma = 0.166666;
    let best = values.slice(),
      bestLoss = Infinity;

    const t = this.tmp;

    for (let k = 0; k < iters; k++) {
      const ck = c / Math.pow(k + 1, gamma);
      const high = [],
        low = [],
        delta = [];

      for (let i = 0; i < 6; i++) {
        delta[i] = Math.random() > 0.5 ? 1 : -1;
        high[i] = values[i] + ck * delta[i];
        low[i] = values[i] - ck * delta[i];
      }

      const diff = this.loss(high) - this.loss(low);

      for (let i = 0; i < 6; i++) {
        const g = (diff / (2 * ck)) * delta[i];
        const ak = a[i] / Math.pow(A + k + 1, alpha);
        values[i] = this.fix(values[i] - ak * g, i);
      }

      const loss = this.loss(values);
      if (loss < bestLoss) {
        bestLoss = loss;
        best = values.slice();
      }
    }

    return { values: best, loss: bestLoss };
  }

  fix(v, idx) {
    const max = [100, 100, 7500, 100, 200, 200][idx];
    if (idx === 3) return ((v % max) + max) % max;
    return Math.max(0, Math.min(max, v));
  }

  loss(filters) {
    const c = this.tmp;
    c.set(0, 0, 0);
    c.invert(filters[0] / 100);
    c.sepia(filters[1] / 100);
    c.saturate(filters[2] / 100);
    c.hueRotate(filters[3] * 3.6);
    c.brightness(filters[4] / 100);
    c.contrast(filters[5] / 100);

    const hsl = c.hsl();
    return (
      Math.abs(c.r - this.target.r) +
      Math.abs(c.g - this.target.g) +
      Math.abs(c.b - this.target.b) +
      Math.abs(hsl.h - this.targetHSL.h) +
      Math.abs(hsl.s - this.targetHSL.s) +
      Math.abs(hsl.l - this.targetHSL.l)
    );
  }

  css(f) {
    return `invert(${Math.round(f[0])}%) sepia(${Math.round(f[1])}%)
            saturate(${Math.round(f[2])}%) hue-rotate(${Math.round(f[3] * 3.6)}deg)
            brightness(${Math.round(f[4])}%) contrast(${Math.round(f[5])}%);`;
  }
}

// ======================
//   HEX → FILTER FUNCTION
// ======================
function hexToColor(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((x) => x + x)
      .join("");

  const num = parseInt(hex, 16);
  return new Color((num >> 16) & 255, (num >> 8) & 255, num & 255);
}

function getColorFilterCached(hex) {
  if (filterCache.has(hex)) return filterCache.get(hex);

  const color = hexToColor(hex);
  const solver = new Solver(color);
  const css = solver.solve();

  filterCache.set(hex, css);
  return css;
}
const debouncedSolve = debounce((hex, callback) => {
  callback(getColorFilterCached(hex));
}, 250);

// ————————————————————————————————————————————————————————————
// Collapsible Section Component
// ————————————————————————————————————————————————————————————
const CollapsibleSection = ({ title, isExpanded, onToggle, children }) => {
  return (
    <div className="collapsible-section">
      <div
        className="collapsible-header"
        onClick={onToggle}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 0",
          cursor: "pointer",
          borderBottom: "1px solid #E1E3EA",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 14,
            fontWeight: 400,
            // color: "#000000"
            color: "var(--heading1Color)",
          }}
        >
          {title}
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="#666666"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {isExpanded && (
        <div
          className="collapsible-content"
          style={{
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Main Color Picker with Label
// ————————————————————————————————————————————————————————————
const MainColorPicker = ({ label, sublabel, color, onChange }) => {
  const inputRef = useRef(null);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 56,
          height: 56,
          borderRadius: 8,
          backgroundColor: color,
          cursor: "pointer",
          position: "relative",
          border: "2px solid #E1E3EA",
        }}
      >
        <input
          ref={inputRef}
          type="color"
          value={color}
          onChange={onChange}
          style={{
            opacity: 0,
            position: "absolute",
            inset: 0,
            cursor: "pointer",
          }}
        />
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 10,
            color: "#666666",
          }}
        >
          {color?.toUpperCase()}
        </div>
        <div
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 11,
            color: "#999999",
          }}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Compact Color Row for sections
// ————————————————————————————————————————————————————————————
const CompactColorRow = ({ label, value, onChange }) => {
  const inputRef = useRef(null);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span
        style={{
          fontFamily: "Open Sans, sans-serif",
          fontSize: 13,

          color: "var(--heading2Color)",
        }}
      >
        {label}
      </span>
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          width: 24,
          height: 24,
          borderRadius: 4,
          backgroundColor: value || "#CCCCCC",
          cursor: "pointer",
          position: "relative",
          border: "1px solid #E1E3EA",
        }}
      >
        <input
          ref={inputRef}
          type="color"
          value={value || "#CCCCCC"}
          onChange={onChange}
          style={{
            opacity: 0,
            position: "absolute",
            inset: 0,
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Small Color Picker (for inline use)
// ————————————————————————————————————————————————————————————
const SmallColorPicker = ({ value, onChange }) => {
  const inputRef = useRef(null);
  return (
    <div
      onClick={() => inputRef.current?.click()}
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: value || "#CCCCCC",
        cursor: "pointer",
        position: "relative",
        border: "1px solid #E1E3EA",
      }}
    >
      <input
        ref={inputRef}
        type="color"
        value={value || "#CCCCCC"}
        onChange={onChange}
        style={{
          opacity: 0,
          position: "absolute",
          inset: 0,
          cursor: "pointer",
        }}
      />
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Font Options for dropdowns
// ————————————————————————————————————————————————————————————
const TAB_FONT_OPTIONS = [
  { name: "Newsreader", value: "Newsreader, serif" },
  { name: "DM Sans", value: "DM Sans, sans-serif" },
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans, sans-serif" },
  { name: "Satoshi", value: "Satoshi, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
];

const TAB_FONT_SIZES = ["10", "11", "12", "13", "14", "16", "18"];

// ————————————————————————————————————————————————————————————
// Tab Section Content Component
// ————————————————————————————————————————————————————————————
const TabSectionContent = ({
  colors,
  onColorChange,
  tabSettings,
  onTabSettingsChange,
  showTabIcons,
  onToggleTabIcons,
  t,
}) => {
  const [activeTabFontOpen, setActiveTabFontOpen] = useState(false);
  const [activeTabSizeOpen, setActiveTabSizeOpen] = useState(false);
  const [inactiveTabFontOpen, setInactiveTabFontOpen] = useState(false);
  const [inactiveTabSizeOpen, setInactiveTabSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "var(--panelBackground) !important",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "var(--panelBackground) !important",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 13,
              color: "var(--heading2Color)",
            }}
          >
            {t("activeTabContainer")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("border")}
            </span>
            <SmallColorPicker
              value={colors.activeTabBorder || "#C4B5FD"}
              onChange={(e) => onColorChange("activeTabBorder", e.target.value)}
            />
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("fill")}
            </span>
            <SmallColorPicker
              value={colors.activeTabFill || "var(--spaceSelection)"}
              onChange={(e) => onColorChange("activeTabFill", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("activeTabText")}
        </span>
        <SmallColorPicker
          value={colors.activeTabText || "#333333"}
          onChange={(e) => onColorChange("activeTabText", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setActiveTabFontOpen(!activeTabFontOpen)}
          >
            <span>{tabSettings.activeTabFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {activeTabFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      tabSettings.activeTabFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onTabSettingsChange("activeTabFont", font.name);
                    setActiveTabFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setActiveTabSizeOpen(!activeTabSizeOpen)}
          >
            <span>{tabSettings.activeTabSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {activeTabSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      tabSettings.activeTabSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onTabSettingsChange("activeTabSize", size);
                    setActiveTabSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("inactiveTabText")}
        </span>
        <SmallColorPicker
          value={colors.inactiveTabText || "#999999"}
          onChange={(e) => onColorChange("inactiveTabText", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setInactiveTabFontOpen(!inactiveTabFontOpen)}
          >
            <span>{tabSettings.inactiveTabFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {inactiveTabFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      tabSettings.inactiveTabFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onTabSettingsChange("inactiveTabFont", font.name);
                    setInactiveTabFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setInactiveTabSizeOpen(!inactiveTabSizeOpen)}
          >
            <span>{tabSettings.inactiveTabSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {inactiveTabSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      tabSettings.inactiveTabSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onTabSettingsChange("inactiveTabSize", size);
                    setInactiveTabSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("showTabIcon")}
        </span>
        <div
          onClick={onToggleTabIcons}
          style={{
            width: 18,
            height: 18,
            border: "1px solid #E1E3EA",
            borderRadius: 2,
            backgroundColor: showTabIcons ? "#FFFFFF" : "#FFFFFF",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showTabIcons && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="#333333"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Disabled/Empty Color Picker (shows diagonal lines)
// ————————————————————————————————————————————————————————————
const DisabledColorPicker = () => {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        backgroundColor: "#FFFFFF",
        border: "1px solid #E1E3EA",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <line x1="0" y1="24" x2="24" y2="0" stroke="#E1E3EA" strokeWidth="1" />
        <line x1="0" y1="12" x2="12" y2="0" stroke="#E1E3EA" strokeWidth="1" />
        <line
          x1="12"
          y1="24"
          x2="24"
          y2="12"
          stroke="#E1E3EA"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Buttons Section Content Component
// ————————————————————————————————————————————————————————————
const ButtonsSectionContent = ({
  colors,
  onColorChange,
  buttonSettings,
  onButtonSettingsChange,
  t,
}) => {
  const [primaryFontOpen, setPrimaryFontOpen] = useState(false);
  const [primarySizeOpen, setPrimarySizeOpen] = useState(false);
  const [secondaryFontOpen, setSecondaryFontOpen] = useState(false);
  const [secondarySizeOpen, setSecondarySizeOpen] = useState(false);
  const [tertiaryFontOpen, setTertiaryFontOpen] = useState(false);
  const [tertiarySizeOpen, setTertiarySizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 13,
              color: "var(--heading2Color)",
            }}
          >
            {t("primaryButton")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("border")}
            </span>
            <SmallColorPicker
              value={colors.primaryButtonBorder || "#C4B5FD"}
              onChange={(e) =>
                onColorChange("primaryButtonBorder", e.target.value)
              }
            />
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("fill")}
            </span>
            <SmallColorPicker
              value={colors.primaryButtonFill || "var(--spaceSelection)"}
              onChange={(e) =>
                onColorChange("primaryButtonFill", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("primaryButtonText")}
        </span>
        <SmallColorPicker
          value={colors.primaryButtonColor || "#333333"}
          onChange={(e) => onColorChange("primaryButtonColor", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setPrimaryFontOpen(!primaryFontOpen)}
          >
            <span>{buttonSettings.primaryFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {primaryFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.primaryFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("primaryFont", font.name);
                    setPrimaryFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setPrimarySizeOpen(!primarySizeOpen)}
          >
            <span>{buttonSettings.primarySize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {primarySizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.primarySize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("primarySize", size);
                    setPrimarySizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 13,
              color: "var(--heading2Color)",
            }}
          >
            {t("secondaryButton")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("border")}
            </span>
            <SmallColorPicker
              value={colors.secondaryButtonBorder || "#C4B5FD"}
              onChange={(e) =>
                onColorChange("secondaryButtonBorder", e.target.value)
              }
            />
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("fill")}
            </span>
            <SmallColorPicker
              value={colors.secondaryButtonFill || "var(--spaceSelection)"}
              onChange={(e) =>
                onColorChange("secondaryButtonFill", e.target.value)
              }
            />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("secondaryButtonText")}
        </span>
        <SmallColorPicker
          value={colors.secondaryButtonColor || "#333333"}
          onChange={(e) =>
            onColorChange("secondaryButtonColor", e.target.value)
          }
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setSecondaryFontOpen(!secondaryFontOpen)}
          >
            <span>{buttonSettings.secondaryFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {secondaryFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.secondaryFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("secondaryFont", font.name);
                    setSecondaryFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setSecondarySizeOpen(!secondarySizeOpen)}
          >
            <span>{buttonSettings.secondarySize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {secondarySizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.secondarySize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("secondarySize", size);
                    setSecondarySizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 13,
              color: "var(--heading2Color)",
            }}
          >
            {t("tertiaryButton")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("border")}
            </span>
            <DisabledColorPicker />
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              {t("fill")}
            </span>
            <DisabledColorPicker />
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("secondaryButtonText")}
        </span>
        <SmallColorPicker
          value={colors.tertiaryButtonColor || "#333333"}
          onChange={(e) => onColorChange("tertiaryButtonColor", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setTertiaryFontOpen(!tertiaryFontOpen)}
          >
            <span>{buttonSettings.tertiaryFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {tertiaryFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.tertiaryFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("tertiaryFont", font.name);
                    setTertiaryFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setTertiarySizeOpen(!tertiarySizeOpen)}
          >
            <span>{buttonSettings.tertiarySize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {tertiarySizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      buttonSettings.tertiarySize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onButtonSettingsChange("tertiarySize", size);
                    setTertiarySizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Scripture Text Section Content Component
// ————————————————————————————————————————————————————————————
const ScriptureTextSectionContent = ({
  colors,
  onColorChange,
  scriptureSettings,
  onScriptureSettingsChange,
  showVerseNumbers,
  onToggleVerseNumbers,
  t,
}) => {
  const [bookHeadingFontOpen, setBookHeadingFontOpen] = useState(false);
  const [bookHeadingSizeOpen, setBookHeadingSizeOpen] = useState(false);
  const [chapterHeadingFontOpen, setChapterHeadingFontOpen] = useState(false);
  const [chapterHeadingSizeOpen, setChapterHeadingSizeOpen] = useState(false);
  const [verseTextFontOpen, setVerseTextFontOpen] = useState(false);
  const [verseTextSizeOpen, setVerseTextSizeOpen] = useState(false);
  const [verseNumberFontOpen, setVerseNumberFontOpen] = useState(false);
  const [verseNumberSizeOpen, setVerseNumberSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("bookHeading")}
        </span>
        <SmallColorPicker
          value={colors.bookHeadingColor || "#333333"}
          onChange={(e) => onColorChange("bookHeadingColor", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setBookHeadingFontOpen(!bookHeadingFontOpen)}
          >
            <span>{scriptureSettings.bookHeadingFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {bookHeadingFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.bookHeadingFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("bookHeadingFont", font.name);
                    setBookHeadingFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setBookHeadingSizeOpen(!bookHeadingSizeOpen)}
          >
            <span>{scriptureSettings.bookHeadingSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {bookHeadingSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.bookHeadingSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("bookHeadingSize", size);
                    setBookHeadingSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("chapterHeading")}
        </span>
        <SmallColorPicker
          value={colors.chapterHeadingColor || "#333333"}
          onChange={(e) => onColorChange("chapterHeadingColor", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setChapterHeadingFontOpen(!chapterHeadingFontOpen)}
          >
            <span>{scriptureSettings.chapterHeadingFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {chapterHeadingFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.chapterHeadingFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("chapterHeadingFont", font.name);
                    setChapterHeadingFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setChapterHeadingSizeOpen(!chapterHeadingSizeOpen)}
          >
            <span>{scriptureSettings.chapterHeadingSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {chapterHeadingSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.chapterHeadingSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("chapterHeadingSize", size);
                    setChapterHeadingSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("verseText")}
        </span>
        <SmallColorPicker
          value={colors.verseTextColor || "#333333"}
          onChange={(e) => onColorChange("verseTextColor", e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setVerseTextFontOpen(!verseTextFontOpen)}
          >
            <span>{scriptureSettings.verseTextFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {verseTextFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.verseTextFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("verseTextFont", font.name);
                    setVerseTextFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setVerseTextSizeOpen(!verseTextSizeOpen)}
          >
            <span>{scriptureSettings.verseTextSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {verseTextSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.verseTextSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("verseTextSize", size);
                    setVerseTextSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("verseNumber")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            onClick={onToggleVerseNumbers}
            style={{
              width: 36,
              height: 20,
              backgroundColor: showVerseNumbers
                ? "var(--spaceSelection)"
                : "#CCCCCC",
              borderRadius: 10,
              cursor: "pointer",
              position: "relative",
              transition: "background-color 0.3s ease",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: "50%",
                position: "absolute",
                top: 2,
                left: showVerseNumbers ? 18 : 2,
                transition: "left 0.3s ease",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
              }}
            />
          </div>
          <SmallColorPicker
            value={colors.verseNumberColor || "#333333"}
            onChange={(e) => onColorChange("verseNumberColor", e.target.value)}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setVerseNumberFontOpen(!verseNumberFontOpen)}
          >
            <span>{scriptureSettings.verseNumberFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {verseNumberFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.verseNumberFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("verseNumberFont", font.name);
                    setVerseNumberFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setVerseNumberSizeOpen(!verseNumberSizeOpen)}
          >
            <span>{scriptureSettings.verseNumberSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {verseNumberSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      scriptureSettings.verseNumberSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onScriptureSettingsChange("verseNumberSize", size);
                    setVerseNumberSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Side Menu Section Content
// ————————————————————————————————————————————————————————————
const SideMenuSectionContent = ({
  colors,
  onColorChange,
  sideMenuSettings,
  onSideMenuSettingsChange,
  profileAvatarMode,
  onToggleProfileAvatarMode,
  t,
}) => {
  // Dropdown states for each row
  const [heading1FontOpen, setHeading1FontOpen] = useState(false);
  const [heading1SizeOpen, setHeading1SizeOpen] = useState(false);
  const [heading2FontOpen, setHeading2FontOpen] = useState(false);
  const [heading2SizeOpen, setHeading2SizeOpen] = useState(false);
  const [heading3FontOpen, setHeading3FontOpen] = useState(false);
  const [heading3SizeOpen, setHeading3SizeOpen] = useState(false);
  const [descriptionFontOpen, setDescriptionFontOpen] = useState(false);
  const [descriptionSizeOpen, setDescriptionSizeOpen] = useState(false);
  const [menuTextFontOpen, setMenuTextFontOpen] = useState(false);
  const [menuTextSizeOpen, setMenuTextSizeOpen] = useState(false);
  const [breadcrumbsFontOpen, setBreadcrumbsFontOpen] = useState(false);
  const [breadcrumbsSizeOpen, setBreadcrumbsSizeOpen] = useState(false);
  const [spaceNameFontOpen, setSpaceNameFontOpen] = useState(false);
  const [spaceNameSizeOpen, setSpaceNameSizeOpen] = useState(false);
  const [iconsSizeOpen, setIconsSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  // Reusable row with font dropdown, size dropdown, and color picker
  const renderRowWithDropdowns = (
    label,
    colorField,
    fontField,
    sizeField,
    fontOpen,
    setFontOpen,
    sizeOpen,
    setSizeOpen
  ) => (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {label}
        </span>
        <SmallColorPicker
          value={colors[colorField] || "#333333"}
          onChange={(e) => onColorChange(colorField, e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setFontOpen(!fontOpen)}>
            <span>{sideMenuSettings[fontField] || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {fontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      sideMenuSettings[fontField] === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onSideMenuSettingsChange(fontField, font.name);
                    setFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setSizeOpen(!sizeOpen)}>
            <span>{sideMenuSettings[sizeField] || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {sizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      sideMenuSettings[sizeField] === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onSideMenuSettingsChange(sizeField, size);
                    setSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {renderRowWithDropdowns(
        t("heading1"),
        "heading1Color",
        "heading1Font",
        "heading1Size",
        heading1FontOpen,
        setHeading1FontOpen,
        heading1SizeOpen,
        setHeading1SizeOpen
      )}

      {renderRowWithDropdowns(
        t("heading2"),
        "heading2Color",
        "heading2Font",
        "heading2Size",
        heading2FontOpen,
        setHeading2FontOpen,
        heading2SizeOpen,
        setHeading2SizeOpen
      )}

      {renderRowWithDropdowns(
        t("heading3"),
        "heading3Color",
        "heading3Font",
        "heading3Size",
        heading3FontOpen,
        setHeading3FontOpen,
        heading3SizeOpen,
        setHeading3SizeOpen
      )}

      {renderRowWithDropdowns(
        t("descriptionText"),
        "descriptionTextColor",
        "descriptionTextFont",
        "descriptionTextSize",
        descriptionFontOpen,
        setDescriptionFontOpen,
        descriptionSizeOpen,
        setDescriptionSizeOpen
      )}

      {renderRowWithDropdowns(
        t("menuText"),
        "menuTextColor",
        "menuTextFont",
        "menuTextSize",
        menuTextFontOpen,
        setMenuTextFontOpen,
        menuTextSizeOpen,
        setMenuTextSizeOpen
      )}

      {renderRowWithDropdowns(
        t("breadcrumbs"),
        "breadcrumbsColor",
        "breadcrumbsFont",
        "breadcrumbsSize",
        breadcrumbsFontOpen,
        setBreadcrumbsFontOpen,
        breadcrumbsSizeOpen,
        setBreadcrumbsSizeOpen
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("sectionBackground")}
        </span>
        <SmallColorPicker
          value={colors.sectionBackground || "#E65100"}
          onChange={(e) => onColorChange("sectionBackground", e.target.value)}
        />
      </div>

      {renderRowWithDropdowns(
        t("spaceName"),
        "spaceNameColor",
        "spaceNameFont",
        "spaceNameSize",
        spaceNameFontOpen,
        setSpaceNameFontOpen,
        spaceNameSizeOpen,
        setSpaceNameSizeOpen
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("icons")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 12,
              color: "#666666",
            }}
          >
            Size:
          </span>
          <div style={{ width: 60, position: "relative" }}>
            <div
              style={dropdownStyle}
              onClick={() => setIconsSizeOpen(!iconsSizeOpen)}
            >
              <span>{sideMenuSettings.iconsSize || "12"}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {iconsSizeOpen && (
              <div style={dropdownMenuStyle}>
                {TAB_FONT_SIZES.map((size) => (
                  <div
                    key={size}
                    style={{
                      ...dropdownItemStyle,
                      backgroundColor:
                        sideMenuSettings.iconsSize === size
                          ? "#F5F5F5"
                          : "#FFFFFF",
                    }}
                    onClick={() => {
                      onSideMenuSettingsChange("iconsSize", size);
                      setIconsSizeOpen(false);
                    }}
                  >
                    {size}
                  </div>
                ))}
              </div>
            )}
          </div>
          <SmallColorPicker
            value={colors.sideMenuIconsColor || "#333333"}
            onChange={(e) =>
              onColorChange("sideMenuIconsColor", e.target.value)
            }
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("selectedSpace")}
        </span>
        <SmallColorPicker
          value={colors.selectedSpaceColor || "#E65100"}
          onChange={(e) => onColorChange("selectedSpaceColor", e.target.value)}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("unselectedSpace")}
        </span>
        <SmallColorPicker
          value={colors.unselectedSpaceColor || "#CCCCCC"}
          onChange={(e) =>
            onColorChange("unselectedSpaceColor", e.target.value)
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("addButtonBackground")}
        </span>
        <SmallColorPicker
          value={colors.addButtonBackground || "#3B82F6"}
          onChange={(e) => onColorChange("addButtonBackground", e.target.value)}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("addButtonIcon")}
        </span>
        <SmallColorPicker
          value={colors.addButtonIcon || "#FFFFFF"}
          onChange={(e) => onColorChange("addButtonIcon", e.target.value)}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("profileAvatar")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 12,
              color: profileAvatarMode === "picture" ? "#333333" : "#999999",
            }}
          >
            Picture
          </span>
          <div
            onClick={onToggleProfileAvatarMode}
            style={{
              width: 36,
              height: 20,
              backgroundColor:
                profileAvatarMode === "icon"
                  ? "var(--spaceSelection)"
                  : "#CCCCCC",
              borderRadius: 10,
              cursor: "pointer",
              position: "relative",
              transition: "background-color 0.3s ease",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: "50%",
                position: "absolute",
                top: 2,
                left: profileAvatarMode === "icon" ? 18 : 2,
                transition: "left 0.3s ease",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 12,
              color: profileAvatarMode === "icon" ? "#333333" : "#999999",
            }}
          >
            Icon
          </span>
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Selection UI & Toolbar Section Content
// ————————————————————————————————————————————————————————————
const SelectionUIToolbarSectionContent = ({
  colors,
  onColorChange,
  selectionUISettings,
  onSelectionUISettingsChange,
  t,
}) => {
  const [toolbarIconsSizeOpen, setToolbarIconsSizeOpen] = useState(false);
  const [selectionIconsSizeOpen, setSelectionIconsSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar with Border/Fill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("toolbar")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Border
            </span>
            <SmallColorPicker
              value={colors.toolbarBorder || "#E1E3EA"}
              onChange={(e) => onColorChange("toolbarBorder", e.target.value)}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Fill
            </span>
            <SmallColorPicker
              value={colors.toolbarFill || "#FFFFFF"}
              onChange={(e) => onColorChange("toolbarFill", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Toolbar Icons - Size dropdown + color picker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("toolbarIcons")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 12,
              color: "#666666",
            }}
          >
            Size:
          </span>
          <div style={{ width: 60, position: "relative" }}>
            <div
              style={dropdownStyle}
              onClick={() => setToolbarIconsSizeOpen(!toolbarIconsSizeOpen)}
            >
              <span>{selectionUISettings.toolbarIconsSize || "12"}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {toolbarIconsSizeOpen && (
              <div style={dropdownMenuStyle}>
                {TAB_FONT_SIZES.map((size) => (
                  <div
                    key={size}
                    style={{
                      ...dropdownItemStyle,
                      backgroundColor:
                        selectionUISettings.toolbarIconsSize === size
                          ? "#F5F5F5"
                          : "#FFFFFF",
                    }}
                    onClick={() => {
                      onSelectionUISettingsChange("toolbarIconsSize", size);
                      setToolbarIconsSizeOpen(false);
                    }}
                  >
                    {size}
                  </div>
                ))}
              </div>
            )}
          </div>
          <SmallColorPicker
            value={colors.toolbarIconsColor || "#333333"}
            onChange={(e) => onColorChange("toolbarIconsColor", e.target.value)}
          />
        </div>
      </div>

      {/* Selection UI with Border/Fill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("selectionUI")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Border
            </span>
            <SmallColorPicker
              value={colors.selectionUIBorder || "#E1E3EA"}
              onChange={(e) =>
                onColorChange("selectionUIBorder", e.target.value)
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Fill
            </span>
            <SmallColorPicker
              value={colors.selectionUIFill || "#FFFFFF"}
              onChange={(e) => onColorChange("selectionUIFill", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Selection Icons - Size dropdown + color picker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("selectionIcons")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 12,
              color: "#666666",
            }}
          >
            Size:
          </span>
          <div style={{ width: 60, position: "relative" }}>
            <div
              style={dropdownStyle}
              onClick={() => setSelectionIconsSizeOpen(!selectionIconsSizeOpen)}
            >
              <span>{selectionUISettings.selectionIconsSize || "12"}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="#666666"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            {selectionIconsSizeOpen && (
              <div style={dropdownMenuStyle}>
                {TAB_FONT_SIZES.map((size) => (
                  <div
                    key={size}
                    style={{
                      ...dropdownItemStyle,
                      backgroundColor:
                        selectionUISettings.selectionIconsSize === size
                          ? "#F5F5F5"
                          : "#FFFFFF",
                    }}
                    onClick={() => {
                      onSelectionUISettingsChange("selectionIconsSize", size);
                      setSelectionIconsSizeOpen(false);
                    }}
                  >
                    {size}
                  </div>
                ))}
              </div>
            )}
          </div>
          <SmallColorPicker
            value={colors.selectionIconsColor || "#333333"}
            onChange={(e) =>
              onColorChange("selectionIconsColor", e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Input Fields Section Content
// ————————————————————————————————————————————————————————————
const InputFieldsSectionContent = ({
  colors,
  onColorChange,
  inputFieldsSettings,
  onInputFieldsSettingsChange,
  t,
}) => {
  const [titleFontOpen, setTitleFontOpen] = useState(false);
  const [titleSizeOpen, setTitleSizeOpen] = useState(false);
  const [placeholderFontOpen, setPlaceholderFontOpen] = useState(false);
  const [placeholderSizeOpen, setPlaceholderSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Title with color picker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("title")}
        </span>
        <SmallColorPicker
          value={colors.inputTitleColor || "#333333"}
          onChange={(e) => onColorChange("inputTitleColor", e.target.value)}
        />
      </div>

      {/* Title font and size dropdowns */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setTitleFontOpen(!titleFontOpen)}
          >
            <span>{inputFieldsSettings.titleFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {titleFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      inputFieldsSettings.titleFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onInputFieldsSettingsChange("titleFont", font.name);
                    setTitleFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setTitleSizeOpen(!titleSizeOpen)}
          >
            <span>{inputFieldsSettings.titleSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {titleSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      inputFieldsSettings.titleSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onInputFieldsSettingsChange("titleSize", size);
                    setTitleSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder with color picker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("placeholder")}
        </span>
        <SmallColorPicker
          value={colors.inputPlaceholderColor || "#333333"}
          onChange={(e) =>
            onColorChange("inputPlaceholderColor", e.target.value)
          }
        />
      </div>

      {/* Placeholder font and size dropdowns */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setPlaceholderFontOpen(!placeholderFontOpen)}
          >
            <span>{inputFieldsSettings.placeholderFont || "Newsreader"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {placeholderFontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      inputFieldsSettings.placeholderFont === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onInputFieldsSettingsChange("placeholderFont", font.name);
                    setPlaceholderFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setPlaceholderSizeOpen(!placeholderSizeOpen)}
          >
            <span>{inputFieldsSettings.placeholderSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {placeholderSizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      inputFieldsSettings.placeholderSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onInputFieldsSettingsChange("placeholderSize", size);
                    setPlaceholderSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active state with Border/Fill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("activeState")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Border
            </span>
            <SmallColorPicker
              value={colors.inputActiveBorder || "#E1E3EA"}
              onChange={(e) =>
                onColorChange("inputActiveBorder", e.target.value)
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Fill
            </span>
            <SmallColorPicker
              value={colors.inputActiveFill || "#FFFFFF"}
              onChange={(e) => onColorChange("inputActiveFill", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Inactive state with Border/Fill */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("inactiveState")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Border
            </span>
            <SmallColorPicker
              value={colors.inputInactiveBorder || "#E1E3EA"}
              onChange={(e) =>
                onColorChange("inputInactiveBorder", e.target.value)
              }
            />
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 10,
                color: "#999999",
              }}
            >
              Fill
            </span>
            <SmallColorPicker
              value={colors.inputInactiveFill || "#FFFFFF"}
              onChange={(e) =>
                onColorChange("inputInactiveFill", e.target.value)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Branding Section Content
// ————————————————————————————————————————————————————————————
const BrandingSectionContent = ({
  brandingSettings,
  onBrandingSettingsChange,
  t,
}) => {
  const [companySizeOpen, setCompanySizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    // color: "var(--heading2Color)",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "var(--panelBackground)",
  };

  const inputStyle = {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    color: "var(--heading2Color)",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Company name with toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("companyName")}
        </span>
        <div
          onClick={() =>
            onBrandingSettingsChange(
              "showCompanyName",
              !brandingSettings.showCompanyName
            )
          }
          style={{
            width: 36,
            height: 20,
            backgroundColor: brandingSettings.showCompanyName
              ? "var(--spaceSelection)"
              : "#CCCCCC",
            borderRadius: 10,
            cursor: "pointer",
            position: "relative",
            transition: "background-color 0.3s ease",
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              backgroundColor: "#FFFFFF",
              borderRadius: "50%",
              position: "absolute",
              top: 2,
              left: brandingSettings.showCompanyName ? 18 : 2,
              transition: "left 0.3s ease",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
            }}
          />
        </div>
      </div>

      {/* Company name input and size dropdown */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={brandingSettings.companyName || "AO Lab"}
          onChange={(e) =>
            onBrandingSettingsChange("companyName", e.target.value)
          }
          style={inputStyle}
          placeholder="Company name"
        />
        <div style={{ width: 70, position: "relative" }}>
          <div
            style={dropdownStyle}
            onClick={() => setCompanySizeOpen(!companySizeOpen)}
          >
            <span>{brandingSettings.companyNameSize || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {companySizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      brandingSettings.companyNameSize === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onBrandingSettingsChange("companyNameSize", size);
                    setCompanySizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logo with preview button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {t("logo")}
        </span>
        <div
          onClick={() => onBrandingSettingsChange("selectLogo", true)}
          style={{
            width: 48,
            height: 32,
            border: "1px solid #E1E3EA",
            borderRadius: 4,
            backgroundColor: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            overflow: "hidden",
          }}
        >
          {brandingSettings.logoUrl ? (
            <img
              src={brandingSettings.logoUrl}
              alt="Logo"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
              <rect x="0" y="2" width="8" height="12" rx="1" fill="#333333" />
              <rect x="10" y="2" width="4" height="12" rx="1" fill="#333333" />
              <rect x="16" y="2" width="4" height="12" rx="1" fill="#333333" />
              <rect x="22" y="2" width="8" height="12" rx="1" fill="#333333" />
              <text x="2" y="11" fontSize="6" fill="#FFFFFF" fontFamily="Arial">
                SEED
              </text>
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Bible Arrangements Section Content
// ————————————————————————————————————————————————————————————
const BibleArrangementsSectionContent = ({
  colors,
  onColorChange,
  bibleArrangementSettings,
  onBibleArrangementSettingsChange,
  expandedSections,
  onToggleSection,
  t,
}) => {
  // Dropdown open states for TaNaK order
  const [torahFontOpen, setTorahFontOpen] = useState(false);
  const [torahSizeOpen, setTorahSizeOpen] = useState(false);
  const [neviimFontOpen, setNeviimFontOpen] = useState(false);
  const [neviimSizeOpen, setNeviimSizeOpen] = useState(false);
  const [ketuvimFontOpen, setKetuvimFontOpen] = useState(false);
  const [ketuvimSizeOpen, setKetuvimSizeOpen] = useState(false);
  const [bookTextFontOpen, setBookTextFontOpen] = useState(false);
  const [bookTextSizeOpen, setBookTextSizeOpen] = useState(false);
  const [chapterTextFontOpen, setChapterTextFontOpen] = useState(false);
  const [chapterTextSizeOpen, setChapterTextSizeOpen] = useState(false);
  // Dropdown open states for Traditional order
  const [pentateuchFontOpen, setPentateuchFontOpen] = useState(false);
  const [pentateuchSizeOpen, setPentateuchSizeOpen] = useState(false);
  const [historicalFontOpen, setHistoricalFontOpen] = useState(false);
  const [historicalSizeOpen, setHistoricalSizeOpen] = useState(false);
  const [poeticFontOpen, setPoeticFontOpen] = useState(false);
  const [poeticSizeOpen, setPoeticSizeOpen] = useState(false);
  const [propheticFontOpen, setPropheticFontOpen] = useState(false);
  const [propheticSizeOpen, setPropheticSizeOpen] = useState(false);

  const dropdownStyle = {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
  };

  const dropdownMenuStyle = {
    position: "absolute" as const,
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    border: "1px solid #E1E3EA",
    borderRadius: 4,
    marginTop: 4,
    zIndex: 100,
    maxHeight: 150,
    overflowY: "auto" as const,
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  };

  const dropdownItemStyle = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "Open Sans, sans-serif",
    borderBottom: "1px solid #F0F0F0",
    color: "#333333",
  };

  const subSectionHeaderStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    cursor: "pointer",
    borderBottom: "1px solid #E1E3EA",
  };

  const renderCategoryRow = (
    label: string,
    borderField: string,
    fillField: string,
    fontField: string,
    sizeField: string,
    fontOpen: boolean,
    setFontOpen: (v: boolean) => void,
    sizeOpen: boolean,
    setSizeOpen: (v: boolean) => void
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 10,
              color: "#999999",
            }}
          >
            {t("border")}
          </span>
          <SmallColorPicker
            value={colors[borderField] || "#E1E3EA"}
            onChange={(e) => onColorChange(borderField, e.target.value)}
          />
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 10,
              color: "#999999",
            }}
          >
            {t("fill")}
          </span>
          <SmallColorPicker
            value={colors[fillField] || "#E07B4C"}
            onChange={(e) => onColorChange(fillField, e.target.value)}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setFontOpen(!fontOpen)}>
            <span>{bibleArrangementSettings[fontField] || "DM Sans"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {fontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      bibleArrangementSettings[fontField] === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onBibleArrangementSettingsChange(fontField, font.name);
                    setFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setSizeOpen(!sizeOpen)}>
            <span>{bibleArrangementSettings[sizeField] || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {sizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      bibleArrangementSettings[sizeField] === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onBibleArrangementSettingsChange(sizeField, size);
                    setSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTextRow = (
    label: string,
    colorField: string,
    fontField: string,
    sizeField: string,
    fontOpen: boolean,
    setFontOpen: (v: boolean) => void,
    sizeOpen: boolean,
    setSizeOpen: (v: boolean) => void
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {label}
        </span>
        <SmallColorPicker
          value={colors[colorField] || "#4A4A4A"}
          onChange={(e) => onColorChange(colorField, e.target.value)}
        />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setFontOpen(!fontOpen)}>
            <span>{bibleArrangementSettings[fontField] || "DM Sans"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {fontOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_OPTIONS.map((font) => (
                <div
                  key={font.value}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      bibleArrangementSettings[fontField] === font.name
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onBibleArrangementSettingsChange(fontField, font.name);
                    setFontOpen(false);
                  }}
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ width: 70, position: "relative" }}>
          <div style={dropdownStyle} onClick={() => setSizeOpen(!sizeOpen)}>
            <span>{bibleArrangementSettings[sizeField] || "12"}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="#666666"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          {sizeOpen && (
            <div style={dropdownMenuStyle}>
              {TAB_FONT_SIZES.map((size) => (
                <div
                  key={size}
                  style={{
                    ...dropdownItemStyle,
                    backgroundColor:
                      bibleArrangementSettings[sizeField] === size
                        ? "#F5F5F5"
                        : "#FFFFFF",
                  }}
                  onClick={() => {
                    onBibleArrangementSettingsChange(sizeField, size);
                    setSizeOpen(false);
                  }}
                >
                  {size}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderChapterColorRow = (
    label: string,
    borderField: string,
    fillField: string
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontFamily: "Open Sans, sans-serif",
            fontSize: 13,
            color: "var(--heading2Color)",
          }}
        >
          {label}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 10,
              color: "#999999",
            }}
          >
            {t("border")}
          </span>
          <SmallColorPicker
            value={colors[borderField] || "#E1E3EA"}
            onChange={(e) => onColorChange(borderField, e.target.value)}
          />
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 10,
              color: "#999999",
            }}
          >
            {t("fill")}
          </span>
          <SmallColorPicker
            value={colors[fillField] || "#E1E3EA"}
            onChange={(e) => onColorChange(fillField, e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* TaNaK Order Subsection */}
      <div>
        <div
          style={subSectionHeaderStyle}
          onClick={() => onToggleSection("tanakOrder")}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 14,
              fontWeight: 400,
              color: "var(--heading1Color)",
            }}
          >
            {t("tanakOrder") || "TaNaK order"}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: expandedSections.tanakOrder
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="#666666"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {expandedSections.tanakOrder && (
          <div style={{ padding: "16px 0" }}>
            {renderCategoryRow(
              t("lawTorah") || "Law (Torah)",
              "torahBorder",
              "torahFill",
              "torahFont",
              "torahSize",
              torahFontOpen,
              setTorahFontOpen,
              torahSizeOpen,
              setTorahSizeOpen
            )}
            {renderCategoryRow(
              t("prophetsNeviim") || "Prophets (Nevi'im)",
              "neviimBorder",
              "neviimFill",
              "neviimFont",
              "neviimSize",
              neviimFontOpen,
              setNeviimFontOpen,
              neviimSizeOpen,
              setNeviimSizeOpen
            )}
            {renderCategoryRow(
              t("writingsKetuvim") || "Writings (Ketuvim)",
              "ketuvimBorder",
              "ketuvimFill",
              "ketuvimFont",
              "ketuvimSize",
              ketuvimFontOpen,
              setKetuvimFontOpen,
              ketuvimSizeOpen,
              setKetuvimSizeOpen
            )}
            {renderTextRow(
              t("bookText") || "Book Text",
              "bookTextColor",
              "bookTextFont",
              "bookTextSize",
              bookTextFontOpen,
              setBookTextFontOpen,
              bookTextSizeOpen,
              setBookTextSizeOpen
            )}
            {renderTextRow(
              t("chapterText") || "Chapter Text",
              "chapterTextColor",
              "chapterTextFont",
              "chapterTextSize",
              chapterTextFontOpen,
              setChapterTextFontOpen,
              chapterTextSizeOpen,
              setChapterTextSizeOpen
            )}
            {renderChapterColorRow(
              t("chapterColor") || "Chapter Color",
              "chapterColorBorder",
              "chapterColorFill"
            )}
          </div>
        )}
      </div>

      {/* Traditional Order Subsection */}
      <div>
        <div
          style={subSectionHeaderStyle}
          onClick={() => onToggleSection("traditionalOrder")}
        >
          <span
            style={{
              fontFamily: "Open Sans, sans-serif",
              fontSize: 14,
              fontWeight: 400,
              color: "var(--heading1Color)",
            }}
          >
            {t("traditionalOrder") || "Traditional order"}
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              transform: expandedSections.traditionalOrder
                ? "rotate(180deg)"
                : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="#666666"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {expandedSections.traditionalOrder && (
          <div style={{ padding: "16px 0" }}>
            {renderCategoryRow(
              t("pentateuch") || "Pentateuch",
              "pentateuchBorder",
              "pentateuchFill",
              "pentateuchFont",
              "pentateuchSize",
              pentateuchFontOpen,
              setPentateuchFontOpen,
              pentateuchSizeOpen,
              setPentateuchSizeOpen
            )}
            {renderCategoryRow(
              t("historical") || "Historical",
              "historicalBorder",
              "historicalFill",
              "historicalFont",
              "historicalSize",
              historicalFontOpen,
              setHistoricalFontOpen,
              historicalSizeOpen,
              setHistoricalSizeOpen
            )}
            {renderCategoryRow(
              t("poetic") || "Poetic",
              "poeticBorder",
              "poeticFill",
              "poeticFont",
              "poeticSize",
              poeticFontOpen,
              setPoeticFontOpen,
              poeticSizeOpen,
              setPoeticSizeOpen
            )}
            {renderCategoryRow(
              t("prophetic") || "Prophetic",
              "propheticBorder",
              "propheticFill",
              "propheticFont",
              "propheticSize",
              propheticFontOpen,
              setPropheticFontOpen,
              propheticSizeOpen,
              setPropheticSizeOpen
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const isDark = false;
//  window.matchMedia("(prefers-color-scheme: dark)").matches;

const ThemeSettings = () => {
  const { updateSpace, activeSpace, currentSpace, tabsIcons, setTabsIcons } =
    useTabsContext();
  const { setSideBarMode, closePopupSettings, setThemeColors, themeColors, t } =
    useSideBarContext();
  const { setShowVerses, showVerses } = useBibleContext();

  const [changesSaved, setChagesSaved] = useState(false);
  const [colorsMap, setColorsMap] = useState({});
  const [expandedSections, setExpandedSections] = useState({
    advancedSettings: false,
    containerBackgrounds: false,
    tab: false,
    buttons: false,
    scriptureText: false,
    sideMenu: false,
    selectionUIToolbar: false,
    inputFields: false,
    branding: false,
    bibleArrangements: false,
    tanakOrder: false,
    traditionalOrder: false,
  });

  // Tab settings state
  const [tabSettings, setTabSettings] = useState({
    activeTabFont: "Newsreader",
    activeTabSize: "12",
    inactiveTabFont: "Newsreader",
    inactiveTabSize: "12",
  });

  const handleTabSettingsChange = (field, value) => {
    setTabSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...tabSettings, [field]: value };
    updateSpace(activeSpace, { tabSettings: updatedSettings });
  };

  // Button settings state
  const [buttonSettings, setButtonSettings] = useState({
    primaryFont: "Newsreader",
    primarySize: "12",
    secondaryFont: "Newsreader",
    secondarySize: "12",
    tertiaryFont: "Newsreader",
    tertiarySize: "12",
  });

  const handleButtonSettingsChange = (field, value) => {
    setButtonSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...buttonSettings, [field]: value };
    updateSpace(activeSpace, { buttonSettings: updatedSettings });
  };

  // Scripture settings state
  const [scriptureSettings, setScriptureSettings] = useState({
    bookHeadingFont: "Newsreader",
    bookHeadingSize: "12",
    chapterHeadingFont: "Newsreader",
    chapterHeadingSize: "12",
    verseTextFont: "Newsreader",
    verseTextSize: "12",
    verseNumberFont: "Newsreader",
    verseNumberSize: "12",
  });

  const handleScriptureSettingsChange = (field, value) => {
    setScriptureSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...scriptureSettings, [field]: value };
    updateSpace(activeSpace, { scriptureSettings: updatedSettings });
  };

  // Side menu settings state
  const [sideMenuSettings, setSideMenuSettings] = useState({
    heading1Font: "Newsreader",
    heading1Size: "12",
    heading2Font: "Newsreader",
    heading2Size: "12",
    heading3Font: "Newsreader",
    heading3Size: "12",
    descriptionTextFont: "Newsreader",
    descriptionTextSize: "12",
    menuTextFont: "Newsreader",
    menuTextSize: "12",
    breadcrumbsFont: "Newsreader",
    breadcrumbsSize: "12",
    spaceNameFont: "Newsreader",
    spaceNameSize: "12",
    iconsSize: "12",
  });

  const [profileAvatarMode, setProfileAvatarMode] = useState("icon");

  const handleSideMenuSettingsChange = (field, value) => {
    setSideMenuSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...sideMenuSettings, [field]: value };
    updateSpace(activeSpace, { sideMenuSettings: updatedSettings });
  };

  // Selection UI & toolbar settings state
  const [selectionUISettings, setSelectionUISettings] = useState({
    toolbarIconsSize: "12",
    selectionIconsSize: "12",
  });

  const handleSelectionUISettingsChange = (field, value) => {
    setSelectionUISettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...selectionUISettings, [field]: value };
    updateSpace(activeSpace, { selectionUISettings: updatedSettings });
  };

  // Input fields settings state
  const [inputFieldsSettings, setInputFieldsSettings] = useState({
    titleFont: "Newsreader",
    titleSize: "12",
    placeholderFont: "Newsreader",
    placeholderSize: "12",
  });

  const handleInputFieldsSettingsChange = (field, value) => {
    setInputFieldsSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...inputFieldsSettings, [field]: value };
    updateSpace(activeSpace, { inputFieldsSettings: updatedSettings });
  };

  // Branding settings state
  const [brandingSettings, setBrandingSettings] = useState({
    showCompanyName: true,
    companyName: "AO Lab",
    companyNameSize: "12",
    logoUrl: "",
  });

  const handleBrandingSettingsChange = (field, value) => {
    setBrandingSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...brandingSettings, [field]: value };
    updateSpace(activeSpace, { brandingSettings: updatedSettings });
  };

  // Bible arrangement settings state
  const [bibleArrangementSettings, setBibleArrangementSettings] = useState({
    // TaNaK order
    torahFont: "DM Sans",
    torahSize: "12",
    neviimFont: "DM Sans",
    neviimSize: "12",
    ketuvimFont: "DM Sans",
    ketuvimSize: "12",
    bookTextFont: "DM Sans",
    bookTextSize: "12",
    chapterTextFont: "DM Sans",
    chapterTextSize: "12",
    // Traditional order
    pentateuchFont: "DM Sans",
    pentateuchSize: "12",
    historicalFont: "DM Sans",
    historicalSize: "12",
    poeticFont: "DM Sans",
    poeticSize: "12",
    propheticFont: "DM Sans",
    propheticSize: "12",
  });

  const handleBibleArrangementSettingsChange = (
    field: string,
    value: string
  ) => {
    setBibleArrangementSettings((prev) => ({ ...prev, [field]: value }));
    const updatedSettings = { ...bibleArrangementSettings, [field]: value };
    updateSpace(activeSpace, { bibleArrangementSettings: updatedSettings });
  };

  // Initialize CurrentColors on mount
  // useEffect(() => {
  //   globalThis.CurrentColors = isDark
  //     ? READY_THEMES[1]?.colors
  //     : themeColors?.[`${activeSpace}`] || defaultTheme;
  // }, []);

  // Resolve the working colors: local edits -> sidebar state -> default
  const colors =
    colorsMap?.[activeSpace] || themeColors?.[activeSpace] || defaultTheme;

  const handleColorChange = (field, newColor) => {
    if (field === "toolbarBackground") {
      globalThis.SetToolbarBackground?.(newColor);
    }

    debouncedSolve(newColor, (filter) => {
      const updatedColors = {
        ...colors,
        [field]: newColor,
        // ["filter-mode"]: filter,
      };

      setColorsMap((prev) => ({ ...prev, [activeSpace]: updatedColors }));
      setThemeColors((prev) => ({ ...prev, [activeSpace]: updatedColors }));
      updateSpace(activeSpace, { themeColors: updatedColors });
    });
  };

  const handleMainColorChange = (field, e) => {
    handleColorChange(field, e.target.value);
  };

  const applyMainColors = () => {
    const primary = colors.primaryColor || defaultTheme.primaryColor;
    const secondary = colors.secondaryColor || defaultTheme.secondaryColor;
    const tertiary = colors.tertiaryColor || defaultTheme.tertiaryColor;

    // Create updated colors object with cascaded values
    const updatedColors = {
      ...colors,
      // Primary color (Solid) - backgrounds and surfaces
      panelBackground: primary,
      toolbarBackground: primary,
      pageBackground: primary,
      themeSideMenu: primary,
      background: primary,
      surface: primary,
      inputBackground: primary,
      toolbarFill: primary,
      selectionUIFill: primary,
      inputActiveFill: primary,
      inputInactiveFill: primary,

      // Secondary color (Solid) - buttons, borders, accents, selected states
      primaryButton: secondary,
      primaryButtonBorder: secondary,
      primaryButtonFill: secondary,
      secondaryButton: secondary,
      secondaryButtonBorder: secondary,
      secondaryButtonFill: secondary,
      verseNumberColor: secondary,
      addButtonBackground: secondary,
      activeSpaceIndicator: secondary,
      profileAvatar: secondary,
      accentColor: secondary,
      spaceSelection: secondary,
      selectedSpaceColor: secondary,
      sectionBackground: secondary,
      activeTabBorder: secondary,
      activeTabText: secondary,
      inputActiveBorder: secondary,
      buttonBorder: secondary,

      // Tertiary color (Honey) - tab backgrounds, tool selections, tints
      activeTabBackground: tertiary,
      activeTabFill: tertiary,
      tabSelection: tertiary,
    };

    setColorsMap((prev: any) => ({ ...prev, [activeSpace]: updatedColors }));
    setThemeColors((prev: any) => ({ ...prev, [activeSpace]: updatedColors }));
    updateSpace(activeSpace, { themeColors: updatedColors });

    os.toast("Main colors applied to all elements");
  };

  const toggleSection = (sectionKey: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // When switching spaces without saving, restore the last committed theme for that space
  useEffect(() => {
    if (!changesSaved) {
      setThemeColors((prev) => ({
        ...prev,
        [activeSpace]: globalThis.CurrentColors,
      }));
    }
  }, [activeSpace]);

  return (
    <div className="themeSettings-container">
      <div className="routerOptions">
        <div
          onClick={() => {
            // if (!changesSaved) {
            //   setThemeColors((prev) => ({
            //     ...prev,
            //     [activeSpace]: globalThis.CurrentColors,
            //   }));
            // }
            setSideBarMode("themeSettings");
          }}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">{t("spaceSettings")}</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">{t("theme")}</div>
      </div>

      <CollapsibleSection
        title={t("advancedSettings")}
        isExpanded={expandedSections.advancedSettings}
        onToggle={() => toggleSection("advancedSettings")}
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 12,
                color: "#666666",
              }}
            >
              {t("selectMainColors")}
            </span>
            <span
              onClick={applyMainColors}
              style={{
                fontFamily: "Open Sans, sans-serif",
                fontSize: 12,
                color: "var(--spaceSelection)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M10 3L4.5 8.5L2 6"
                  stroke="var(--spaceSelection)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t("apply")}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <MainColorPicker
              label={t("primary")}
              sublabel={t("primary")}
              color={colors.primaryColor || defaultTheme.primaryColor}
              onChange={(e) => handleMainColorChange("primaryColor", e)}
            />
            <MainColorPicker
              label={t("secondary")}
              sublabel={t("secondary")}
              color={colors.secondaryColor || defaultTheme.secondaryColor}
              onChange={(e) => handleMainColorChange("secondaryColor", e)}
            />
            <MainColorPicker
              label={t("tertiary")}
              sublabel={t("tertiary")}
              color={colors.tertiaryColor || defaultTheme.tertiaryColor}
              onChange={(e) => handleMainColorChange("tertiaryColor", e)}
            />
          </div>
        </div>
      </CollapsibleSection>

      {Object.entries(ADVANCED_SETTINGS_SECTIONS).map(([key, section]) => (
        <CollapsibleSection
          key={key}
          title={t(section.labelKey)}
          isExpanded={expandedSections[key as keyof typeof expandedSections]}
          onToggle={() => toggleSection(key as keyof typeof expandedSections)}
        >
          {key === "tab" ? (
            <TabSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              tabSettings={tabSettings}
              onTabSettingsChange={handleTabSettingsChange}
              showTabIcons={tabsIcons}
              onToggleTabIcons={() => setTabsIcons(!tabsIcons)}
              t={t}
            />
          ) : key === "buttons" ? (
            <ButtonsSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              buttonSettings={buttonSettings}
              onButtonSettingsChange={handleButtonSettingsChange}
              t={t}
            />
          ) : key === "scriptureText" ? (
            <ScriptureTextSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              scriptureSettings={scriptureSettings}
              onScriptureSettingsChange={handleScriptureSettingsChange}
              showVerseNumbers={showVerses[activeSpace]}
              onToggleVerseNumbers={() =>
                setShowVerses((prev) => ({
                  ...prev,
                  [activeSpace]: !prev[activeSpace],
                }))
              }
              t={t}
            />
          ) : key === "sideMenu" ? (
            <SideMenuSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              sideMenuSettings={sideMenuSettings}
              onSideMenuSettingsChange={handleSideMenuSettingsChange}
              profileAvatarMode={profileAvatarMode}
              onToggleProfileAvatarMode={() =>
                setProfileAvatarMode(
                  profileAvatarMode === "picture" ? "icon" : "picture"
                )
              }
              t={t}
            />
          ) : key === "selectionUIToolbar" ? (
            <SelectionUIToolbarSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              selectionUISettings={selectionUISettings}
              onSelectionUISettingsChange={handleSelectionUISettingsChange}
              t={t}
            />
          ) : key === "inputFields" ? (
            <InputFieldsSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              inputFieldsSettings={inputFieldsSettings}
              onInputFieldsSettingsChange={handleInputFieldsSettingsChange}
              t={t}
            />
          ) : key === "branding" ? (
            <BrandingSectionContent
              brandingSettings={brandingSettings}
              onBrandingSettingsChange={handleBrandingSettingsChange}
              t={t}
            />
          ) : key === "bibleArrangements" ? (
            <BibleArrangementsSectionContent
              colors={colors}
              onColorChange={handleColorChange}
              bibleArrangementSettings={bibleArrangementSettings}
              onBibleArrangementSettingsChange={
                handleBibleArrangementSettingsChange
              }
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
              t={t}
            />
          ) : (
            section.fields.map((field) => (
              <CompactColorRow
                key={field.field}
                label={t(field.labelKey)}
                value={colors[field.field]}
                onChange={(e) => handleColorChange(field.field, e.target.value)}
              />
            ))
          )}
        </CollapsibleSection>
      ))}

      <div style={{ height: 20 }} />

      <style>{getStyleOf("themeSettings.css")}</style>
    </div>
  );
};

// ————————————————————————————————————————————————————————————
// Dynamic ColorRow (single component used for all rows)
// ————————————————————————————————————————————————————————————
const ColorRow = ({ label, field, value, labelColor, onChange }) => {
  const inputRef = useRef(null);
  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            color: labelColor,
            fontFamily: "Open Sans",
            fontSize: 16,
            fontStyle: "normal",
            fontWeight: 600,
            lineHeight: "normal",
          }}
        >
          {label}
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            aspectRatio: "1 / 1",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <svg
            // className='coloredIcon'
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              cx="12"
              cy="12"
              r="11.5"
              fill={value || "#868686"}
              stroke="black"
            />
          </svg>
          <input
            ref={inputRef}
            style={{
              opacity: 0,
              position: "absolute",
              inset: 0,
              cursor: "pointer",
            }}
            type="color"
            value={value || "#ffffff"}
            onChange={(e) => onChange(field, e)}
          />
        </div>
      </div>
    </>
  );
};

const FONT_OPTIONS = [
  { name: "Newsreader", value: "Newsreader, serif" },
  { name: "DM Sans", value: "DM Sans, sans-serif" },
  { name: "Plus Jakarta Sans", value: "Plus Jakarta Sans, sans-serif" },
  { name: "Satoshi", value: "Satoshi, sans-serif" },
  { name: "Georgia", value: "Georgia, serif" },
];

const LINE_HEIGHTS = [1.5, 2, 2.5];

const FONT_SIZES = [
  { label: "Small", value: "14" },
  { label: "Medium", value: "16" },
  { label: "Large", value: "18" },
  { label: "Extra Large", value: "20" },
];

const SURPRISE_COMBINATIONS = [
  {
    font: "Newsreader, serif",
    fontSize: "16px",
    theme: 0,
  },
  {
    font: "Plus Jakarta Sans, sans-serif",
    fontSize: "18px",
    theme: 2,
  },
  {
    font: "DM Sans, sans-serif",
    fontSize: "16px",
    theme: 3,
  },
  {
    font: "Georgia, serif",
    fontSize: "18px",
    theme: 4,
  },
  {
    font: "Satoshi, sans-serif",
    fontSize: "16px",
    theme: 1,
  },
  {
    font: "Newsreader, serif",
    fontSize: "20px",
    theme: 2,
  },
  {
    font: "Georgia, serif",
    fontSize: "20px",
    theme: 0,
  },
];

function buildTextConfigUpdate(section, fontFamily, fontSize, currentConfig) {
  if (!currentConfig) {
    console.error("currentConfig is required for buildTextConfigUpdate");
    return;
  }

  // clone config
  const updatedConfig = JSON.parse(JSON.stringify(currentConfig));

  // apply new font settings while preserving existing lineHeight
  updatedConfig[section].font = fontFamily;
  updatedConfig[section].fontSize = fontSize; // if you want to use size
  updatedConfig[section].size = fontSize; // in case you prefer `size` key
  // preserve lineHeight if it exists
  if (currentConfig[section].lineHeight !== undefined) {
    updatedConfig[section].lineHeight = currentConfig[section].lineHeight;
  }

  // rebuild CSS variables using your existing exporter
  const cssVars = exportTextConfigToCSS(updatedConfig);

  return {
    settings: {
      text: {
        root: cssVars,
        data: updatedConfig,
      },
    },
  };
}
export function exportTextConfigToCSS(textConfig) {
  const toCSSVarName = (section, key) => `--text-${section}-${key}`;
  const cssVars = [];

  for (const [section, config] of Object.entries(textConfig)) {
    const styles = config.styles || {};
    cssVars.push(
      `${toCSSVarName(section, "line-height")}: ${config.lineHeight || "normal"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "font")}: ${config.font || "inherit"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "weight")}: ${config.weight || "normal"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "font-style")}: ${styles.italic ? "italic" : "normal"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "text-decoration")}: ${styles.underline ? "underline" : "none"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "font-bold")}: ${styles.bold ? "bold" : config.weight || "normal"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "alignment")}: ${styles.alignment || "left"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "color")}: ${config.color || "black"};`
    );
    cssVars.push(
      `${toCSSVarName(section, "margin-top")}: ${config.marginTop || config.marginVertical || "16"}px;`
    );
    cssVars.push(
      `${toCSSVarName(section, "margin-bottom")}: ${config.marginBottom || config.marginVertical || "16"}px;`
    );
    cssVars.push(
      `${toCSSVarName(section, "margin-left")}: ${config.marginHorizontal || "0"}%;`
    );
    cssVars.push(
      `${toCSSVarName(section, "margin-right")}: ${config.marginHorizontal || "0"}%;`
    );
    cssVars.push(
      `${toCSSVarName(section, "font-size")}: ${config.fontSize || config.size || "16"}px;`
    );
  }

  return `:root {\n  ${cssVars.join("\n  ")}\n}`;
}
export const defaultTextConfig = {
  bookchapter: {
    font: `'Newsreader', serif`,
    weight: "600",
    color: "black",
    marginVertical: "0",
    marginHorizontal: "27",
    styles: {
      bold: true,
      italic: false,
      underline: false,
      alignment: "left",
    },
  },
  heading: {
    font: `'Plus Jakarta Sans', sans-serif`,
    weight: "200",
    color: "black",
    marginTop: "18",
    marginBottom: "12",
    marginHorizontal: "27",
    styles: {
      bold: false,
      italic: true,
      underline: false,
      alignment: "left",
    },
  },
  chapter: {
    font: `'Newsreader', serif`,
    weight: "600",
    color: "black",
    marginVertical: "8",
    marginHorizontal: "27",
    styles: {
      bold: true,
      italic: false,
      underline: false,
      alignment: "left",
    },
  },
  verse: {
    font: `'Newsreader', serif`,
    weight: "400",
    color: "black",
    fontSize: "20",
    marginVertical: "30",
    marginHorizontal: "27",
    lineHeight: 2,
    styles: {
      bold: false,
      italic: false,
      underline: false,
      alignment: "left",
    },
  },
};
const SettingsUI = () => {
  const [showCapturedText, setShowCapturedText] = useState(true);
  const [showVersusText, setShowVersusText] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(isDark ? 1 : 0);
  const [selectedFont, setSelectedFont] = useState(0);
  const [selectedFontSize, setSelectedFontSize] = useState(3);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const {
    setShowHeading,
    setShowVerses,
    showHeading,
    showVerses,
    showFootnotes,
    setShowFootnotes,
  } = useBibleContext();
  const handleSurpriseMe = () => {
    const randomCombo =
      SURPRISE_COMBINATIONS[
        Math.floor(Math.random() * SURPRISE_COMBINATIONS.length)
      ];
    setSelectedTheme(randomCombo.theme);
    const fontIndex = FONT_OPTIONS.findIndex(
      (f) => f.value === randomCombo.font
    );
    setSelectedFont(fontIndex);
    const sizeIndex = FONT_SIZES.findIndex(
      (s) => s.value === randomCombo.fontSize
    );
    setSelectedFontSize(sizeIndex);
  };
  const { updateSpace, activeSpace, currentSpace, tabsIcons, setTabsIcons } =
    useTabsContext();
  const { setSideBarMode, closePopupSettings, setThemeColors, themeColors, t } =
    useSideBarContext();

  const [changesSaved, setChagesSaved] = useState(false);
  const [colorsMap, setColorsMap] = useState({});
  const [originalColorsMap, setOriginalColorsMap] = useState({});

  // Initialize CurrentColors on mount
  useEffect(() => {
    globalThis.CurrentColors = themeColors?.[`${activeSpace}`] || defaultTheme;
  }, []);

  // Resolve the working colors: local edits -> sidebar state -> default
  const colors =
    colorsMap?.[activeSpace] || themeColors?.[activeSpace] || defaultTheme;

  const labelColor = colors?.text1 || "#606060";
  const handleColorChange = (field, e) => {
    const newColor = e.target.value;
    setChagesSaved(false);

    if (field === "toolbarBackground") {
      globalThis.SetToolbarBackground?.(newColor);
    }

    debouncedSolve(newColor, (filter) => {
      const updatedColors = {
        ...colors,
        [field]: newColor,
        ["filter-mode"]: filter,
      };

      setColorsMap((prev) => ({ ...prev, [activeSpace]: updatedColors }));
      setThemeColors((prev) => ({ ...prev, [activeSpace]: updatedColors }));
      updateSpace(activeSpace, { themeColors: updatedColors });
    });
  };

  const settingsPreset =
    configBot?.tags?.settingsPreset || thisBot.tags.settingsPreset || "full";

  // ————————————————————————————————————————————————————————————
  // Handle Tab Icons Toggle
  // ————————————————————————————————————————————————————————————
  const handleTabIconsToggle = () => {
    setTabsIcons(!tabsIcons);
  };

  // ————————————————————————————————————————————————————————————
  // Apply Ready Theme
  // ————————————————————————————————————————————————————————————
  const applyReadyTheme = (themeColors) => {
    setChagesSaved(false);

    // Apply toolbar background side-effect if needed
    if (themeColors.toolbarBackground) {
      globalThis.SetToolbarBackground?.(themeColors.toolbarBackground);
    }

    let filterMode;
    if (themeColors["iconColor"]) {
      filterMode = getColorFilterCached(themeColors["iconColor"]);
    }
    os.log("computed filter for icon color filterMode", filterMode);
    // Update local map
    setColorsMap((prev) => ({
      ...prev,
      [activeSpace]: filterMode
        ? { ...themeColors, "filter-mode": filterMode }
        : themeColors,
    }));

    // Update sidebar theme state (immediate apply)
    setThemeColors((prev) => ({ ...prev, [activeSpace]: themeColors }));

    // Persist to the space
    updateSpace(activeSpace, { themeColors });
  };

  // When switching spaces without saving, restore the last committed theme for that space
  // useEffect(() => {
  //   if (!changesSaved) {
  //     setThemeColors((prev) => ({
  //       ...prev,
  //       [activeSpace]: globalThis.CurrentColors,
  //     }));
  //   }
  // }, [activeSpace]);

  // Removed: this effect was overwriting the user's saved theme on every mount

  const [textConfig, setTextConfig] = useState(() => {
    // Try to load from saved space settings
    const savedConfig = currentSpace?.settings?.text?.data;
    return (
      savedConfig || {
        heading: { ...defaultTextConfig.heading },
        chapter: { ...defaultTextConfig.chapter },
        verse: { ...defaultTextConfig.verse },
        bookchapter: { ...defaultTextConfig.bookchapter },
      }
    );
  });

  // Sync font size, font, and line height index when space changes
  useEffect(() => {
    const savedConfig = currentSpace?.settings?.text?.data;
    if (savedConfig) {
      setTextConfig(savedConfig);

      // Sync font size
      const savedFontSize =
        savedConfig?.verse?.fontSize || savedConfig?.verse?.size;
      if (savedFontSize) {
        const sizeIdx = FONT_SIZES.findIndex((s) => s.value === savedFontSize);
        if (sizeIdx !== -1) setSelectedFontSize(sizeIdx);
      }

      // Sync font
      const savedFont = savedConfig?.verse?.font;
      if (savedFont) {
        const fontIdx = FONT_OPTIONS.findIndex((f) => f.value === savedFont);
        if (fontIdx !== -1) setSelectedFont(fontIdx);
      }

      // Sync line height
      const savedLineHeight = savedConfig?.verse?.lineHeight;
      if (savedLineHeight !== undefined) {
        const lhIdx = LINE_HEIGHTS.indexOf(savedLineHeight);
        if (lhIdx !== -1) setLineHeightIndex(lhIdx);
      }
    }
  }, [activeSpace, currentSpace]);

  const handleThemeSelect = (index) => {
    setSelectedTheme(index);
    applyReadyTheme(presetThemes[index]?.colors);
    setChagesSaved(true);
    globalThis.CurrentColors = presetThemes[index]?.colors || colors;
  };

  const applyVerseFont = (fontFamily) => {
    const updateObj = buildTextConfigUpdate(
      "verse",
      fontFamily,
      FONT_SIZES[selectedFontSize].value,
      textConfig
    );

    updateSpace(activeSpace, updateObj);
  };
  const applyVerseFontSize = (fontSize) => {
    const updateObj = buildTextConfigUpdate(
      "verse",
      FONT_OPTIONS[selectedFont].value,
      fontSize,
      textConfig
    );

    updateSpace(activeSpace, updateObj);
  };

  const [lineHeightIndex, setLineHeightIndex] = useState(() => {
    // Load saved lineHeight from config, default to index 1 (value 2)
    const savedLineHeight =
      currentSpace?.settings?.text?.data?.verse?.lineHeight;
    if (savedLineHeight !== undefined) {
      const idx = LINE_HEIGHTS.indexOf(savedLineHeight);
      return idx !== -1 ? idx : 1;
    }
    return 1;
  });

  const handleDecreaseFontSize = () => {
    if (selectedFontSize > 0) {
      const newIndex = selectedFontSize - 1;
      setSelectedFontSize(newIndex);
      applyVerseFontSize(FONT_SIZES[newIndex].value);
    }
  };

  const handleIncreaseFontSize = () => {
    if (selectedFontSize < FONT_SIZES.length - 1) {
      const newIndex = selectedFontSize + 1;
      setSelectedFontSize(newIndex);
      applyVerseFontSize(FONT_SIZES[newIndex].value);
    }
  };

  const applyVerseLineHeight = (lineHeight) => {
    const updateObj = buildTextConfigUpdate(
      "verse",
      FONT_OPTIONS[selectedFont].value, // keep current font
      FONT_SIZES[selectedFontSize].value, // keep current font size
      {
        ...textConfig,
        verse: {
          ...textConfig.verse,
          lineHeight, // override line-height
        },
      }
    );

    updateSpace(activeSpace, updateObj);
  };

  const handleCycleLineHeight = () => {
    const nextIndex = (lineHeightIndex + 1) % LINE_HEIGHTS.length;
    setLineHeightIndex(nextIndex);
    applyVerseLineHeight(LINE_HEIGHTS[nextIndex]);
  };

  const containerStyle = {
    width: "280px",
    height: "100%",
    // minHeight: '100vh',
    // backgroundColor: '#F0F1F1',
    fontFamily: "Newsreader, system-ui, -apple-system, sans-serif",
    padding: "20px",
    overflow: "scroll",
    position: "relative",
  };

  const sectionTitleStyle = {
    fontSize: "16px",
    color: "var(--text2)",
    fontWeight: "500",
    marginBottom: "12px",
  };

  const cardContainerStyle = {
    display: "flex",
    gap: "10px",
    marginBottom: "30px",
    flexWrap: "wrap",
  };

  const cardStyle = (isSelected) => ({
    width: "98px",
    height: "89px",
    backgroundColor: "white",
    border: isSelected
      ? "2px solid var(--spaceSelection)"
      : "1px solid #E1E3EA",
    borderRadius: "4px",
    overflow: "hidden",
    position: "relative",
    cursor: "pointer",
    transition: "border 0.2s ease",
  });

  const cardSidebarStyle = (color) => ({
    width: "27px",
    height: "100%",
    backgroundColor: color,
    opacity: 0.1,
    position: "absolute",
    left: 0,
    top: 0,
  });

  const cardBadgeStyle = (color) => ({
    width: "21.75px",
    height: "3.75px",
    backgroundColor: color,
    opacity: 0.6,
    borderRadius: "1px",
    margin: "8px 0 0 2px",
    border: `0.25px solid ${color}`,
  });

  const cardIconStyle = (color) => ({
    width: "3px",
    height: "3px",
    backgroundColor: color,
    borderRadius: "0.5px",
    position: "absolute",
    left: "21px",
    top: "3px",
  });

  const cardLabelStyle = {
    width: "8px",
    height: "1px",
    backgroundColor: "var(--heading2Color)",
    borderRadius: "0.5px",
    margin: "4px 0 0 3px",
  };

  const cardLineStyle = {
    height: "1px",
    backgroundColor: "black",
    opacity: 0.6,
    marginLeft: "31px",
  };

  const dropdownStyle = {
    width: "100%",
    backgroundColor: "var(--panelBackground) !important",
    border: "1px solid #E1E3EA",
    borderRadius: "4px",
    padding: "12px 16px",
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    position: "relative",
  };

  const dropdownTextStyle = {
    fontSize: "13px",
    color: "var(--heading1Color)",
  };

  const dropdownSubtextStyle = {
    fontSize: "10px",
    color: "var(--heading1Color)",
    marginTop: "2px",
  };

  const dropdownMenuStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "var(--panelBackground) !important",
    border: "1px solid #E1E3EA",
    borderRadius: "4px",
    marginTop: "4px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    zIndex: 10,
    maxHeight: "200px",
    overflowY: "auto",
  };

  const menuItemStyle = (isSelected) => ({
    padding: "12px 16px",
    cursor: "pointer",
    backgroundColor: isSelected ? "#F5F5F5" : "white",
    borderBottom: "1px solid #F0F0F0",
    fontSize: "13px",
    transition: "background-color 0.2s",
  });

  const toggleRowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
  };

  const toggleLabelStyle = {
    fontSize: "11px",
    color: "var(--heading1Color)",
  };

  const toggleStyle = (isOn) => ({
    width: "32px",
    height: "16px",
    backgroundColor: isOn ? "var(--spaceSelection)" : "#CCCCCD",
    borderRadius: "8px",
    position: "relative",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  });

  const toggleCircleStyle = (isOn) => ({
    width: "12px",
    height: "12px",
    backgroundColor: "white",
    borderRadius: "50%",
    position: "absolute",
    top: "2px",
    left: isOn ? "18px" : "2px",
    transition: "left 0.3s ease",
  });

  const separatorStyle = {
    height: "1px",
    backgroundColor: "#CCCCCD",
    margin: "30px 0",
  };

  const buttonStyle = {
    width: "100%",
    padding: "12px",
    backgroundColor: "var(--spaceSelection)",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    marginBottom: "20px",
    transition: "background-color 0.2s",
  };

  return (
    <div className="themeSettings-container" style={containerStyle}>
      <div className="routerOptions">
        <div
          onClick={() => {
            // if (!changesSaved) {
            //   setThemeColors((prev) => ({
            //     ...prev,
            //     [activeSpace]: globalThis.CurrentColors,
            //   }));
            // }
            setSideBarMode("settings");
          }}
          style={{ cursor: "pointer" }}
          className="blackText"
        >
          <MenuIcon name="arrow_back" />
        </div>
        <div className="softText">{t("settings")}</div>
        <div className="softText">
          <MenuIcon name="chevron_right" />
        </div>
        <div className="softText">{t("theme")}</div>
      </div>
      <div style={{ marginTop: "20px" }}>
        <div className="routerTitle blackText">
          <div className="blackText">
            <ThemeIcon />
          </div>
          <div>
            {t("theme")} & {t("text")}
          </div>
        </div>
        <div style={{ display: "flex", gap: "7px", marginBottom: "30px" }}>
          <div
            style={{
              width: "80px",
              height: "43px",
              backgroundColor: "var(--panelBackground) !important",
              border: "1px solid #E1E3EA",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={handleDecreaseFontSize}
          >
            <svg
              style={{ filter: "none", stroke: "var(--heading1Color)" }}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <text x="6" y="9" fontSize="8" textAnchor="middle" fill="black">
                A
              </text>
            </svg>
          </div>
          <div
            style={{
              width: "80px",
              height: "43px",
              backgroundColor: "var(--panelBackground) !important",
              border: "1px solid #E1E3EA",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={handleIncreaseFontSize}
          >
            <svg
              style={{ filter: "none", stroke: "var(--heading1Color)" }}
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <text
                x="10"
                y="14"
                fontSize="14"
                textAnchor="middle"
                fill="black"
              >
                A
              </text>
            </svg>
          </div>
          <div
            style={{
              width: "80px",
              height: "43px",
              backgroundColor: "var(--panelBackground) !important",
              border: "1px solid #E1E3EA",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={handleCycleLineHeight}
          >
            <svg
              style={{ filter: "none", stroke: "var(--heading1Color)" }}
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              {(() => {
                const gap = 3.5 + lineHeightIndex * 1.5;
                const startY = 3;
                return (
                  <>
                    <rect
                      x="3"
                      y={startY}
                      width="12"
                      height="2"
                      rx="1"
                      fill="black"
                    />
                    <rect
                      x="3"
                      y={startY + gap}
                      width="12"
                      height="2"
                      rx="1"
                      fill="black"
                    />
                    <rect
                      x="3"
                      y={startY + 2 * gap}
                      width="12"
                      height="2"
                      rx="1"
                      fill="black"
                    />
                  </>
                );
              })()}
            </svg>
          </div>
        </div>

        <div
          style={dropdownStyle}
          onClick={() => setShowFontDropdown(!showFontDropdown)}
        >
          <div>
            <div style={dropdownTextStyle}>
              {FONT_OPTIONS[selectedFont].name}
            </div>
            <div style={dropdownSubtextStyle}>{t("font")}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 11L3 6L3.7 5.3L8 9.6L12.3 5.3L13 6L8 11Z"
              fill="black"
            />
          </svg>
          {showFontDropdown && (
            <div style={dropdownMenuStyle} onClick={(e) => e.stopPropagation()}>
              {FONT_OPTIONS.map((font, index) => (
                <div
                  key={index}
                  style={menuItemStyle(selectedFont === index)}
                  onClick={() => {
                    setSelectedFont(index);
                    applyVerseFont(FONT_OPTIONS[index].value);
                    setShowFontDropdown(false);
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.backgroundColor = "#F5F5F5")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.backgroundColor =
                      selectedFont === index ? "#F5F5F5" : "white")
                  }
                >
                  {font.name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={toggleRowStyle}>
        <div style={toggleLabelStyle}>
          {t(
            showHeading[activeSpace]
              ? "hideChapterHeadings"
              : "showChapterHeadings"
          )}
        </div>

        <div
          style={toggleStyle(showHeading[activeSpace])}
          onClick={() =>
            setShowHeading((prev) => ({
              ...prev,
              [activeSpace]: !prev[activeSpace],
            }))
          }
        >
          <div style={toggleCircleStyle(showHeading[activeSpace])}></div>
        </div>
      </div>

      <div style={toggleRowStyle}>
        <div style={toggleLabelStyle}>
          {t(showVerses[activeSpace] ? "hideVerseNumbers" : "showVerseNumbers")}
        </div>

        <div
          style={toggleStyle(showVerses[activeSpace])}
          onClick={() =>
            setShowVerses((prev) => ({
              ...prev,
              [activeSpace]: !prev[activeSpace],
            }))
          }
        >
          <div style={toggleCircleStyle(showVerses[activeSpace])}></div>
        </div>
      </div>

      <div style={toggleRowStyle}>
        <div style={toggleLabelStyle}>
          {t(showFootnotes[activeSpace] ? "hideFootnotes" : "showFootnotes")}
        </div>

        <div
          style={toggleStyle(showFootnotes[activeSpace])}
          onClick={() =>
            setShowFootnotes((prev) => ({
              ...prev,
              [activeSpace]: !prev[activeSpace],
            }))
          }
        >
          <div style={toggleCircleStyle(showFootnotes[activeSpace])}></div>
        </div>
      </div>

      <div style={separatorStyle}></div>

      <div style={sectionTitleStyle}>{t("themes")}</div>

      <div style={cardContainerStyle}>
        {presetThemes.map((theme, index) =>
          index !== 1 ? (
            <div
              key={index}
              style={cardStyle(selectedTheme === index)}
              onClick={() => handleThemeSelect(index)}
            >
              <div style={cardSidebarStyle(theme.colors.panelBackground)}>
                <div style={cardBadgeStyle(theme.colors.panelBackground)}></div>
                <div style={cardLabelStyle}></div>
              </div>
              <div style={cardIconStyle(theme.colors.panelBackground)}></div>
              <div style={{ marginTop: "14px" }}>
                <div style={{ ...cardLineStyle, width: "53px" }}></div>
                <div
                  style={{ ...cardLineStyle, width: "42px", marginTop: "7px" }}
                ></div>
                <div
                  style={{ ...cardLineStyle, width: "53px", marginTop: "7px" }}
                ></div>
                <div
                  style={{ ...cardLineStyle, width: "35px", marginTop: "7px" }}
                ></div>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "9px",
                  right: "13px",
                  width: "22px",
                  height: "5px",
                  backgroundColor: theme.colors.panelBackground,
                  opacity: 0.1,
                  borderRadius: "1px",
                }}
              ></div>

              {selectedTheme === index && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    width: "20px",
                    height: "20px",
                    backgroundColor: "var(--spaceSelection)",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          ) : (
            <div
              key={index}
              style={{
                ...cardStyle(selectedTheme === index),
                backgroundColor: "#404040",
              }}
              onClick={() => handleThemeSelect(index)}
            >
              <div style={cardSidebarStyle("rgb(255 255 255)")}>
                <div style={cardBadgeStyle("black")}></div>
                <div style={cardLabelStyle}></div>
              </div>
              <div style={cardIconStyle("black")}></div>
              <div style={{ marginTop: "14px" }}>
                <div
                  style={{
                    ...cardLineStyle,
                    backgroundColor: "white",
                    width: "53px",
                  }}
                ></div>
                <div
                  style={{
                    ...cardLineStyle,
                    backgroundColor: "white",
                    width: "42px",
                    marginTop: "7px",
                  }}
                ></div>
                <div
                  style={{
                    ...cardLineStyle,
                    backgroundColor: "white",
                    width: "53px",
                    marginTop: "7px",
                  }}
                ></div>
                <div
                  style={{
                    ...cardLineStyle,
                    backgroundColor: "white",
                    width: "35px",
                    marginTop: "7px",
                  }}
                ></div>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: "9px",
                  right: "13px",
                  width: "22px",
                  height: "5px",
                  backgroundColor: "white",
                  opacity: 0.1,
                  borderRadius: "1px",
                }}
              ></div>

              {selectedTheme === index && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    right: "8px",
                    width: "20px",
                    height: "20px",
                    backgroundColor: "var(--spaceSelection)",
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          )
        )}
      </div>
      {settingsPreset === "full" && (
        <button
          style={buttonStyle}
          onClick={() => setSideBarMode("advancedThemeSettings")}
        >
          {t("advancedSettings")}
        </button>
      )}
      <div style={separatorStyle}></div>
    </div>
  );
};
export { ThemeSettings, SettingsUI };
