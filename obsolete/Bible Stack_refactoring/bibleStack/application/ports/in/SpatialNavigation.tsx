export interface SpatialNavigationPort {
  handleUserStoppedNavigation(): Promise<void>;
}
