import type { AudioPlayerManager } from "ext_discover.interfaces.managers.AudioPlayerManager";

export interface AudioPlayerProps {
  mediaURL?: string;
  secondaryClose?: boolean;
  close?: boolean;
  style?: Record<string, any>;
  fileName?: string;
  shadow?: boolean;
  scope?: string;
  manager?: AudioPlayerManager;
}
