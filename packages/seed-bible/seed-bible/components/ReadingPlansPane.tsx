import { useState } from "preact/hooks";
import { useI18n } from "../i18n/I18nManager";
import type { ReadingPlansManager } from "../managers/ReadingPlansManager";

interface ReadingPlansPaneProps {
  readingPlans: ReadingPlansManager;
}

type ReadingPlansView = "list" | "create";

/**
 * Pane content for reading plans. Shows the user's plans (with a button to
 * start authoring a new one) and the create-plan form screen.
 */
export function ReadingPlansPane(props: ReadingPlansPaneProps) {
  const { readingPlans } = props;
  const [view, setView] = useState<ReadingPlansView>("list");

  if (view === "create") {
    return (
      <CreateReadingPlanForm
        readingPlans={readingPlans}
        onDone={() => setView("list")}
      />
    );
  }

  return (
    <ReadingPlansList
      readingPlans={readingPlans}
      onCreate={() => setView("create")}
    />
  );
}

interface ReadingPlansListProps {
  readingPlans: ReadingPlansManager;
  onCreate: () => void;
}

function ReadingPlansList(props: ReadingPlansListProps) {
  const { readingPlans, onCreate } = props;
  const { t } = useI18n();

  // Reading `.value` during render subscribes the component to updates.
  const plans = readingPlans.userReadingPlans.value;

  return (
    <div className="sb-reading-plans-pane">
      <div className="sb-reading-plans-header">
        <h2 className="sb-reading-plans-title">
          {t("reading-plans", { defaultValue: "Reading Plans" })}
        </h2>
        <button
          type="button"
          className="sb-reading-plans-create"
          onClick={onCreate}
        >
          {t("create-reading-plan", { defaultValue: "New plan" })}
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="sb-reading-plans-empty">
          {t("reading-plans-empty", {
            defaultValue:
              "You don't have any reading plans yet. Create one to get started.",
          })}
        </div>
      ) : (
        <ul className="sb-reading-plans-list">
          {plans.map((plan) => (
            <li
              key={`${plan.recordName}/${plan.address}`}
              className="sb-reading-plan-item"
              dir="auto"
            >
              <button
                type="button"
                className="sb-reading-plan-item-button"
                onClick={() => void readingPlans.selectReadingPlan(plan)}
              >
                <span className="sb-reading-plan-item-title">
                  {plan.title ??
                    t("untitled-reading-plan", {
                      defaultValue: "Untitled plan",
                    })}
                </span>
                {plan.description ? (
                  <span className="sb-reading-plan-item-description">
                    {plan.description}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CreateReadingPlanFormProps {
  readingPlans: ReadingPlansManager;
  onDone: () => void;
}

function CreateReadingPlanForm(props: CreateReadingPlanFormProps) {
  const { readingPlans, onDone } = props;
  const { t, language } = useI18n();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locale, setLocale] = useState(language);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      await readingPlans.createNewReadingPlan({
        title: title.trim() || null,
        description: description.trim() || null,
        locale: locale.trim() || language,
      });
      onDone();
    } catch (error) {
      console.error("Failed to create reading plan:", error);
      setSaving(false);
    }
  };

  return (
    <div className="sb-reading-plans-pane">
      <div className="sb-reading-plans-header">
        <button
          type="button"
          className="sb-reading-plans-back"
          onClick={onDone}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t("back", { defaultValue: "Back" })}
        </button>
        <h2 className="sb-reading-plans-title">
          {t("create-reading-plan", { defaultValue: "Create reading plan" })}
        </h2>
      </div>

      <div className="sb-reading-plans-form">
        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label" htmlFor="sb-plan-title">
            {t("title", { defaultValue: "Title" })}
          </label>
          <input
            id="sb-plan-title"
            className="sb-settings-text-input"
            type="text"
            value={title}
            onInput={(event: Event) =>
              setTitle((event.currentTarget as HTMLInputElement).value)
            }
            placeholder={t("reading-plan-title_placeholder", {
              defaultValue: "e.g. Bible in a Year",
            })}
          />
        </div>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-plan-description"
          >
            {t("description", { defaultValue: "Description" })}
          </label>
          <textarea
            id="sb-plan-description"
            className="sb-settings-text-input sb-settings-textarea"
            value={description}
            maxLength={500}
            onInput={(event: Event) =>
              setDescription((event.currentTarget as HTMLTextAreaElement).value)
            }
            placeholder={t("reading-plan-description_placeholder", {
              defaultValue: "What is this plan about?",
            })}
          />
        </div>

        <div className="sb-settings-field-row">
          <label className="sb-settings-field-label" htmlFor="sb-plan-locale">
            {t("language", { defaultValue: "Language" })}
          </label>
          <input
            id="sb-plan-locale"
            className="sb-settings-text-input"
            type="text"
            value={locale}
            onInput={(event: Event) =>
              setLocale((event.currentTarget as HTMLInputElement).value)
            }
          />
        </div>

        <div className="sb-settings-actions">
          <button
            type="button"
            className="sb-settings-save-button"
            onClick={() => void handleCreate()}
            disabled={saving}
          >
            {t("save", { defaultValue: "Save" })}
          </button>
        </div>
      </div>
    </div>
  );
}
