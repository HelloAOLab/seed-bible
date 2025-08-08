const {useEffect, useState} = os.appHooks;

const Tooltip = ({content}) => {    
    return ( 
        <span className="tooltip">{content}</span> 
    )
}

return Tooltip;