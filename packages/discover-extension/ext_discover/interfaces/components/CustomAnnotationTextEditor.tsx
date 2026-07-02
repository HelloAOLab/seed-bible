import type { Signal } from "@preact/signals";
import type { CustomAnnotationTextEditorManager } from "ext_discover.interfaces.managers.CustomAnnotationTextEditorManager";

export interface CustomAnnotationTextEditorProps {
  instanceId?: string;
  className?: string;
  style?: Record<string, any>;
  minHeight?: number;
  initialText?: string;
  initialHTML?: string;
  placeholderHTML?: string;
  readOnly?: boolean;
  priorityKey?: string;
  defaultPriority?: string[];
  onChange?: (html: string, json: object) => void;
  onAIHighlight?: (currentHTML: string) => Promise<string>;
  showMoreOptions?: boolean;
  headingControls?: boolean;
  id?: string;
  showPreview?: boolean;
  setShowPreview?: (value: boolean | ((prev: boolean) => boolean)) => void;
  isEditAddress?: any;
  manager?: CustomAnnotationTextEditorManager;
}

export type CustomAnnotationTextEditorExternal = Pick<
  CustomAnnotationTextEditorProps,
  | "instanceId"
  | "className"
  | "style"
  | "minHeight"
  | "initialText"
  | "initialHTML"
  | "placeholderHTML"
  | "readOnly"
  | "priorityKey"
  | "defaultPriority"
  | "onChange"
  | "onAIHighlight"
  | "showMoreOptions"
  | "headingControls"
  | "id"
  | "showPreview"
  | "setShowPreview"
  | "isEditAddress"
>;
