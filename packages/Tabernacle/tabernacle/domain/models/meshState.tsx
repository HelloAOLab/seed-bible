export type MeshState = "Hidden" | "Shown" | "Translucent";

export const MeshStates: {
  [K in MeshState]: K;
} = {
  Hidden: "Hidden",
  Shown: "Shown",
  Translucent: "Translucent",
} as const;
