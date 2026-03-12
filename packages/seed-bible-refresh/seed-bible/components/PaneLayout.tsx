import { BibleReader } from "seed-bible.components.BibleReader";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane, PaneLayoutId } from "seed-bible.managers.PanesManager";

interface PaneLayoutProps {
  panes: Pane[];
  layout: PaneLayoutId;
  selectedPaneId: string | null;
  selectorState: BibleSelectorState;
  onSelectPane: (paneId: string) => void;
}

export function PaneLayout(props: PaneLayoutProps) {
  const { panes, layout, selectedPaneId, selectorState, onSelectPane } = props;

  return (
    <div className="sb-panes-layout" data-layout={layout}>
      {panes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          onClick={() => onSelectPane(pane.id)}
        >
          {pane.tab ? (
            <div className="sb-pane-reader">
              <BibleReader
                readingState={pane.tab.readingState}
                selectorState={selectorState}
              />
            </div>
          ) : (
            <div className="sb-pane-empty">(empty)</div>
          )}
        </div>
      ))}
    </div>
  );
}
