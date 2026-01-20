const SelectionOptions = ( { handleClose, options, onClickOption } ) => {

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
            {options.map((option) => (
                <div onClick={() => onClick(option)}  className="selection-option" key={option.key}>
                     {option.label}
                </div>
            ))}
        </div>
       </>
    )
}

export { SelectionOptions };