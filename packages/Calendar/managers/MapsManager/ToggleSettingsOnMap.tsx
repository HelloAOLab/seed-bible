const {mapData} = that;

const settingsElements = mapData.staticMapElements.settingsButtons.flatMap((button) => {
    
    switch(button.tags.buttonType)
    {
        case MapButtonType.CameraAnimationToggle: 
        case MapButtonType.ShowLabelsToggle: 
        case MapButtonType.PathToggle: 
        case MapButtonType.ChapterExpandToggle: 
        case MapButtonType.PlaylistPathToggle:
        case MapButtonType.ShowDatesToggle: return [button, button.links.background, button.links.handle]

        case MapButtonType.ColorPickerButton: return [button, button.links.colorContent, button.links.colorBackground]

        case MapButtonType.DateFormatSelectorButton:
        case MapButtonType.OpenAllBooksButton:
        case MapButtonType.PlaylistSelectorButton: return [button, button.links.buttonLabel, button.links.buttonIcon]
    }
})
const dimension = os.getCurrentDimension();
const duration = 0.25;
animateTag(mapData.staticMapElements.settingsButton, dimension + "RotationZ", null);
if(mapData.isShowingSettings)
{
    mapData.isShowingSettings = false
    animateTag(mapData.staticMapElements.settingsButton, dimension + "RotationZ", {
        toValue: Math.PI,
        duration,
        easing: {type: "sinusoidal", mode: "inout"}
    });
    setTag(settingsElements, dimension, false);
}
else
{
    mapData.isShowingSettings = true
    animateTag(mapData.staticMapElements.settingsButton, dimension + "RotationZ", {
        toValue: Math.PI*2,
        duration,
        easing: {type: "sinusoidal", mode: "inout"}
    });
    setTag(settingsElements, dimension, true);
}