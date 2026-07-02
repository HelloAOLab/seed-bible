export interface RenderLinkContentItem {
  content: string;
  additionalInfo: {
    type: string;
    link: string;
    videoId?: string;
  };
  skipEmbed?: boolean;
  isFirstItem?: boolean;
  isLastItem?: boolean;
}
