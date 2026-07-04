const layoutMeasurements = {
  /**
   * Maximum number of columns for the 2D book grid.
   * Ported from `Book2DMaxColumns` in the old Scripture Map 3D measurements.
   */
  BookMaxColumns: 5,
} as const;

export type LayoutMeasurements = typeof layoutMeasurements;

export class LayoutConfigProvider {
  getLayoutMeasurements(): LayoutMeasurements {
    return layoutMeasurements;
  }

  getLayoutMeasurement<K extends keyof LayoutMeasurements>(
    measurement: K
  ): LayoutMeasurements[K] {
    return layoutMeasurements[measurement];
  }
}
