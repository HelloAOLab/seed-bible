import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";

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

  addChild(newChild: TChild) {
    this.#childrenData.push(newChild);
  }
  clearChildren(): TChild[] {
    const clearedChildren = this.#childrenData;
    this.#childrenData = [];
    return clearedChildren;
  }
  tryReplaceChild(currChild: TChild, newChild: TChild): boolean {
    const index = this.#childrenData.indexOf(currChild);
    if (index >= 0) {
      this.#childrenData.splice(index, 1, newChild);
      return true;
    }
    return false;
  }

  resetHierarchy(): Bot[] {
    const piecesToRelease: Bot[] = [];

    this.childrenData.forEach((childData) => {
      const childArray = Array.isArray(childData) ? childData : [childData];

      childArray.forEach((currChildData) => {
        if (currChildData instanceof StackData) {
          piecesToRelease.push(...currChildData.resetHierarchy());
        }
      });
    });

    return piecesToRelease;
  }

  get childrenData() {
    return [...this.#childrenData];
  }

  getReversedChildren(): TChild[] {
    return this.childrenData.toReversed();
  }

  get id() {
    return this.#id;
  }
}
