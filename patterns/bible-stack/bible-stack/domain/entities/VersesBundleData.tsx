import { VerseData } from "./VerseData";
import type { Piece, VersesBundleCreationParams } from "../models/canvas";
import type { HexString } from "../models/commonTypes";

interface DataParams {
  id: string;
  verses?: VerseData[];
  piece?: Piece<"VersesBundle">;
  creationParams: VersesBundleCreationParams;
}

export class VersesBundleData {
  #id: DataParams["id"];
  #verses: Map<VerseData["id"], VerseData>;
  #piece: DataParams["piece"];
  #isSelected: boolean = false;
  #isBeingDragged: boolean = false;
  #creationParams: DataParams["creationParams"];
  #paintColor: HexString | undefined;

  constructor({ verses = [], piece, id, creationParams }: DataParams) {
    this.#verses = new Map(verses.map((verse) => [verse.id, verse]));
    this.#piece = piece;
    this.#id = id;
    this.#creationParams = creationParams;
  }

  get id() {
    return this.#id;
  }
  get verses() {
    return Array.from(this.#verses).map(([, data]) => data);
  }
  getReversedVerses(): VerseData[] {
    return this.verses.toReversed();
  }
  get piece() {
    return this.#piece;
  }
  clearPiece() {
    const piece = this.#piece;
    this.#piece = undefined;
    return piece;
  }
  setPiece(piece: Piece<"VersesBundle">) {
    this.#piece = piece;
  }
  clearVerses() {
    const verses = this.verses;
    if (this.#verses.size > 0) {
      this.#verses = new Map();
    }
    return verses;
  }
  addVerse(verse: VerseData) {
    if (!this.#verses.has(verse.id)) {
      this.#verses.set(verse.id, verse);
    }
  }
  removeVerse(verse: VerseData) {
    if (this.#verses.has(verse.id)) {
      this.#verses.delete(verse.id);
    }
  }
  select() {
    this.#isSelected = true;
  }
  deselect() {
    this.#isSelected = false;
  }
  get isSelected() {
    return this.#isSelected;
  }
  get isBeingDragged() {
    return this.#isBeingDragged;
  }
  beginDrag() {
    this.#isBeingDragged = true;
  }
  endDrag() {
    this.#isBeingDragged = false;
  }
  get paintColor() {
    return this.#paintColor;
  }
  paint(color: HexString) {
    this.#paintColor = color;
  }
  unpaint() {
    this.#paintColor = undefined;
  }
  getCreationParam<K extends keyof VersesBundleCreationParams>(
    key: K
  ): VersesBundleCreationParams[K] {
    return this.#creationParams[key];
  }
}
