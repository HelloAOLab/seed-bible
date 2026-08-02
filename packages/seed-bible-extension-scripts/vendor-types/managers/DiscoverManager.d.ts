import type { JSX, VNode } from "preact";
export interface DiscoverContext {
  translationId: string;
  book: string;
  chapter: number;
  language: string;
}
export interface DiscoverReference {
  book: string;
  chapter: number;
  endChapter?: number;
  verse?: number;
  endVerse?: number;
}
export type DiscoverResult =
  | DiscoverContentResult
  | DiscoverCrossReferenceResult
  | DiscoverStudyNoteResult;
export interface DiscoverContentResult {
  type: "content";
  title: string;
  description: string;
  reference: DiscoverReference;
  content: JSX.Element | VNode;
}
export interface DiscoverCrossReferenceResult {
  type: "cross-reference";
  reference: DiscoverReference;
  crossReference: DiscoverReference;
}
export interface DiscoverStudyNoteResult {
  type: "study-note";
  reference: DiscoverReference;
  content: JSX.Element | VNode;
}
export interface DiscoverProvider {
  id: string;
  title: string;
  description: string;
  discover: (
    context: DiscoverContext
  ) => Promise<DiscoverResult[]> | DiscoverResult[];
}
export interface DiscoverProviderResults {
  providerId: string;
  results: DiscoverResult[];
}
export interface DiscoverManager {
  registerDiscoverProvider: (provider: DiscoverProvider) => void;
  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
}
export declare function createDiscoverManager(): DiscoverManager;
