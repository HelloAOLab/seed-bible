import type { OnAddDateModalProps } from "ext_discover.interfaces.components.OnAddDateModal";
import { Modal } from "ext_discover.features.components.Modal";
import { Button } from "ext_discover.features.components.Button";
import { ButtonsCover } from "ext_discover.features.components.ButtonsCover";

export function OnAddDateModal({ manager }: OnAddDateModalProps) {
  const date = manager.date.value;

  return (
    <Modal title={t("addDate")} showIcon={false} onClose={manager.close}>
      <input
        type="date"
        value={date}
        onChange={(e: any) => manager.setDate(e.target.value)}
        style={{
          margin: "10px 0",
          padding: "8px",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      <ButtonsCover>
        <Button secondaryAlt onClick={manager.close}>
          {t("close")}
        </Button>
        <Button secondary onClick={manager.save}>
          {t("save")}
        </Button>
      </ButtonsCover>
    </Modal>
  );
}
