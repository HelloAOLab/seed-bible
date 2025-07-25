
if(configBot.tags.systemPortal)
return
thisBot.main()
//
// destroy()
let localStorage = getBot('system', 'app.localStorage')
if (!localStorage)
    create({
        system: 'app.localStorage',
        space: 'local',
    })