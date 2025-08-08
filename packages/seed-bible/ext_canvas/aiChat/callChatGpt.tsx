const currentAiBot = getBot(byTag('selectedAiBot', true));

if(currentAiBot && currentAiBot.masks?.label && currentAiBot.masks?.label !== ""){
    const aimessage = await ai.chat(that.text ? that.text :  currentAiBot.masks.label);
    return aimessage;
}