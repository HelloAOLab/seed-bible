


os.log(that, 'app')

if (that.buttonId === 'left') {
    isAbleToRightClick.leftClickAction()
    return
}
import { DualScreenIcon, ThreeScreenIcon, QuadScreenIcon, SingleScreenIcon, MenuIcon } from 'app.components.icons'
const MenuOptions = {
    type: 'normal', items: [
        { icon: <MenuIcon name="logout" />, title: 'Join a Lobby', onClick: () => { } },
        { type: 'line' },
        { icon: <MenuIcon name="search" />, title: 'Search', onClick: () => { } },
        { icon: <MenuIcon name="extension" />, title: 'Extensions', onClick: () => { } },
        { type: 'line' },
        { icon: <MenuIcon name="bug_report" />, title: 'Report a bug', onClick: () => { } },
        { icon: <MenuIcon name="help" />, title: 'Help', onClick: () => { } },
    ]
};

openPopupSettings(MenuOptions)