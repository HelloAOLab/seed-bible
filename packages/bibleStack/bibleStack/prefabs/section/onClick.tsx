const {modality} = that;
shout("OnSectionInteracted", {section: thisBot, typeOfInteraction: (modality === ClickModality.touch ? StackElementInteractionType.Tap : StackElementInteractionType.Click)});