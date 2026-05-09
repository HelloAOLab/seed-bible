let dim = os.getCurrentDimension();
const typingTool = getBot(byTag("typingTool"));

let textBars = getBots(byTag("textBar"));
for (let textBar of textBars) {
  destroy(textBar);
}

let textBar = create({
  textBar: true,
  space: "tempLocal",
  [dim]: true,
  [dim + "X"]: that.position.x,
  [dim + "Y"]: that.position.y,
  scaleX: 7,
  scaleY: 0.2,
  scaleZ: 0.1,
  onPointerEnter: `@
        tags.color = '#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
        animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.3,duration:0.3})
    `,
  onPointerExit: `@
        tags["color"] = "white" 
        animateTag(thisBot,"scaleZ",{fromValue:tags.scaleZ,toValue:0.1,duration:0.3})
    `,
  onCreate: `@
        let dim = os.getCurrentDimension();
        const typingTool = getBot(byTag("typingTool"));
        let textBars = getBots(byTag("textBar"));
        for(let textBar of textBars){
            textBar.tags.active = false;
            textBar.tags.strokeColor = "white";
        }
        tags.strokeColor = "#40C4FF";
        whisper(typingTool, "makeTextBox", {x: tags[dim + "X"], y: tags[dim + "Y"] + 0.8, id: tags.id});
    `,
  onClick: `@
        let textBars = getBots(byTag("textBar"));
        let textBox = getBot(byTag("id", tags.textBox));
        for(let textBar of textBars){
            textBar.tags.active = false;
            textBar.tags.strokeColor = "white";
        }
        tags.strokeColor = "#40C4FF";
        tags.active = true;
        whisper(textBox, "onClick");
    `,
  active: true,
  toErase: true,
});
