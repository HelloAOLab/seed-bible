import type { HexString } from "bibleVizUtils.functions.index";

export interface ArrangementTemplate {
  name: string;
  id: string;
  testaments: {
    name: string;
    color: HexString;
    id: string;
    sections: {
      name: string;
      color: HexString;
      id: string;
      books: {
        name: string;
        color: HexString;
        id: string;
        explodedViewPosition?: {
          x: number;
          y: number;
          z: number;
        };
      }[];
    }[];
  }[];
}
