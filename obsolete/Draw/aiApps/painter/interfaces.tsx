export interface Stroke {
  color: string;
  size: number;
  points: { x: number; y: number }[];
  timestamp: number;
}
