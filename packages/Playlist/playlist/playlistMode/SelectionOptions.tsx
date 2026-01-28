const RenderIcon = await thisBot.RenderIcon();
const { LoaderSecondary } = Components;

const SelectionOptions = ( { handleClose, options, isPlaylist = false, onClickOption, loading = false } ) => {

    const onClick = (option:any) => {
        if(onClickOption) {
            onClickOption(option);
        } else if(option.onClick) {
            option.onClick(option);
        }
        handleClose();
    }
    
    return (
       <>
        <style>{`${thisBot.tags['SelectionOptions.css']}`}</style>
        <div className="backdrop" onClick={handleClose} />
        <div className="selection-contianer">
            {loading ? <div className="selection-option-loading"><LoaderSecondary /></div> : options.map((option) => (
                isPlaylist 
                
                ? 

                <div className="selection-option" onClick={() => onClick(option)}>
                    <RenderIcon isCustomIcons={false} small icon="subscriptions" list={option.metaData.list} />
                    <p className="selection-option-label">{option.label}</p>
                </div>
                
                :

                <div onClick={() => onClick(option)}  className="selection-option" key={option.key}>
                     {option.label}
                </div>
            ))}
            {options.length === 0 && <p className="selection-option-label">No options found</p>}
        </div>
       </>
    )
}

export { SelectionOptions };