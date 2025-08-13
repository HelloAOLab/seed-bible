/**
    * Handles the pointer-up event on a stack element, setting the cursor style to "pointer".
    *
    * @param {Object} that - The context object containing the element.
    * @param {Object} that.element - The element on which the pointer-up event occurred.
    * @example
    * shout("OnStackElementPointerUp", {element: someElement});
*/

const {element} = that;
setTag(element,"cursor","pointer");