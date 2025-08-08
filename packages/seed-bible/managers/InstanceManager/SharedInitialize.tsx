/**
 * Initializes the InstanceManager's features that are intended to be handled in a shared context. 
 * This function checks if the manager has already been initialized in shared space,
 * and if not, 
 *
 * @example
 * InstanceManager.Initialize();
 */

await os.sleep(1);

if(thisBot.masks.sharedInitialized) return;
setTagMask(thisBot, "sharedInitialized", true, "shared");

setTagMask(thisBot, "usersLastSelection", [], 'shared')