import { TimeProvider } from "scriptureMap2D.main.TimeContext";
import { ScriptureMap2DProvider } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ScriptureMap2DWrapper } from "scriptureMap2D.main.ScriptureMap2DWrapper";
import { ReadingHistoryProvider } from "scriptureMap2D.contexts.RadingHistory.ReadingHistoryContext";
import { ScriptureMap2DModes } from "scriptureMap2D.main.enums";
import type { ScriptureMap2DConfig } from "scriptureMap2D.main.interfaces";
const { memo } = os.appCompat;

type ScriptureMap2DProps = {
  config: ScriptureMap2DConfig;
};

export const ScriptureMap2D = memo<
  (args: ScriptureMap2DProps) => React.JSX.Element | null
>(({ config }) => {
  const { mode, project } = config;

  if (mode === ScriptureMap2DModes.Project && !project) return null;

  return (
    <>
      <style>{thisBot.tags["ScriptureMap2D.css"]}</style>
      <TimeProvider>
        <ScriptureMap2DProvider config={config}>
          <ReadingHistoryProvider>
            <ScriptureMap2DWrapper />
          </ReadingHistoryProvider>
        </ScriptureMap2DProvider>
      </TimeProvider>
    </>
  );
});
