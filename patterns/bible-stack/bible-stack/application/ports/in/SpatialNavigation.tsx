export interface SpatialNavigationServicePort {
  handleUserStoppedNavigation(): Promise<void>;
}
