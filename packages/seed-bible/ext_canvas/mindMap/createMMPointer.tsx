const dim = os.getCurrentDimension();
const pointer = create({
    [dim]: true,
    [dim + "X"]: configBot.tags.mousePointerPosition.x,
    [dim + "Y"]: configBot.tags.mousePointerPosition.y,
    onCreate: tags.mmPointerOnCreate,
    onGridClick: tags.mmPointerOnGridClick,
    form: "sphere",
    space: "tempLocal",
    color: "#000000"
})

animateTag(pointer, {
    fromValue: {
        [dim + "X"]: pointer.tags[dim + "X"],
        [dim + "Y"]: pointer.tags[dim + "Y"]
    },
    toValue: {
        [dim + "X"]: configBot.tags.mousePointerPosition.x,
        [dim + "Y"]: configBot.tags.mousePointerPosition.y,
    },
    duration: 0.1
})

os.toast("place the light to drop mind map")