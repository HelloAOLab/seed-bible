const G = globalThis as Record<string, any>;

export const RECORDING_TYPES = {
  audio: "audio/webm",
  video: "video/mp4",
  link: "link",
} as const;

export const DEFAULT_PROFILE =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5ae46570b2daba6e99c5b71de2cf41cfd9dfaf46e04c9eb9344146955ddb9a31.svg";

export const DEFAULT_TOOLBAR_PRIORITY = [
  "mic",
  "video",
  "slash",
  "bold",
  "italic",
  "underline",
  "strikethrough",
  "superscript",
  "subscript",
  "align",
  "list",
  "line-spacing",
  "text-color",
  "bg-color",
  "paragraph",
  "font-family",
  "font-style",
  "font-size",
  "undo",
  "redo",
  "clear",
  "print",
  "margins-y",
  "margins-x",
  "link",
  "image",
  "download",
  "upload",
  "ai",
  "tune",
];

export const COMMAND_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/ce7430bae3a8fd021160a12806b2b82a5999a463b2bff278a96f922963fe5cfc.svg";

export const COMMAND_BOX_OPTIONS = [
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/95176265a3a33a0077c8b11b493470df3393acfc3ff5411c8fe45976d96be46d.svg",
    label: "Link",
    onClick: () => {
      G.ThruCommandBox = true;
      shout("startRecording", RECORDING_TYPES.link);
    },
  },
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/8b01074656e936022bbb1655a94e85ba3f9af15d2873d6bd16d01d07d66bdf8b.svg",
    label: "File",
    onClick: async () => {
      const files = await os.showUploadFiles();
      shout("onHandleDropFiles", { files, thruCommandBox: true });
    },
  },
  {
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/annotations/14c602cebbe4c6872c9fcf80015865c3b3f70391608bf58b92ad1cc8e068212c.svg",
    label: "Playlist",
    onClick: () => {
      G.ThruCommandBox = true;
      shout("togglePlaylistSuggestions");
    },
  },
];
