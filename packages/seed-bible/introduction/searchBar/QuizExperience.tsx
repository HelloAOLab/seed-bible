const { useState, useEffect, useCallback } = os.appHooks;
const { Modal, Button } = Components;
const AOLABSRC = "https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png";

const App = () => {

    const [quizData, setQuizData] = useState(null);

    const [points, setPoints] = useState(null);

    const [loading, setLoading] = useState(true);

    const [gameRunning, setGameRunning] = useState(false);

    const init = useCallback(() => {
        setLoading(true);
        setPoints(null);
        Promise.resolve(thisBot.getQuizData()).then(e => {
            setQuizData([...e]);
            setLoading(false);
            setGameRunning(true);
        });
    }, [])

    useEffect(() => {
        init();
    },[]);

    const handleCheck = useCallback(({index, subIndex, event}) => {
        if(!gameRunning){
            return
        }
        let tempQuiz = [...quizData];
        if(event){
            tempQuiz[index].options[0]["selected"] = event.target.value;
            tempQuiz[index].attempted = true;
            setQuizData([...tempQuiz]);
            return
        }
        for(let i = 0; i < tempQuiz[index].options.length; i++){
            tempQuiz[index].options[i]["selected"] = false;
        }
        tempQuiz[index].options[subIndex]["selected"] = true;
        tempQuiz[index].attempted = true;
        setQuizData([...tempQuiz]);
    }, [gameRunning, quizData])

    const checkAttempt = useCallback(() => {
        let attemptedAll = true;
        for(let i = 0; i < quizData.length; i++){
            if(!quizData[i]?.attempted){
                attemptedAll = false;
                break
            }
        }
        return attemptedAll;
    }, [quizData])

    const handleSetPoints = useCallback(() => {
        if(!checkAttempt()){
            os.toast("Please attempt all the questions!")
            return
        }
        setGameRunning(false);
        let tempPoints = 0;
        for(let i = 0; i < quizData.length; i++){
            let correct = false;
            for(let j = 0; j < quizData[i].options.length; j++){
                if(
                    (quizData[i].options[j]["selected"] &&
                    quizData[i].options[j].v.toLowerCase() === quizData[i].answer.toLowerCase()) ||
                    (
                        typeof(quizData[i].options[j]["selected"]) === "string" && quizData[i].options[j]["selected"].toLowerCase() === quizData[i].answer.toLowerCase()
                    )
                    ){
                    correct = true;
                    break
                }
            }
            if(correct){
                tempPoints += 10;
            }
        }
        setPoints(tempPoints);
    }, [checkAttempt, quizData])

    return (
        <>
            <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            <style>{tags['Quiz.css']}</style>
            <style>{tags['confetti.css']}</style>
            <style>{tags['confetti.scss']}</style>
            <div class="experience-container">
                <div class="experience_title_container">
                    <div class="experience_title_intro">
                        <span class="material-symbols-outlined experience_title_icon">
                            quiz
                        </span>
                        <span class="experience_title">Quiz Demo</span>
                    </div>
                    <button onClick={() => setCurrentExperience(1)} class="experience_title_back">
                        <span class="material-symbols-outlined">
                            arrow_back
                        </span>
                    </button>
                </div>
                <div 
                    className={`app-container`}
                    id="app-container"
                    onPointerEnter={() => gridPortalBot.tags.portalZoomable = false}
                    onPointerLeave={(e) => {
                        if (e.currentTarget.id == "app-container"){
                            gridPortalBot.tags.portalZoomable = true
                        }
                    }}
                    >
                    <div style={{width: '100%'}}>
                        <div class="quiz-container" style={{height: "100%"}}>
                            {
                                loading && <div style={{display: "grid", placeItems: 'center', height: '100%',width: '100%'}}>
                                    <img src={AOLABSRC} alt="AO" className="img-loader" />
                                </div>
                            }
                            {
                                !loading && quizData && quizData.map((quiz, index) => {
                                    return <>
                                    <div class="ques" key={index}>
                                        <span>
                                            {
                                                `${index + 1}). `
                                            }
                                        </span>
                                        <span>
                                            {
                                                quiz.question
                                            }
                                        </span>
                                        <div>
                                            <OptionComponent options={quiz.options} handleCheck={handleCheck} index={index} points={points} quiz={quiz} />
                                        </div>
                                    </div>
                                    <br />
                                    </>
                                })
                            }
                            {
                                !loading && (points ? <div class="points">
                                        <span>{points/10} / 5 correct</span>
                                        <span onClick={init} class="material-symbols-outlined">
                                            restart_alt
                                        </span>
                                    </div> : <button class="result-btn" onClick={() => handleSetPoints()}>
                                    Submit
                                </button>)
                            }
                        </div>
                    </div>
                </div>
            </div>
            {
                points && quizData && points === quizData.length * 10 && <div className="wrapper">
                        <Confetti />
                    </div>
            }
        </>
    )


}

const OptionComponent = ({options, handleCheck, index, points, quiz}) => {
    const [optionType, setOptionType] = useState(null);
    let optionsNum = {
        "1": "a",
        "2": "b",
        "3": "c",
        "4": "d"
    }
    useEffect(() => {
        if(options[0].v === "" && options[1].v === "" && options[2].v === "" && options[3].v === ""){
            setOptionType("input")
        }else{
            setOptionType("mcq")
        }
    }, [])

    const determineColor = ({option}) => {
        if(points){
            if( option.selected){
                if(option.v === quiz.answer){
                    return "#64FFDA"
                }else{
                    return "#FF5252"
                }
            }else{
                if(option.v === quiz.answer){
                    return "#64FFDA"
                }else{
                    return "transparent"
                }
            }
        }else{
            if(option.selected){
                return 'rgb(0, 230, 118)'
            }else{
                return 'transparent'
            }
        }
    }

    return <>
        {
            optionType === "mcq" && options.map((option, subIndex) => {
                return <div
                        style={{
                            backgroundColor: determineColor({option}),
                        }}
                        class="option smoothTrans" key={subIndex} onClick={() => {handleCheck({index: index, subIndex: subIndex})}}>
                            <div>
                                <span>{`${optionsNum[`${subIndex + 1}`]}. `}</span>
                                <span>
                                    {option.v}
                                </span>
                            </div>
                            <div
                                class="smoothTrans"
                                style={{
                                    height: "16px",
                                    width: "16px",
                                    backgroundColor: option.selected ? "#00E676" : "white",
                                    border: "1px solid black",
                                    borderRadius: "5px"
                                }}
                            />
                        </div>
            })
        }
        {
            optionType === "input" && <div class="quiz-input-container">
                <input
                    class="smoothTrans"
                    onChange={e => handleCheck({index: index, event: e})}
                    style={{
                        height: "40px",
                        fontSize: "16px",
                        padding: "10px",
                        backgroundColor: points &&
                                        typeof(quiz.options[0].selected) === "string" && quiz.options[0].selected.toLowerCase() === quiz.answer.toLowerCase() ?
                                        "#64FFDA"
                                        : points &&
                                        typeof(quiz.options[0].selected) === "string" && quiz.options[0].selected.toLowerCase() !== quiz.answer.toLowerCase() ?
                                        "#FF5252" : "white",
                        width: "100%",
                        marginTop: "5px",
                        borderRadius: "5px"
                    }}
                    disabled={points}
                    />
                {
                    points && quiz.options[0].selected.toLowerCase() !== quiz.answer.toLowerCase() && <span class="right-input">
                        {quiz.answer}
                    </span>
                }
            </div>
        }
    </>
}

const Confetti = () => {
    let numberArr = []

    for (var i = 0; i < 149; i++) {
        numberArr.push(i)
    }
    
    return (
        <>{numberArr.map(num => <div className={`confetti-${num}`} />)}</>
    )
}

return App