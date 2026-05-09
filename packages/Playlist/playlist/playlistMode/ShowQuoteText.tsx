const ConfirmationModal = await thisBot.ConfirmationModal();

const quoteText = that.quoteText;

const name = "show-quote-text";
os.unregisterApp(name);
os.registerApp(name, thisBot);

const ShowQuoteText = () => {
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

os.compileApp(name, <ShowQuoteText />);
