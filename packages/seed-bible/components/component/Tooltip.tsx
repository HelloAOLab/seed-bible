const Modal = thisBot.Modal();
const Button = thisBot.Button();
const ButtonsCover = thisBot.ButtonsCover();

const { useState } = os.appHooks;

const Tooltip = (props: any) => {
  const { children, text, forRight, gifUrl } = props;
  const [infoModal, setInfoModal] = useState(false);

  return (
    <>
      <style>{thisBot.tags["Tooltip.css"]}</style>
      {infoModal && !!gifUrl && (
        <Modal
          showIcon={false}
          title="How to create Playlist from Google Spreadsheet"
          onClose={() => setInfoModal(false)}
        >
          <p style={{ fontSize: "24px" }}>
            <span class="material-symbols-outlined">info</span>
            Information
          </p>
          <p style={{ fontSize: "12px", fontWeight: "800", marginTop: "24px" }}>
            {text}
          </p>
          <br />
          {gifUrl && <img src={gifUrl} alt="information-videoF" />}
          <br />
          <ButtonsCover>
            <p> </p>
            <Button onClick={() => setInfoModal(false)} secondaryAlt>
              Close
            </Button>
          </ButtonsCover>
        </Modal>
      )}
      <div className="tooltip-container" onClick={() => setInfoModal(true)}>
        {children}
        <div
          style={{
            left: !forRight ? "0" : "auto",
            right: forRight ? "0" : "auto",
          }}
          className="tooltip-bubble"
        >
          <div className="tooltip-message">{text}</div>
        </div>
      </div>
    </>
  );
};

return Tooltip;
