export const CHECKLIST_GIF_URL =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/90e85308635064b3d0fdaa9c220b8547a9467a10affe3cf22f06ad6b26fbf0a1.gif";

export interface ProjectModeMenuItem {
  label: string;
  value: string;
  icon: string;
}

export const PROJECT_MODE_MENU_ITEMS: ProjectModeMenuItem[] = [
  {
    label: "Hide headings",
    value: "hideHeadings",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0204f2dddf1829862226e8dbc8eba67af725c558e4cb178cadba1845ba0461ae.svg",
  },
  {
    label: "Close all books",
    value: "areBooksClosed",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/25ecc4b8e3d6c1cff940a50916700cec880aa61f711d0aba0e322ac65eb8b9a6.svg",
  },
  {
    label: "Project settings",
    value: "projectSettings",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/7243ffa90945dbd018d082a6c0be8f5424d8a521fe764185a30393e2e93d4401.svg",
  },
  {
    label: "Show version History",
    value: "showVersionHistory",
    icon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/ff32aa3f0cc2c96d07ab9308631bc835dec9dc11f0102950593e5d14a698840b.svg",
  },
];
