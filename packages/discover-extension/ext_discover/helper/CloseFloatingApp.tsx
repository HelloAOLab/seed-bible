export function CloseFloatingApp(that?: any) {
  const G = globalThis as any;
  if (G.Previous_ID_Floading_App_PL) {
    G.RemoveFloatingApp(G.Previous_ID_Floading_App_PL);
    G.Previous_ID_Floading_App_PL = null;
  }
}
