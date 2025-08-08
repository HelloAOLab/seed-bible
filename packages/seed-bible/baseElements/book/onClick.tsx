const {modality} = that;
shout("OnBookInteracted", {book: thisBot, typeOfInteraction: (modality === ClickModality.touch ? StackElementInteractionType.Tap : StackElementInteractionType.Click)});