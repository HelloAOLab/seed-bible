import type { ModalManager } from "../../managers/ModalManager";

const APOCRYPHA_INFO_MODAL_ID = "apocrypha-info";

/** About the Apocrypha, opened from the info button beside its heading. */
export function openApocryphaInfo(modals: ModalManager) {
  modals.openModal({
    id: APOCRYPHA_INFO_MODAL_ID,
    title: { key: "about-apocrypha", defaultValue: "About the Apocrypha" },
    mobileSheet: true,
    content: ({ t }) => (
      <div id="apocrypha-info" class="sb-apocrypha-info-content">
        {t("apocrypha-info-text", {
          defaultValue:
            "None of the writings in this section were ever considered Scripture by early Jewish or Christian communities. The Bible is a specific collection of books. Jews and Christians have always agreed on the Old Testament, which comes from a fixed set of sacred writings the Jewish people called the Tanakh and Christians call the Old Testament. The content of the Tanakh and the Old Testament are exactly the same, but are commonly arranged differently. Christians additionally recognize the New Testament, which tells the story of Jesus, his teachings, and the writings of his followers. The writings below were known and widely read at the time the Bible was written, but they were never treated as Scripture. While ancient authors sometimes quoted a wide range of texts including poets, philosophers, and other writings, quoting something is not the same as treating it as Scripture. These writings are included here for historical and literary reference only.",
        })}
      </div>
    ),
  });
}

export function closeApocryphaInfo(modals: ModalManager) {
  if (
    modals.modals.peek().some((modal) => modal.id === APOCRYPHA_INFO_MODAL_ID)
  ) {
    modals.closeModal(APOCRYPHA_INFO_MODAL_ID);
  }
}
