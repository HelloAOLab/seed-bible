const typingTool = getBot(byTag("typingTool"));
const controlBot = getBot(byTag("id", tags.controlBotId));
const controlIndexBot = getBot(byTag("id", controlBot.tags.indexBot));
if(tags.selecting){
    tags.selecting = false;
    tags.formAddress = tags.formAddresses[0];
}else{
    tags.selecting = true;
    os.toast("Please select a node")
    tags.selectedBot = [tags.controlBotId];
    tags.formAddress = tags.formAddresses[1];
}