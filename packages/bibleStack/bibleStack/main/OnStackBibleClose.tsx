/**
    * Handles the event when the Bible is closed by deselecting the currently selected book.
    *
    * @example
    * shout("OnStackBibleClose");
*/

if(thisBot.vars.currentSelectedBookData)
{
    thisBot.vars.currentSelectedBookData.isSelected = false;
    thisBot.vars.currentSelectedBookData = null;
}