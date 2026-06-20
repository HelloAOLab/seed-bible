import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { TranscriptionManager } from "ext_AI_Transcript.main.transcriptionManager";
import { type SeedBibleState } from "seed-bible.app.api";

const ManagerContext = createContext<{
  transcriptionManager: TranscriptionManager;
  seedBibleState: SeedBibleState;
} | null>(null);

export function ManagerProvider({
  value,
  children,
}: {
  value: {
    transcriptionManager: TranscriptionManager;
    seedBibleState: SeedBibleState;
  };
  children: ComponentChildren;
}) {
  return (
    <ManagerContext.Provider value={value}>{children}</ManagerContext.Provider>
  );
}

/** Read the transcription manager from context (throws if no provider). */
export function useManager(): {
  transcriptionManager: TranscriptionManager;
  seedBibleState: SeedBibleState;
} {
  const tm = useContext(ManagerContext);
  if (!tm) throw new Error("useManager must be used within <ManagerProvider>");
  return tm;
}
