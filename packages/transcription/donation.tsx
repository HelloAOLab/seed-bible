import { render } from "preact";
import { useState } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
import { addTranslations } from "seed-bible/i18n";
import "./styles.css";

const DONATE_URL = "https://better.giving/donate/1118469";

const HOURLY_COST = 1.1;

const PRESET_AMOUNTS = [2, 5, 10];
const RECOMMENDED_AMOUNT = 5;

type Props = {
  onSuccess: () => void;
  i18n: SeedBibleState["i18n"];
};

const DonationDialog = ({ onSuccess, i18n }: Props) => {
  const [selected, setSelected] = useState<number | null>(RECOMMENDED_AMOUNT);

  const { t } = i18n;

  const rate = String(
    t("donationRate", {
      ns: "transcription",
      defaultValue: "$1.10 per hour",
    })
  );
  const body = String(
    t("donationBody", {
      ns: "transcription",
      defaultValue:
        "We're a small team, and this feature costs us about {{rate}} to run. A small donation covers your use — and keeps it available for everyone.",
      rate,
    })
  );

  const rateAt = body.indexOf(rate);

  // Roughly how many hours a given donation covers, e.g. $5 ≈ 4 hrs.
  const hoursFor = (amount: number) => Math.floor(amount / HOURLY_COST);

  function donate() {
    const url =
      selected == null ? DONATE_URL : `${DONATE_URL}?amount=${selected}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onSuccess();
    closeDonationDialog();
  }

  return (
    <div
      class="sbd-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sbd-title"
      onClick={closeDonationDialog}
    >
      <div class="sbd-card" onClick={(e) => e.stopPropagation()}>
        <div class="sbd-header">
          <span class="sbd-badge-circle" aria-hidden="true">
            <span class="material-symbols-outlined sbd-heart-icon">
              favorite
            </span>
          </span>
          <button
            type="button"
            class="sbd-close"
            aria-label={t("close", {
              ns: "transcription",
              defaultValue: "Close",
            })}
            onClick={closeDonationDialog}
          >
            <span class="material-symbols-outlined sbd-close-icon">close</span>
          </button>
        </div>

        <h2 class="sbd-title" id="sbd-title">
          {t("donationTitle", {
            ns: "transcription",
            defaultValue: "Help keep this feature running",
          })}
        </h2>

        <p class="sbd-body">
          {rateAt === -1 ? (
            body
          ) : (
            <>
              {body.slice(0, rateAt)}
              <strong>{rate}</strong>
              {body.slice(rateAt + rate.length)}
            </>
          )}
        </p>

        <div class="sbd-amounts">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              class={
                "sbd-amount" +
                (selected === amount ? " sbd-amount--selected" : "")
              }
              aria-pressed={selected === amount}
              onClick={() => setSelected(amount)}
            >
              {selected === amount && (
                <span class="sbd-amount-badge">
                  {t("donationCovers", {
                    ns: "transcription",
                    defaultValue: "Covers ~{{hours}} hrs",
                    hours: hoursFor(amount),
                  })}
                </span>
              )}
              ${amount}
            </button>
          ))}
          <button
            type="button"
            class={
              "sbd-amount" + (selected == null ? " sbd-amount--selected" : "")
            }
            aria-pressed={selected == null}
            onClick={() => setSelected(null)}
          >
            {selected == null && (
              <span class="sbd-amount-badge">
                {t("donationCoversOther", {
                  ns: "transcription",
                  defaultValue: "Set your own",
                })}
              </span>
            )}
            {t("donationOther", {
              ns: "transcription",
              defaultValue: "Other",
            })}
          </button>
        </div>

        <button type="button" class="sbd-donate" onClick={donate}>
          {selected == null
            ? t("donate", { ns: "transcription", defaultValue: "Donate" })
            : t("donateAmount", {
                ns: "transcription",
                defaultValue: "Donate {{amount}}",
                amount: `$${selected}`,
              })}
        </button>

        <button type="button" class="sbd-dismiss" onClick={closeDonationDialog}>
          {t("donationDismiss", {
            ns: "transcription",
            defaultValue: "Not now — take me back",
          })}
        </button>

        <hr class="sbd-divider" />

        <div class="sbd-footer">
          <span
            class="material-symbols-outlined sbd-lock-icon"
            aria-hidden="true"
          >
            lock
          </span>
          <span>
            {t("donationSecure", {
              ns: "transcription",
              defaultValue: "Secure payment · one-time, no account needed",
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default async function openDonationDialog({
  onSuccess,
  context,
}: {
  onSuccess: () => void;
  context: SeedBibleState;
}) {
  if (document.getElementById("donation-container")) return;

  // Not an extension, so nothing loads these strings for it; fetched only
  // once the dialog is actually shown. Without them it still opens, in the
  // English every `t()` call carries as its default. The namespace is this
  // package's folder name, which is where the i18n lint looks up the keys.
  try {
    const { default: translations } = await import("./translations.json");
    addTranslations("transcription", translations);
  } catch (error) {
    console.error("Couldn't load the donation dialog's translations.", error);
  }
  // Another call may have opened it while this one waited.
  if (document.getElementById("donation-container")) return;

  const container = document.createElement("div");
  container.id = "donation-container";
  container.className = "twitchPub";
  document.body.appendChild(container);
  render(
    <DonationDialog onSuccess={onSuccess} i18n={context.i18n} />,
    container
  );
}

function closeDonationDialog() {
  const container = document.getElementById("donation-container");
  if (container) {
    render(null, container);
    container.remove();
  }
}
