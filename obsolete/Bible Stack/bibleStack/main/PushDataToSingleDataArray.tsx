import { StackTestamentData } from "bibleVizUtils.models.entities.StackTestamentData";
const { data } = that;

switch (true) {
  case data instanceof StackTestamentData:
    thisBot.vars.singleTestamentsData.push(data);
    break;
  default:
    break;
}
