const Modal = thisBot.Modal();
const Button = thisBot.Button();
const { useState, useMemo } = os.appHooks;

// IStepData = {text: "",gifSrc: "", gifAlt: "",textElement: ElementNode,nextBtn: text, prevBtn: text,prevBtnAction: function, nextBtnAction: fcuntion}

const ModalStepper = ({stepData,css = "",isDisabledButtons = false,sxModal = {},sxBackdrop = {}}) => {

    const [step,setStep] = useState(0);

    const currStep = useMemo(()=> stepData[step || 0],[step])

    return <>
        {step !== stepData.length && <Modal backDropStyle={sxBackdrop} styles={sxModal} onClose={()=>{}} >
                <div className="welcome-copy">
                    {currStep.gifSrc && <img style={{height: '300px',display: 'block',margin: 'auto'}} alt={currStep.gifAlt || "GIF"} src={currStep.gifSrc} />}
                    <p>{currStep.text}</p>
                    {!!currStep.textElement && currStep.textElement}
                    <div className="buttons" style={{width: '100%'}}>
                        {currStep.prevBtn 
                            ? 
                                <Button isDisabled={isDisabledButtons} onClick={()=>{
                                    if (currStep.prevBtnAction) {
                                        currStep.prevBtnAction();
                                    } else {
                                        setStep(p=>p-1);
                                    }
                                }} backgroundColor="black">
                                    {currStep.prevBtn}
                                </Button> 
                            :
                                <p></p>
                        }
                        <Button isDisabled={isDisabledButtons} onClick={()=>{
                            if(currStep.nextBtnAction){
                                currStep.nextBtnAction();
                            } else {
                                setStep(p=>p+1);
                            }
                        }} backgroundColor="black">
                            {currStep.nextBtn ? currStep.nextBtn : step === stepData.length -1 ? "Begin" : "Next"} ➤
                        </Button>
                    </div>
                </div>
        </Modal>}
        <style>{css}</style>
    </>
}

return ModalStepper