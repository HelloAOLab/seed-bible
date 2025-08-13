import {TestamentData} from 'StacksManager.TestamentData'
const {data} = that;

switch(true)
{
    case data instanceof TestamentData:
        thisBot.vars.singleTestamentsData.push(data);
        break;
    default: break;
}