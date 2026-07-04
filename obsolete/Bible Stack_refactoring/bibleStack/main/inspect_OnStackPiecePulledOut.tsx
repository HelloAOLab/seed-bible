/**
 * Handles the event when a stack piece is pulled out. It triggers the update of stacks.
 *
 * @example
 * shout("OnStackPiecePulledOut");
 */

thisBot.PlaySound({ soundName: "StackPiecePulledOut" });
return thisBot.UpdateStacks();
