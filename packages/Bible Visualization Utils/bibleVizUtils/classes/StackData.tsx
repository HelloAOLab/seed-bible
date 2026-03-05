export class StackData {
  id: any;
  childrenData: any[];

  constructor({ childrenData = [], id }) {
    this.childrenData = childrenData;
    this.id = id;
  }
  AddChild(newChild: any) {
    this.childrenData.push(newChild);
  }
}
