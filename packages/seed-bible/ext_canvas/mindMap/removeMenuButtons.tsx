const removeButton = getBots(byTag("removeButton"));
const deleteButton = getBots(byTag("deleteButton"));
const button2 = getBots(byTag("button2"));
const button3 = getBots(byTag("button3"));
const button4 = getBots(byTag("button4"));
const shareButton = getBots(byTag("shareButton"));
const aiSetting = getBots(byTag("aiSetting"));

for(let i = 0; i < removeButton.length; i++){
    clearAnimations(removeButton[i]);
    clearInterval(removeButton[i].masks.interval);
    clearInterval(removeButton[i].masks.interval2);
    destroy(removeButton[i])
}
for(let i = 0; i < deleteButton.length; i++){
    clearAnimations(deleteButton[i]);
    clearInterval(deleteButton[i].masks.interval);
    clearInterval(deleteButton[i].masks.interval2);
    destroy(deleteButton[i])
}
for(let i = 0; i < button2.length; i++){
    clearAnimations(button2[i]);
    clearInterval(button2[i].masks.interval);
    clearInterval(button2[i].masks.interval2);
    destroy(button2[i])
    
}
for(let i = 0; i < button3.length; i++){
    clearAnimations(button3[i]);
    clearInterval(button3[i].masks.interval);
    clearInterval(button3[i].masks.interval2);
    destroy(button3[i])
}

for(let i = 0; i < shareButton.length; i++){
    clearAnimations(shareButton[i]);
    clearInterval(shareButton[i].masks.interval);
    clearInterval(shareButton[i].masks.interval2);
    destroy(shareButton[i])
}

for(let i = 0; i < aiSetting.length; i++){
    clearAnimations(aiSetting[i]);
    clearInterval(aiSetting[i].masks.interval);
    clearInterval(aiSetting[i].masks.interval2);
    destroy(aiSetting[i])
}

destroy(button4);