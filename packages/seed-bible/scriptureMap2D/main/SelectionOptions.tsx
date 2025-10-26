export const SelectionOptions = ({handleDoneClick, handleClearSelectionClick}) => {

    return (
        <div className="selectionOptions">
            <button onClick={handleClearSelectionClick}>
                <span className="material-symbols-outlined">close</span>
                Clear selection
            </button>
            <div className="divider" ></div>
            <button onClick={handleDoneClick}>
                <span className="material-symbols-outlined">check</span>
                Done
            </button>
        </div>
    )
}