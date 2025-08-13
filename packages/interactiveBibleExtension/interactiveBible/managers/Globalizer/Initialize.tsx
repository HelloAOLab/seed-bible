/**
    * Called when an instance is first loaded from @onEggHatch and/or from @onInstJoinded.
    * Here is called the function to globalize important constants and functions
    * @example
    * thisBot.Initialize();
*/

if(thisBot.masks.initialized) return;

setTagMask(thisBot, "initialized", true);

// while(!globalThis.StacksManager)
// {
//     await os.sleep(50);
// }

await thisBot.DefineGlobals();