import { render } from "preact";
import { useState } from "preact/hooks";
import type { SeedBibleState } from "seed-bible";
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
      ns: "ext_AI_Transcript",
      defaultValue: "$1.10 per hour",
    })
  );
  const body = String(
    t("donationBody", {
      ns: "ext_AI_Transcript",
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
              ns: "ext_AI_Transcript",
              defaultValue: "Close",
            })}
            onClick={closeDonationDialog}
          >
            <span class="material-symbols-outlined sbd-close-icon">close</span>
          </button>
        </div>

        <h2 class="sbd-title" id="sbd-title">
          {t("donationTitle", {
            ns: "ext_AI_Transcript",
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
                    ns: "ext_AI_Transcript",
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
                  ns: "ext_AI_Transcript",
                  defaultValue: "Set your own",
                })}
              </span>
            )}
            {t("donationOther", {
              ns: "ext_AI_Transcript",
              defaultValue: "Other",
            })}
          </button>
        </div>

        <button type="button" class="sbd-donate" onClick={donate}>
          {selected == null
            ? t("donate", { ns: "ext_AI_Transcript", defaultValue: "Donate" })
            : t("donateAmount", {
                ns: "ext_AI_Transcript",
                defaultValue: "Donate {{amount}}",
                amount: `$${selected}`,
              })}
        </button>

        <button type="button" class="sbd-dismiss" onClick={closeDonationDialog}>
          {t("donationDismiss", {
            ns: "ext_AI_Transcript",
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
              ns: "ext_AI_Transcript",
              defaultValue: "Secure payment · one-time, no account needed",
            })}
          </span>
        </div>
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
