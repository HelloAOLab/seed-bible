const css = thisBot.tags["ShowExperiences.css"];

const { useMemo } = os.appHooks;

const experiences = [
    {
        experience_name: "Bible Locations",
        google_icon: "map",
        experience_id: 2
    },
    {
        experience_name: "Quiz Game",
        google_icon: "quiz",
        experience_id: 3
    },
    {
        experience_name: "Chiasm Demo",
        google_icon: "landscape",
        experience_id: 4,
        quickAction: getBot('system', 'main.chaismTool').createTool
    },
    {
        experience_name: "Lore Card",
        google_icon: "playing_cards",
        experience_id: 5,
        quickAction: thisBot.ShowLoreCards
    },
    {
        experience_name: "Guessing Game",
        google_icon: "action_key",
        experience_id: 6,
        quickAction: thisBot.PlayHideAndSeek
    },
    {
        experience_name: "Hotter or Colder?",
        google_icon: "radio_button_checked",
        experience_id: 7,
        quickAction: getBot('system', 'main.geoGuessGame').initGeoGame
    },
    {
        experience_name: "Land Between",
        google_icon: "globe",
        experience_id: 8,
        quickAction: thisBot.tryToInitLandBetweenExperience
    }
]

const ShowExperiences = () => {
    const visitedExp = useMemo(()=>{
        if(getVisitedExperince) {
            return getVisitedExperince();
        }else {
            return []
        }
    },[]);

    return <div class="experience-container">
        <style>{css}</style>
        <div class="experience_title_container">
            <div class="experience_title_intro">
                <img class="experience_title_icon" width={24} height={24} src="https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png"/>
                <span class="experience_title">Demo Experiences</span>
            </div>
            <button onClick={() => setCurrentExperience(0)} class="experience_title_back">
                <span class="material-symbols-outlined">
                    arrow_back
                </span>
            </button>
        </div>
        <div class="experiences">
            {
                experiences && experiences.map(experience => {
                    return <span class={`experience_btn ${visitedExp.findIndex(exp=>exp===experience.experience_id) > -1 ? "visited" : ""}`}  onClick={() => {
                        if(globalThis.demoInteractionWait) return;
                        if(addExperienceVisited) {
                            addExperienceVisited(experience.experience_id);
                        }
                        if(experience.experience_id=== 2){
                            // shout('onBibleLocationClick')
                        }
                        else if(experience.experience_id=== 3){
                           shout('onQuizGameClick')
                        }
                        else if(experience.experience_id=== 4){
                        //    shout('onChiasmTool')
                        }
                         else if(experience.experience_id=== 5){
                        //    shout('onLoreCards')
                        }
                        if(experience.quickAction){
                            shout("closeShareButton");
                            console.log("quickAction")
                            setOpenSidebar(false);
                            setCurrentExperience(1);
                            updateCustomHeight(0)
                            experience.quickAction();
                            return;
                        }
                        setCurrentExperience(experience.experience_id)
                    }}>
                        <span class="material-symbols-outlined experience_btn_icon">
                            {experience.google_icon}
                        </span>
                        {experience.experience_name}
                    </span>
                })
            }
        </div>
    </div>
}

return ShowExperiences