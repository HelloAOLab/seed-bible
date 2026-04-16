import type {
  Piece,
  ActivityIndicator,
} from "bibleVizUtils.domain.models.canvas";

interface InfoLabelDataProps {
  id: string;
  transformer: Piece<"InfoLabelTransformer">;
  tail: Piece<"InfoLabelTail">;
  label: Piece<"InfoLabelText">;
  date?: Piece<"InfoLabelDate">;
  activityIndicators?: Map<ActivityIndicator["id"], ActivityIndicator>;
  owner: Piece;
}

export class InfoLabelData {
  #id: InfoLabelDataProps["id"];
  #transformer: InfoLabelDataProps["transformer"];
  #tail: InfoLabelDataProps["tail"];
  #label: InfoLabelDataProps["label"];
  #activityIndicators: NonNullable<InfoLabelDataProps["activityIndicators"]>;
  #date: InfoLabelDataProps["date"];
  #owner: InfoLabelDataProps["owner"];

  constructor({
    id,
    transformer,
    tail,
    label,
    activityIndicators = new Map(),
    date,
    owner,
  }: InfoLabelDataProps) {
    this.#id = id;
    this.#transformer = transformer;
    this.#tail = tail;
    this.#label = label;
    this.#activityIndicators = activityIndicators;
    this.#date = date;
    this.#owner = owner;
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
  }
  get owner() {
    return this.#owner;
  }
  getOwnerProperty<K extends keyof InfoLabelDataProps["owner"]>(
    key: K
  ): InfoLabelDataProps["owner"][K] {
    return this.#owner[key];
  }
}
