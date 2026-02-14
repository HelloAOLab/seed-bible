// create a geoJSON interface for type checking
export interface GeoJSONInterface {
  type: string;
  features: FeatureInterface[];
  metadata?: {
    [key: string]: any;
  };
}

export interface FeatureInterface {
  type: string;
  geometry: GeometryInterface;
  properties: {
    [key: string]: any;
  };
}

export interface GeometryInterface {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}
