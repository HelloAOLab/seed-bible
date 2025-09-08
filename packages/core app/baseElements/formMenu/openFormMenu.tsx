await os.unregisterApp('formMenu')
await os.registerApp('formMenu', thisBot)

const App = thisBot.getApp()

var pointerX = gridPortalBot.tags.pointerPixelX
var pointerY = gridPortalBot.tags.pointerPixelY

if(that.center){
    pointerX = "50vw";
    pointerY = "50dvh";
}else{
    pointerX = gridPortalBot.tags.pointerPixelX + "px"
    pointerY = gridPortalBot.tags.pointerPixelY + "px"
}
masks.selectedBot = that.id
os.compileApp('formMenu',
    <div onClick={() => whisper(thisBot, "closeFormMenu")} className="form-app-container" style={{position: 'absolute', left: `${pointerX}`, top: `${pointerY}`}}>
        <App chapter={that.chapter ? that.chapter : null} />
    </div>
);
