if(!globalThis.Components) return;
const {FloatingBanner} = Components;

os.unregisterApp("selectBookMessage");
os.registerApp("selectBookMessage");

const InfoMessage = ()=> <FloatingBanner>
        <p>Great! <b>Let's pick a book.</b></p>
        {thisBot.tags.GAME_MODE === globalThis.GAME_MODES.HOTSEAT && <p>Make sure <b>no else is watching!</b></p>}
    </FloatingBanner>;

const manageBot = getBot("system","introduction.searchBar");
manageBot.HideAndSeekSideBar();

os.compileApp("selectBookMessage",<InfoMessage/>);