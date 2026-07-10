import { render } from "preact";
import type { SeedBibleState } from "seed-bible";

const DONATE_URL = "https://better.giving/donate/1118469";

const DONATION_MESSAGE =
  "This feature costs us about $1.10 an hour, so if you're going to use it " +
  "please make a donation to at least cover the cost! We are a small team and " +
  "cannot afford to make this feature available to the general public if our " +
  "costs our not covered.";

const DonationDialog = (props: {
  onSuccess: () => void;
  i18n: SeedBibleState["i18n"];
}) => {
  function donate() {
    // Send the user to the donation page, then tear down and notify the caller.
    window.open(DONATE_URL, "_blank", "noopener,noreferrer");
    props.onSuccess();
    closeDonationDialog();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: "0",
        zIndex: "10000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          maxWidth: "28rem",
          width: "100%",
          boxSizing: "border-box",
          padding: "1.75rem",
          borderRadius: "0.75rem",
          background: "var(--sb-reader-background, #ffffff)",
          color: "var(--sb-font-color, #333)",
          fontFamily: "var(--sb-font-family, Satoshi, system-ui, sans-serif)",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.25)",
        }}
      >
        <p
          style={{
            margin: "0 0 1.5rem",
            fontSize: "0.95rem",
            lineHeight: "1.55",
          }}
        >
          {DONATION_MESSAGE}
        </p>
        <button
          type="button"
          onClick={donate}
          style={{
            display: "block",
            width: "100%",
            padding: "0.75rem 1rem",
            border: "none",
            borderRadius: "0.5rem",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "600",
            background: "var(--sb-primary-color, #e07b4c)",
            color: "var(--sb-primary-font-color, #fff)",
          }}
        >
          Donate
        </button>
      </div>
    </div>
  );
};

export default function openDonationDialog({
  onSuccess,
  context,
}: {
  onSuccess: () => void;
  context: SeedBibleState;
}) {
  if (!document.getElementById("donation-container")) {
    const container = document.createElement("div");
    container.id = "donation-container";
    container.className = "twitchPub";
    document.body.appendChild(container);
    render(
      <DonationDialog onSuccess={onSuccess} i18n={context.i18n} />,
      container
    );
  }
}

function closeDonationDialog() {
  const container = document.getElementById("donation-container");
  if (container) {
    render(null, container);
    container.remove();
  }
}
