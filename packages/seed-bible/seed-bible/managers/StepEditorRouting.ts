import {
  batch,
  effect,
  signal,
  untracked,
  type ReadonlySignal,
} from "@preact/signals";
import type { NavigationManager } from "./NavigationManager";
import {
  buildSharedPagePath,
  parseSharedPagePath,
  type SharedPageKind,
} from "./SharedPagePath";
import type { StepEditor } from "./StepEditor";

/** The editor screen a URL names. */
interface StepEditorRoute {
  locator: string;
  step: number | null;
  details: boolean;
  settings: boolean;
}

export interface StepEditorRoutingOptions {
  kind: SharedPageKind;
  navigation: Pick<
    NavigationManager,
    "currentUrl" | "basePath" | "updatePathAndQueryParams"
  >;
  language: ReadonlySignal<string>;
  editor: StepEditor;
  /** The locator of the draft open in the editor; null while it's closed. */
  openLocator: ReadonlySignal<string | null>;
  /**
   * The saved title, not the draft's: the slug shouldn't change, and cost
   * history entries, with every letter typed into the title.
   */
  savedTitle: ReadonlySignal<string | null>;
  /**
   * Opens what `locator` names in the editor: true once it's open, false if
   * it can't be. When it has to be loaded first, resolves to a function that
   * opens it, or null if it couldn't be loaded.
   */
  open: (locator: string) => boolean | Promise<(() => void) | null>;
  /** Closes the editor, the browser's Back having left it. */
  leaveForUrl: () => void;
  /**
   * Takes the URL off the editor's, when the editor closed with its own
   * buttons. `before` is where the URL was when the editor opened, or null
   * when it opened straight onto its path (a reload, or Forward).
   */
  leaveUrl: (before: string | null) => void;
}

/**
 * Keeps a step editor's place in the URL, under its record's own path:
 * `/{lang}/{segment}/{locator}/{slug}/edit` for its list of steps, then
 * `…/edit/details`, `…/edit/step/{step}` and `…/edit/step/{step}/settings`
 * (see `SharedPageEditScreen`). Each move pushes a history entry, so Back and
 * Forward step through the editor, and a reload reopens it where it was.
 */
export function createStepEditorRouting(options: StepEditorRoutingOptions) {
  const { kind, navigation, editor, openLocator } = options;

  const routeFromUrl = (url: URL): StepEditorRoute | null => {
    const page = parseSharedPagePath(url.pathname, navigation.basePath);
    if (page?.kind !== kind || !page.edit) {
      return null;
    }
    const { edit } = page;
    return {
      locator: page.locator,
      step: edit.screen === "step" ? edit.step : null,
      details: edit.screen === "details",
      settings: edit.screen === "step" && edit.settings,
    };
  };

  const pathFor = (route: StepEditorRoute, title: string | null): string =>
    buildSharedPagePath({
      kind,
      language: options.language.peek(),
      locator: route.locator,
      title,
      edit:
        route.step != null
          ? { screen: "step", step: route.step, settings: route.settings }
          : route.details
            ? { screen: "details" }
            : { screen: "steps" },
    });

  let urlBefore: string | null = null;
  /** The editor the URL asks for, while what it edits is still loading. */
  const pending = signal<StepEditorRoute | null>(null);

  /** Puts the open editor on the step and sheets `route` names. */
  const showRoute = (route: StepEditorRoute) => {
    const count = editor.items.peek().length;
    // A step that's no longer there (the list changed) is the list.
    const index =
      route.step != null && route.step <= count ? route.step - 1 : -1;
    if (index !== (route.step ?? 0) - 1 || (route.settings && index < 0)) {
      // Writing what's really open corrects the URL rather than moving on.
      editor.replaceNextUrlWrite();
    }
    batch(() => {
      if (editor.stepIndex.peek() !== index) {
        editor.selectStep(index);
      }
      editor.detailsOpen.value = route.details;
      editor.settingsOpen.value = index >= 0 && route.settings;
    });
  };

  const openForUrl = (route: StepEditorRoute) => {
    const opened = options.open(route.locator);
    if (opened === true) {
      showRoute(route);
      return;
    }
    if (opened === false) {
      // Dropping it corrects the URL rather than moving on.
      editor.replaceNextUrlWrite();
      pending.value = null;
      return;
    }
    pending.value = route;
    void opened
      .catch(() => null)
      .then((openLoaded) => {
        const wanted = pending.peek();
        if (wanted?.locator !== route.locator) {
          return; // The URL has moved on.
        }
        // Opening it fills in the URL that was already asked for.
        editor.replaceNextUrlWrite();
        batch(() => {
          pending.value = null;
          if (openLoaded) {
            openLoaded();
            showRoute(wanted);
          }
        });
      });
  };

  const applyRoute = (route: StepEditorRoute | null) => {
    const open = openLocator.peek();
    if (!route) {
      pending.value = null;
      if (open !== null) {
        urlBefore = null;
        options.leaveForUrl();
      }
      return;
    }
    if (open === route.locator) {
      showRoute(route);
      return;
    }
    if (pending.peek()?.locator === route.locator) {
      pending.value = route;
      return;
    }
    openForUrl(route);
  };

  if (!import.meta.env.SSR) {
    // URL -> editor first, so a reload's route is waiting before the editor
    // -> URL effect below first runs; otherwise that run would clear it.
    effect(() => {
      const url = navigation.currentUrl.value;
      untracked(() => applyRoute(routeFromUrl(url)));
    });

    effect(() => {
      const locator = openLocator.value;
      const loading = pending.value;
      const step = editor.stepIndex.value;
      const details = editor.detailsOpen.value;
      const settings = editor.settingsOpen.value;
      const title = options.savedTitle.value;
      untracked(() => {
        const url = navigation.currentUrl.peek();
        const onEditorPath = !!routeFromUrl(url);
        if (locator !== null) {
          if (!onEditorPath) {
            urlBefore = url.href;
          }
          navigation.updatePathAndQueryParams(
            pathFor(
              {
                locator,
                step: step >= 0 ? step + 1 : null,
                details,
                settings: step >= 0 && settings,
              },
              title
            ),
            {},
            editor.replacesUrlWrite()
          );
        } else if (!loading && onEditorPath) {
          const before = urlBefore;
          urlBefore = null;
          options.leaveUrl(before);
        }
      });
    });
  }

  return {
    /** Where the URL was when the editor opened, for leaving it to return to. */
    urlBefore: () => urlBefore,
  };
}
