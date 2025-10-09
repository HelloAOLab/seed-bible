if (configBot.tags.systemPortal)
    return


import { VoiceAssistantProvider } from 'aiApps.voiceAssistant.VoiceAssistant';
import { AOBotInterface } from 'ao.starter.app'

const { render } = os.appHooks;



// os.compileApp('app', <VoiceAssistantProvider> <AOBotInterface /> </VoiceAssistantProvider>)

if (configBot.tags.systemPortal) return
configBot.tags.gridPortal = null;
const App = <>

    <VoiceAssistantProvider>
        <AOBotInterface />
    </VoiceAssistantProvider>
</>
render(<App />, document.body)
// document.body.style.overscrollBehavior = 'none';
os.hideLoadingScreen()

// const res = await web.get('https://bible.helloao.org/api/BSB/books.json')
// console.log(res)
// tags.books = res.data.books 