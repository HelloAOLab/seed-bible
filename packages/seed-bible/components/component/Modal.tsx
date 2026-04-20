const Modal = (props: any) => {
  const {
    onClose,
    title,
    children,
    className = "",
    sxContainer = {},
    styles = {},
    backDropStyle = {},
    showIcon = true,
  } = props;
  return (
    <>
      <style>{thisBot.tags["index.css"]}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <div onClick={onClose} style={backDropStyle} className="backdrop" />
      <div className="modal-container" style={sxContainer}>
        <div
          className="modal-header"
          style={{
            border: title ? "1px solid #e1e3ea" : "none",
            height: title ? "auto" : "50px",
          }}
        >
          <h3>{title}</h3>
          <span class="material-symbols-outlined close-modal" onClick={onClose}>
            close
          </span>
        </div>
        <div
          className={`modal-inner-cont ${className}`}
          style={{ ...styles, overflow: "scroll" }}
        >
          {showIcon && (
            <ImageWrapper>
              <div class="img">
                <img
                  style={{ width: "35px", height: "35px" }}
                  src="https://helloaolab.my.canva.site/images/508bf8e3a36b2a0124d06a721f99f284.png"
                />
              </div>
            </ImageWrapper>
          )}
          {children}
        </div>
      </div>
    </>
  );
};

return Modal;
