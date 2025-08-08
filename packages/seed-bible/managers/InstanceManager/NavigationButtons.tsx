const NavigationButton = await thisBot.NavigationButton();

const NavigationButtons = ({navigationButtonsInfo}) => {
    
    return (
        <div className={`navigationButtonsContainer`}>
            { navigationButtonsInfo.map((buttonInfo) => {
                return <NavigationButton buttonInfo={buttonInfo}/>
            })}
        </div>
    )
}

return NavigationButtons;


// { showBackButton && <button 
//     className="navigationButton backButton" 
//     onClick={handleBackButtonClick}>{backContent}
// </button>}
// { showDeleteButton && <button 
//     className="navigationButton deleteButton" 
//     onClick={handleDeleteButtonClick}>Delete
// </button>}
// { showForwardButton && <button 
//     className="navigationButton forwardButton" 
//     onClick={handleForwardButtonClick}>
//     {forwardContent}
// </button> }