const appName = "on-date-add";
const G = globalThis as any;
const { Input, Modal, Button, ButtonsCover } = G.Components;

const { onAttach } = that;

const { useState } = os.appHooks;

os.unregisterApp(appName);
os.registerApp(appName, thisBot);

const onClose = () => {
  os.unregisterApp(appName);
};

const AddDateModal = () => {
  const [date, setDate] = useState(G.FORMAT_YYYY_MM_DD(new Date()));

  return (
    <Modal title={t("addDate")} showIcon={false} onClose={() => onClose()}>
      {/* <h3>{t('insertDate')}</h3> */}
      <input
        type="date"
        value={date}
        onChange={(e: any) => setDate(e.target.value)}
        style={{
          margin: "10px 0",
          padding: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <ButtonsCover>
        <Button secondaryAlt onClick={() => onClose()}>
          {t("close")}
        </Button>
        <Button
          secondary
          onClick={() => {
            onAttach(date);
            onClose();
          }}
        >
          {t("save")}
        </Button>
      </ButtonsCover>
    </Modal>
  );
};

os.compileApp(appName, <AddDateModal />);
