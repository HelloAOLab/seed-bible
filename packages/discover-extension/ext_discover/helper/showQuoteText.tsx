import { ConfirmationModal } from "ext_discover.components.ConfirmationModal";
import type { ShowQuoteTextOptions } from "ext_discover.interfaces.helper.showQuoteText";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

export function showQuoteText({ quoteText }: ShowQuoteTextOptions) {
  const name = "show-quote-text";
  os.unregisterApp(name);
  os.registerApp(name, getPlaylistBot());

  const ShowQuoteTextApp = () => {
    return (
      <>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=close"
        />

        <ConfirmationModal
          para={quoteText}
          isParaHTML
          floatingButton
          noOnConfirm
          noOnClose
          noContPadding
          closeCTA={t("close")}
          onClose={() => {
            os.unregisterApp(name);
          }}
        />
      </>
    );
  };

  os.compileApp(name, <ShowQuoteTextApp />);
}
