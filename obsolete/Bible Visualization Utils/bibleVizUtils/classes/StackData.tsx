export class StackData {
  constructor({ childrenData = [], id }) {
    this.childrenData = childrenData;
    this.id = id;
  }
  AddChild(newChild) {
    this.childrenData.push(newChild);
  }
}
