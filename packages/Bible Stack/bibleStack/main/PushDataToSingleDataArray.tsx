import {StackTestamentData} from 'thisBot.StackTestamentData'
const {data} = that;

switch(true)
{
    case data instanceof StackTestamentData:
        thisBot.vars.singleTestamentsData.push(data);
        break;
    default: break;
}