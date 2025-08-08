if(masks.to){
    clearTimeout(masks.to);
    masks.to = null;
}

if(masks.it){
    clearInterval(masks.it);
    masks.it = null;
}

setTagMask(thisBot, "clicking", false, "tempLocal");