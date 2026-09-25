import type { VerseRange } from "../../../domain/models/scripture";

export interface ScriptureNavigationAdapterPort {
  navigate(range: VerseRange): void;
}
