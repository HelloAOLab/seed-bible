const Overlay = ({ position, onClose, items, styles, children }) => {
    return <>
        <div className="backdrop" onClick={() => onClose()} />
        <div
            onClick={() => onClose()}
            style={{
                ...position,
                width: '200px',
                padding: '1rem',
                ...styles
            }}
            className="overlay linked-item-custom"

        >
            {children}
            {items.map(ele => {
                return (
                    <div
                        className="more-menu-items"
                        onClick={() => {
                            ele.click();
                        }}
                        style={{
                            borderTop: '1px solid #3E3E3E'
                        }}
                    >
                        {!!ele.icon && <span style={{ color: 'white' }} class="material-symbols-outlined">
                            {ele.icon}
                        </span>}
                        <p>
                            {ele.label}
                        </p>
                    </div>
                )
            })}
        </div>
    </>
}

return Overlay;