
if(configBot.tags.systemPortal)
return
thisBot.main()
//
// destroy()
const localStorage = getBot('system', 'app.localStorage')
if (!localStorage)
    create({
        system: 'app.localStorage',
        space: 'local',
    })