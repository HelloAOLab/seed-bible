import { VerseData } from "bibleVizUtils.domain.entities.VerseData";
import type { Piece } from "bibleVizUtils.domain.models.canvas";

interface DataParams {
  id: string;
  verses?: VerseData[];
  piece?: Piece<"VersesBundle">;
}

export class VersesBundleData {
  #id: DataParams["id"];
  #verses: Map<VerseData["id"], VerseData>;
  #piece: DataParams["piece"];
  #isSelected: boolean = false;
  #isBeingDragged: boolean = false;

  constructor({ verses = [], piece, id }: DataParams) {
    this.#verses = new Map(verses.map((verse) => [verse.id, verse]));
    this.#piece = piece;
    this.#id = id;
  }

  get id() {
    return this.#id;
  }
  get verses() {
    return Array.from(this.#verses).map(([, data]) => data);
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
}
