import "./ReadingPlansPane.css";
import type { ReadingPlansManager } from "../../managers/ReadingPlansManager";
interface ReadingPlansPaneProps {
  readingPlans: ReadingPlansManager;
}
/**
 * Pane content for reading plans. Shows the user's plans (with a button to
 * start authoring a new one) and the create-plan form screen.
 */
export declare function ReadingPlansPane(
  props: ReadingPlansPaneProps
): import("preact").JSX.Element;
export {};
