/**
    * Updates the position of a dragged stack element based on the provided drag information.
    * The function sets the position of the element in the current dimension.
    *
    * @param {Object} that - The context object containing the element and its drag information.
    * @param {Object} that.element - The element being dragged.
    * @param {Object} that.dragInfo - The information related to the drag action, including target coordinates.
    * @param {Object} that.data - The data associated with the element.
    * @example
    * shout('OnStackElementDragging', {element: someStackElement, data: someStackElementData, dragInfo: someDragInfo})
*/

const {element, dragInfo} = that;
if(!element.masks.isBeingDragged) return;
const dimension = os.getCurrentDimension();
setTagMask(element, dimension + "X", dragInfo.to.x);
setTagMask(element, dimension + "Y", dragInfo.to.y);
setTagMask(element, dimension + "Z", 0);