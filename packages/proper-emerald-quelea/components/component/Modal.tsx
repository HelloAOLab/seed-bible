const Modal = ({ onClose, title, children, className = "", sxContainer = {}, styles = {}, backDropStyle = {}, showIcon = true }) => {
    return <>
        <style>{thisBot.tags["index.css"]}</style>
        <div onClick={onClose} style={backDropStyle} className="backdrop" />
        <div className="modal-container" style={sxContainer}>
            {title && <div className="modal-header">
                <h3>{title}</h3>
                <span class="material-symbols-outlined close-modal" onClick={onClose}>
                    close
                </span>
            </div>}
            <div className={`modal-inner-cont ${className}`} style={styles} >
                {showIcon && <ImageWrapper><div class="img"><img style={{ width: '35px', height: '35px' }} src="https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png" /></div></ImageWrapper>}
                {children}
            </div>
        </div>
    </>
}

return Modal;