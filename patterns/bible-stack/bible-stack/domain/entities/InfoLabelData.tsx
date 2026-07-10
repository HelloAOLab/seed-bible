import type { Piece, ActivityIndicator } from "../models/canvas";
import type { LabelPosition } from "../models/label";

interface InfoLabelDataProps {
  id: string;
  transformer: Piece<"InfoLabelTransformer">;
  tail: Piece<"InfoLabelTail">;
  label: Piece<"InfoLabelText">;
  date?: Piece<"InfoLabelDate">;
  activityIndicators?: Map<ActivityIndicator["id"], ActivityIndicator>;
  owner: Piece;
  positioning: LabelPosition;
}

export class InfoLabelData {
  #id: InfoLabelDataProps["id"];
  #transformer: InfoLabelDataProps["transformer"];
  #tail: InfoLabelDataProps["tail"];
  #label: InfoLabelDataProps["label"];
  #activityIndicators: NonNullable<InfoLabelDataProps["activityIndicators"]>;
  #date: InfoLabelDataProps["date"];
  #owner: InfoLabelDataProps["owner"];
  #positioning: InfoLabelDataProps["positioning"];
  #isHiding: boolean = false;

  constructor({
    id,
    transformer,
    tail,
    label,
    activityIndicators = new Map(),
    date,
    owner,
    positioning,
  }: InfoLabelDataProps) {
    this.#id = id;
    this.#transformer = transformer;
    this.#tail = tail;
    this.#label = label;
    this.#activityIndicators = activityIndicators;
    this.#date = date;
    this.#owner = owner;
    this.#positioning = positioning;
  }

  get id() {
    return this.#id;
  }
  get transformer() {
    return this.#transformer;
  }
  getTransformerProperty<K extends keyof InfoLabelDataProps["transformer"]>(
    key: K
  ): InfoLabelDataProps["transformer"][K] {
    return this.#transformer[key];
  }
  getTailProperty<K extends keyof InfoLabelDataProps["tail"]>(
    key: K
  ): InfoLabelDataProps["tail"][K] {
    return this.#tail[key];
  }
  getTextProperty<K extends keyof InfoLabelDataProps["label"]>(
    key: K
  ): InfoLabelDataProps["label"][K] {
    return this.#label[key];
  }
  get tail() {
    return this.#tail;
  }
  get label() {
    return this.#label;
  }
  get activityIndicators() {
    return [...this.#activityIndicators.values()];
  }
  clearActivityIndicators() {
    if (this.#activityIndicators.size > 0) {
      const indicators = [...this.#activityIndicators.values()];
      this.#activityIndicators.clear();
      return indicators;
    }
    return undefined;
  }
  addActivityIndicator(indicator: ActivityIndicator) {
    if (this.#activityIndicators.has(indicator.id)) {
      this.#activityIndicators.set(indicator.id, indicator);
    }
  }
  removeActivityIndicator(indicatorId: ActivityIndicator["id"]) {
    this.#activityIndicators.delete(indicatorId);
  }
  get date() {
    return this.#date;
  }
  clearDate() {
    if (this.#date) {
      const currDate = this.#date;
      this.#date = undefined;
      return currDate;
    }
    return undefined;
  }
  get owner() {
    return this.#owner;
  }
  getOwnerProperty<K extends keyof InfoLabelDataProps["owner"]>(
    key: K
  ): InfoLabelDataProps["owner"][K] {
    return this.#owner[key];
  }
  get positioning() {
    return this.#positioning;
  }
  changePositioning(newPositioning: LabelPosition) {
    this.#positioning = newPositioning;
  }
  get isHiding() {
    return this.#isHiding;
  }
  beginHiding() {
    this.#isHiding = true;
  }
  endHiding() {
    this.#isHiding = false;
  }
}
