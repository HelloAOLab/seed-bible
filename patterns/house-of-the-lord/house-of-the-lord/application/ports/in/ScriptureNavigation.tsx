import type { VerseRange } from "../../../domain/models/scripture";

export interface ScriptureNavigationPort {
  navigate(range: VerseRange): void;
}
