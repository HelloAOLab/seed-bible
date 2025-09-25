/**
 * Sets the activation state of Bible creation.
 * 
 * @param {Object} that - Object containing the necessary properties to execute the function.
 * @param {boolean} that.value - Indicates whether Bible creation is active.
 * 
 * @example
 * thisBot.SetStackCreationActive({ value: true });
 */

const {value} = that;
setTagMask(thisBot, 'isBibleCreationActive', value);