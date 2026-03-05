export class StackData {
  id: any;
  childrenData: any[];

  constructor({ childrenData = [], id }) {
    this.childrenData = childrenData;
    this.id = id;
  }
  AddChild(newChild) {
    this.childrenData.push(newChild);
  }
}
