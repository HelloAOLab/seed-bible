/**
    * Increments the current arrangement index and resets it if it exceeds the number of available arrangements.
    * Displays a toast notification with the current arrangement name.
    * @example
    * StacksManager.CycleArrangementIndex();
*/

thisBot.vars.arrangementIndex++;
if(thisBot.vars.arrangementIndex >= InstanceManager.vars.fixedArrangementsInfo.length)
{
    thisBot.vars.arrangementIndex = 0;
}
os.toast(`Current selected arrangement: ${thisBot.GetCurrentArrangementName()}`);
console.log(`Current selected arrangement: ${thisBot.GetCurrentArrangementName()}`);