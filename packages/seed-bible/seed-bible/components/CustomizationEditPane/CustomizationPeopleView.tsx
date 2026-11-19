import "./CustomizationPeopleView.css";
import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CustomizationSharingError,
  type SeedBibleCustomization,
} from "../../managers/CustomizationsManager";
import type { StudioMember, StudioRole } from "../../managers/OsManager";
import { useI18n } from "../../i18n/I18nManager";
import { Button } from "../Button/Button";
import { IconButton } from "../IconButton/IconButton";

type Translate = ReturnType<typeof useI18n>["t"];

/** The words people see for CasualOS's studio roles. */
export function studioRoleLabel(t: Translate, role: StudioRole): string {
  return role === "admin"
    ? t("customization-role-manager", { defaultValue: "Manager" })
    : t("customization-role-editor", { defaultValue: "Editor" });
}

function sharingErrorMessage(t: Translate, error: unknown): string {
  const code = error instanceof CustomizationSharingError ? error.code : null;
  if (code === "user_not_found") {
    return t("customization-people-user-not-found", {
      defaultValue:
        "No Seed Bible account uses that email. Ask them to sign in to Seed Bible once, then add them again.",
    });
  }
  if (code === "not_authorized") {
    return t("customization-people-not-authorized", {
      defaultValue: "Only a Manager can do that.",
    });
  }
  if (code === "subscription_limit_reached") {
    return t("customization-people-limit-reached", {
      defaultValue:
        "Your account can't share any more Custom Brandings right now.",
    });
  }
  return t("customization-people-failed", {
    defaultValue: "Something went wrong. Please try again.",
  });
}

/** Saved extension keys still kept in someone's own account rather than the studio. */
function countKeysOutsideStudio(record: SeedBibleCustomization): number {
  let count = 0;
  for (const byProxy of Object.values(record.extensionSensitiveProxies)) {
    for (const pointer of Object.values(byProxy)) {
      if (pointer.recordName !== record.studioId) {
        count += 1;
      }
    }
  }
  return count;
}

/**
 * The editor's "People" screen: shares a Custom Branding so other people can
 * edit it, and manages who can.
 */
export function CustomizationPeopleView(props: { state: SeedBibleState }) {
  const record = props.state.customizations.editingCustomization.value;
  if (!record) {
    return null;
  }
  return (
    <div className="sb-settings-page sb-cz-page">
      <section className="sb-settings-section sb-cz-body">
        {record.studioId ? (
          <SharedPeople state={props.state} record={record} />
        ) : (
          <NotYetShared state={props.state} record={record} />
        )}
      </section>
    </div>
  );
}

function NotYetShared(props: {
  state: SeedBibleState;
  record: SeedBibleCustomization;
}) {
  const { state, record } = props;
  const { t } = useI18n();
  const sharing = useSignal(false);
  const keyCount = countKeysOutsideStudio(record);

  const share = async () => {
    sharing.value = true;
    try {
      await state.customizations.shareWithOthers(record.id);
      state.app.toast(
        t("customization-shared", {
          defaultValue: "You can now add people to this Custom Branding",
        })
      );
    } catch (error) {
      console.error("Failed to share customization:", error);
      state.app.toast(sharingErrorMessage(t, error));
    } finally {
      sharing.value = false;
    }
  };

  return (
    <div className="sb-cz-people-intro">
      <p>
        {t("customization-people-only-you", {
          defaultValue: "Only you can edit this Custom Branding.",
        })}
      </p>
      <p>
        {t("customization-people-share-explainer", {
          defaultValue:
            "Share it to let other people edit it with you. It then belongs to the group instead of your account, so it keeps working if you step away.",
        })}
      </p>
      <ul className="sb-cz-people-notes">
        <li>
          {t("customization-people-links-keep-working", {
            defaultValue: "Links you've already shared keep working.",
          })}
        </li>
        {keyCount > 0 && (
          <li>
            {t("customization-people-keys-stay", {
              defaultValue:
                "Saved extension keys stay in your account until they're entered again.",
            })}
          </li>
        )}
        {record.contentRecordName && (
          <li>
            {t("customization-people-library-stays", {
              defaultValue:
                "The content library stays in your account, and only you can change it.",
            })}
          </li>
        )}
        <li>
          {t("customization-people-cannot-undo", {
            defaultValue: "This can't be undone.",
          })}
        </li>
      </ul>
      <Button
        variant="primary"
        icon="group_add"
        loading={sharing.value}
        onClick={() => void share()}
      >
        {t("customization-share-with-others", {
          defaultValue: "Share with others",
        })}
      </Button>
    </div>
  );
}

function SharedPeople(props: {
  state: SeedBibleState;
  record: SeedBibleCustomization;
}) {
  const { state, record } = props;
  const { customizations, login } = state;
  const { t } = useI18n();
  const members = useSignal<StudioMember[] | null>(null);
  const loadFailed = useSignal(false);
  const email = useSignal("");
  const role = useSignal<StudioRole>("member");
  const adding = useSignal(false);
  const removing = useSignal<string | null>(null);
  const isManager = customizations.getStudioRole(record) === "admin";
  const keyCount = countKeysOutsideStudio(record);

  const reload = async () => {
    try {
      members.value = await customizations.listMembers(record);
      loadFailed.value = false;
    } catch (error) {
      console.error("Failed to list customization members:", error);
      loadFailed.value = true;
    }
  };

  useEffect(() => {
    members.value = null;
    void reload();
    // Only a different studio needs a fresh list; edits to the record don't.
  }, [record.studioId]);

  const add = async (event: Event) => {
    event.preventDefault();
    const address = email.value.trim();
    if (!address) {
      return;
    }
    adding.value = true;
    try {
      await customizations.addMember(record, address, role.value);
      email.value = "";
      await reload();
    } catch (error) {
      console.error("Failed to add a customization member:", error);
      state.app.toast(sharingErrorMessage(t, error));
    } finally {
      adding.value = false;
    }
  };

  const remove = async (member: StudioMember) => {
    removing.value = member.userId;
    try {
      await customizations.removeMember(record, member.userId);
      await reload();
    } catch (error) {
      console.error("Failed to remove a customization member:", error);
      state.app.toast(sharingErrorMessage(t, error));
    } finally {
      removing.value = null;
    }
  };

  return (
    <>
      <p className="sb-cz-people-intro">
        {t("customization-people-shared-explainer", {
          defaultValue:
            "Everyone here can edit this Custom Branding. Managers can also add and remove people.",
        })}
      </p>

      {keyCount > 0 && (
        <p className="sb-cz-people-note">
          {t("customization-people-keys-outside", {
            count: keyCount,
            defaultValue:
              "{{count}} saved extension keys are still kept in one person's account. Enter them again under Extensions to keep them with this Custom Branding.",
          })}
        </p>
      )}

      {loadFailed.value ? (
        <p className="sb-cz-people-note" role="alert">
          {t("customization-people-load-failed", {
            defaultValue: "Couldn't load the people who can edit this.",
          })}
        </p>
      ) : members.value === null ? (
        <p className="sb-cz-row-hint">
          {t("customization-people-loading", {
            defaultValue: "Loading people…",
          })}
        </p>
      ) : (
        <ul
          className="sb-cz-people-list"
          aria-label={t("customization-people", { defaultValue: "People" })}
        >
          {members.value.map((member) => (
            <li key={member.userId} className="sb-cz-people-member">
              <span className="sb-cz-row-text">
                <span className="sb-cz-row-label" dir="auto">
                  {member.name || member.email || member.userId}
                  {member.userId === login.userId.value &&
                    ` ${t("customization-people-you", { defaultValue: "(you)" })}`}
                </span>
                {member.name && member.email && (
                  <span className="sb-cz-row-hint" dir="auto">
                    {member.email}
                  </span>
                )}
              </span>
              <span className="sb-cz-row-hint">
                {studioRoleLabel(t, member.role)}
              </span>
              {isManager && member.userId === login.userId.value && (
                <span
                  className="sb-cz-people-action-spacer"
                  aria-hidden="true"
                />
              )}
              {isManager && member.userId !== login.userId.value && (
                <IconButton
                  icon="person_remove"
                  label={t("customization-people-remove", {
                    name: member.name || member.email || member.userId,
                    defaultValue: "Remove {{name}}",
                  })}
                  disabled={removing.value !== null}
                  onClick={() => void remove(member)}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {isManager && (
        <form className="sb-cz-people-add" onSubmit={(e) => void add(e)}>
          <label
            className="sb-settings-field-label"
            htmlFor="sb-customization-people-email"
          >
            {t("customization-people-add", { defaultValue: "Add someone" })}
          </label>
          <input
            id="sb-customization-people-email"
            type="email"
            className="sb-cz-input"
            autoComplete="off"
            placeholder={t("customization-people-email-placeholder", {
              defaultValue: "Their sign-in email",
            })}
            value={email.value}
            onInput={(event: Event) => {
              email.value = (event.currentTarget as HTMLInputElement).value;
            }}
          />
          <div className="sb-cz-people-add-row">
            <span className="sb-cz-pill-select">
              <select
                aria-label={t("customization-people-role", {
                  defaultValue: "Role",
                })}
                value={role.value}
                onChange={(event: Event) => {
                  role.value = (event.currentTarget as HTMLSelectElement)
                    .value as StudioRole;
                }}
              >
                <option value="member">{studioRoleLabel(t, "member")}</option>
                <option value="admin">{studioRoleLabel(t, "admin")}</option>
              </select>
              <span
                className="material-symbols-outlined sb-cz-pill-select-caret"
                aria-hidden="true"
              >
                expand_more
              </span>
            </span>
            <Button
              type="submit"
              icon="person_add"
              loading={adding.value}
              disabled={!email.value.trim()}
            >
              {t("customization-people-add-button", { defaultValue: "Add" })}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
