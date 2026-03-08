export class StackData<TChild> {
  #childrenData: TChild[];
  #id: string;

  constructor({
    childrenData = [],
    id,
  }: {
    childrenData?: TChild[];
    id: string;
  }) {
    this.#childrenData = childrenData;
    this.#id = id;
  }

  AddChild(newChild: TChild) {
    this.#childrenData.push(newChild);
  }

  get childrenData() {
    return [...this.#childrenData];
  }

  get id() {
    return this.#id;
  }
}
