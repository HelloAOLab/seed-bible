import { registerExtension, type SeedBibleState } from "seed-bible";
import type { BibleToolContext } from "seed-bible/managers";
import { MaterialIcon } from "seed-bible/components";
import {
  ComparePane,
  ComparePaneHeader,
  ComparePaneTitle,
} from "./ComparePane";
import {
  COMPARE_PANE_ID,
  createCompareState,
  snapshotSelection,
  type CompareState,
} from "./compareState";

function CompareIcon() {
  return <MaterialIcon>text_compare</MaterialIcon>;
}

/**
 * Freezes the current selection and opens (or refreshes) the Compare pane.
 *
 * The selection is snapshotted rather than followed: on mobile every pane is
 * displayed fullscreen, which hides the verse toolbar and covers the reader, so
 * a pane mirroring the live selection would blank itself the moment it opened.
 */
function openComparePane(
  context: SeedBibleState,
  state: CompareState,
  toolContext: BibleToolContext
) {
  const selected = toolContext.readingState.selectedVerses.value;
  if (selected.length === 0) {
    return;
  }

  state.snapshot.value = snapshotSelection(selected);
  state.sourceReadingState.value = toolContext.readingState;
  state.view.value = "compare";
  state.addReturnTo.value = "compare";

  context.panes.openPane({
    id: COMPARE_PANE_ID,
    placement: "side",
    title: () => <ComparePaneTitle state={state} />,
    header: () => <ComparePaneHeader state={state} />,
    icon: CompareIcon,
    component: () => <ComparePane context={context} state={state} />,
    onClose: () => state.reset(),
  });
}

export default function initCompareExtension() {
  registerExtension({
    id: "compare-extension",
    init: function* (context: SeedBibleState) {
      const state = createCompareState(context);

      yield context.tools.registerVerseToolbarTool({
        id: "compare-verses",
        // Between Copy (200) and Share (300). "Cancel" is forced last by the
        // toolbar regardless of priority.
        priority: 250,
        title: {
          key: "compare",
          defaultValue: "Compare",
          ns: "compare-extension",
        },
        icon: CompareIcon,
        isVisible: (toolContext) =>
          toolContext.readingState.selectedVerses.value.length > 0,
        onSelect: (toolContext) => openComparePane(context, state, toolContext),
      });

      yield () => {
        context.panes.closePane(COMPARE_PANE_ID);
        state.dispose();
      };
    },
  });
}
