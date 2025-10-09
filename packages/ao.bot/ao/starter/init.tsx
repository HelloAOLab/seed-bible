if(configBot.tags.systemPortal)
return
import {VoiceAssistantProvider} from 'aiApps.voiceAssistant.VoiceAssistant';

const {render} = os.appHooks;


import { AOBotInterface } from 'ao.starter.app'

// os.compileApp('app', <VoiceAssistantProvider> <AOBotInterface /> </VoiceAssistantProvider>)

if (configBot.tags.systemPortal) return
configBot.tags.gridPortal = null;
render(<>
    <style>{tags['App.css']}</style>
    <VoiceAssistantProvider>
        <AOBotInterface /> 
    </VoiceAssistantProvider>
</>, document.body)
document.body.style.overscrollBehavior = 'none';
os.hideLoadingScreen()

// const res = await web.get('https://bible.helloao.org/api/BSB/books.json')
// console.log(res)
// tags.books = res.data.books 