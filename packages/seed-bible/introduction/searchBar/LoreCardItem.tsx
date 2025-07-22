const { LoreCardContentRenderer } = thisBot.LoreCardContentRenderer();
const AOLABSRC = "https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png";

const { useMemo } = os.appHooks;
const { GlassButton } = Components;
// - {dataItem[currentData].headingTeritary}
const LoreCardItem = ({dataItem, title , selectedCard, setSelectedCard, id, index, subCard, setSubCard})=>{

    const currentData = useMemo(()=> selectedCard===id ? subCard : 4, [subCard,selectedCard])

    return <div 
                className={`description__programming__card description__programming__card--${index} ${selectedCard===-3 && "startpoint"} ${(selectedCard===id) ? "target" : ""}  ${(selectedCard === -2)? "collected" : ""} ${selectedCard>-1 && "focus-out"}`} 
                id={`description__programming__card--${index}`}
            >
                <div className="description_card_front">
                    <p 
                        onClick={()=>{
                            if(selectedCard > -2){
                                setSelectedCard(id);
                                setSubCard(4);
                            }
                        }} 
                        style={{display: "flex", alignItems: 'center',padding: "1rem 2rem 0rem 2rem"}}
                    >
                        <h3 className="heading__teritary title">{title}</h3>
                    </p>
                    <div className="content">
                        {dataItem[currentData].contents.map(content=>
                            <LoreCardContentRenderer {...content} />
                        )}
                    </div>
                    <div className="description_card_front_footer">
                        {
                            dataItem.map(data=>
                            <GlassButton
                                key={data.id}
                                onClick={(e)=>{
                                    setSubCard(data.id);
                                }}
                                style={{
                                    backgroundColor: currentData === data.id && selectedCard === id ? "gold" : ""
                                }}
                            >
                                <span style={{fontSize: '18px'}} className="material-symbols-outlined">
                                    {data.sideIcon}
                                </span>
                            </GlassButton>)
                        }
                    </div>
                </div>
                <div className="description_card_back">
                    <div>
                        <img src={AOLABSRC} alt="AO" />
                    </div>
                </div>
            </div>
}

return {
    LoreCardItem
}