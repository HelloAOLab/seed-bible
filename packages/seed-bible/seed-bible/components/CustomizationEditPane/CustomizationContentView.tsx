import "./CustomizationContentView.css";
import { useSignal } from "@preact/signals";
import type { ComponentChildren } from "preact";
import { useEffect } from "preact/hooks";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  ContentLibraryError,
  type ContentItemInput,
} from "../../managers/CustomContentManager";
import type {
  ContentItem,
  ContentReference,
} from "../../managers/customContent/schema";
import type { TranslationBook } from "../../managers/FreeUseBibleAPI";
import {
  formatContentReference as formatReference,
  parsePassages,
} from "../../managers/customContent/passages";
import {
  parseImportCsv,
  parsePastedLinks,
  type ParsedImport,
} from "../../managers/customContent/importEntries";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { CONFIDENT_PASSAGE } from "../../managers/customContent/classify";

type TFunction = ReturnType<typeof useI18n>["t"];

/** The item form's fields, as typed. */
interface ItemDraft {
  id?: string;
  url: string;
  title: string;
  description: string;
  image: string;
  author: string;
  categoryId: string;
  /** References separated by `;` or new lines, e.g. "John 10:1-18; Psalm 23". */
  verses: string;
  published: boolean;
}

/** Items shown at a time; a big import can add thousands. */
const PAGE_SIZE = 100;

const ITEM_FILTERS = ["all", "review", "draft", "published"] as const;
type ItemFilter = (typeof ITEM_FILTERS)[number];

function matchesFilter(item: ContentItem, filter: ItemFilter): boolean {
  switch (filter) {
    case "review":
      return (
        item.status === "needs_review" ||
        item.status === "pending" ||
        item.status === "failed"
      );
    case "draft":
      return item.status === "draft";
    case "published":
      return item.status === "published";
    default:
      return true;
  }
}

function filterLabel(t: TFunction, filter: ItemFilter): string {
  switch (filter) {
    case "review":
      return t("custom-content-filter-review", {
        defaultValue: "Needs review",
      });
    case "draft":
      return t("custom-content-filter-drafts", { defaultValue: "Drafts" });
    case "published":
      return t("custom-content-filter-published", {
        defaultValue: "Published",
      });
    default:
      return t("custom-content-filter-all", { defaultValue: "All" });
  }
}

function statusLabel(t: TFunction, status: ContentItem["status"]): string {
  switch (status) {
    case "published":
      return t("custom-content-status-published", {
        defaultValue: "Published",
      });
    case "needs_review":
      return t("custom-content-status-needs-review", {
        defaultValue: "Needs review",
      });
    case "pending":
      return t("custom-content-status-pending", {
        defaultValue: "Importing",
      });
    case "failed":
      return t("custom-content-status-failed", { defaultValue: "Failed" });
    default:
      return t("custom-content-status-draft", { defaultValue: "Draft" });
  }
}

const EMPTY_DRAFT: ItemDraft = {
  url: "",
  title: "",
  description: "",
  image: "",
  author: "",
  categoryId: "",
  verses: "",
  published: false,
};

function draftFromItem(
  item: ContentItem,
  books: TranslationBook[] | undefined
): ItemDraft {
  return {
    id: item.id,
    url: item.url,
    title: item.title,
    description: item.description,
    image: item.image ?? "",
    author: item.author ?? "",
    categoryId: item.categoryIds[0] ?? "",
    verses: item.references
      .map((reference) => formatReference(reference, books))
      .join("; "),
    published: item.status === "published",
  };
}

function errorMessage(t: TFunction, error: unknown): string {
  const code = error instanceof ContentLibraryError ? error.code : null;
  switch (code) {
    case "subscription_limit_reached":
      return t("custom-content-error-plan-limit", {
        defaultValue:
          "Your plan doesn't allow another record, so the content library couldn't be created.",
      });
    case "invalid_url":
      return t("custom-content-error-invalid-url", {
        defaultValue: "Links must start with http:// or https://.",
      });
    case "not_authorized":
      return t("custom-content-error-not-authorized", {
        defaultValue: "You don't have permission to change this library.",
      });
    case "import_running":
      return t("custom-content-error-import-running", {
        defaultValue:
          "An import is already running for this library. Wait for it to finish, or cancel it.",
      });
    case "too_many_items":
      return t("custom-content-error-too-many", {
        defaultValue: "One import can hold up to 10,000 links.",
      });
    case "not_logged_in":
    case "session_invalid":
      return t("custom-content-error-signed-out", {
        defaultValue: "Sign in again to continue.",
      });
    case "network_error":
    case "casualos_unavailable":
      return t("custom-content-error-unreachable", {
        defaultValue:
          "The import service couldn't be reached. Please try again.",
      });
    default:
      return t("custom-content-error-generic", {
        defaultValue: "Something went wrong. Please try again.",
      });
  }
}

/** Shortened link for list rows: the host and path, without the scheme. */
function displayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`;
  } catch {
    return url;
  }
}

/**
 * The Customization editor's content library screen: create a library, keep
 * its categories, and add, publish and remove items by hand. Publishing
 * puts an item in Discover on every chapter its verses touch.
 */
export function CustomizationContentView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customizations, customContent } = state;
  const { t } = useI18n();
  const isCreating = useSignal(false);
  const createError = useSignal<string | null>(null);

  const record = customizations.editingCustomization.value;
  const recordName = record?.contentRecordName ?? null;

  useEffect(() => {
    if (
      recordName &&
      (customContent.recordName.peek() !== recordName ||
        customContent.status.peek() === "error")
    ) {
      void customContent.openLibrary(recordName);
    }
  }, [recordName]);

  if (!record) {
    return null;
  }

  if (!recordName) {
    const create = async () => {
      isCreating.value = true;
      createError.value = null;
      try {
        await customContent.createLibrary();
      } catch (error) {
        console.error("Failed to create content library:", error);
        createError.value = errorMessage(t, error);
      } finally {
        isCreating.value = false;
      }
    };
    return (
      <div className="sb-settings-page sb-cz-page">
        <section className="sb-settings-section sb-cz-body sb-ccl-empty">
          <span
            className="material-symbols-outlined sb-ccl-empty-icon"
            aria-hidden="true"
          >
            video_library
          </span>
          <h3 className="sb-ccl-empty-title">
            {t("custom-content-empty-title", {
              defaultValue: "Put your content next to the chapters it teaches",
            })}
          </h3>
          <p className="sb-cz-intro">
            {t("custom-content-empty-body", {
              defaultValue:
                "Add links to your sermons, videos, articles and podcasts, and the passages they cover. Anyone using this Custom Branding will find them in Discover on those chapters.",
            })}
          </p>
          {createError.value && (
            <p className="sb-ccl-error" role="alert">
              {createError.value}
            </p>
          )}
          <button
            type="button"
            className="sb-cz-button sb-cz-button-primary"
            disabled={isCreating.value}
            onClick={() => void create()}
          >
            {t("custom-content-create", {
              defaultValue: "Create content library",
            })}
          </button>
        </section>
      </div>
    );
  }

  const status = customContent.status.value;
  if (status === "missing") {
    return (
      <div className="sb-settings-page sb-cz-page">
        <section className="sb-settings-section sb-cz-body">
          <p className="sb-cz-intro">
            {t("custom-content-missing", {
              defaultValue:
                "This Custom Branding's content library couldn't be found. It may have been deleted.",
            })}
          </p>
          <button
            type="button"
            className="sb-cz-button"
            onClick={() =>
              void customizations.setEditingContentRecordName(null)
            }
          >
            {t("custom-content-unlink", {
              defaultValue: "Start a new library",
            })}
          </button>
        </section>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="sb-settings-page sb-cz-page">
        <section className="sb-settings-section sb-cz-body">
          <p className="sb-cz-intro">
            {t("custom-content-load-failed", {
              defaultValue: "The content library couldn't be loaded.",
            })}
          </p>
          <button
            type="button"
            className="sb-cz-button"
            onClick={() => void customContent.openLibrary(recordName)}
          >
            {t("custom-content-retry", { defaultValue: "Try again" })}
          </button>
        </section>
      </div>
    );
  }
  if (status !== "ready" || customContent.recordName.value !== recordName) {
    return (
      <div className="sb-settings-page sb-cz-page">
        <section className="sb-settings-section sb-cz-body">
          <p className="sb-cz-intro">
            {t("loading", { defaultValue: "Loading…" })}
          </p>
        </section>
      </div>
    );
  }

  return <ContentLibraryEditor state={state} />;
}

function ContentLibraryEditor(props: { state: SeedBibleState }) {
  const { state } = props;
  const { customContent } = state;
  const { t } = useI18n();
  const draft = useSignal<ItemDraft | null>(null);
  const newCategory = useSignal("");
  const confirmingDelete = useSignal<string | null>(null);
  const confirmingDeleteLibrary = useSignal(false);
  const filter = useSignal<ItemFilter>("all");
  const visibleCount = useSignal(PAGE_SIZE);

  const manifest = customContent.manifest.value;
  const items = customContent.items.value;
  const busy = customContent.isSaving.value;
  const books =
    state.app.selectedTab.value?.readingState.translationBooks.value?.books;

  if (!manifest) {
    return null;
  }

  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (error) {
      console.error("Content library change failed:", error);
      state.app.toast(errorMessage(t, error));
      return false;
    }
  };

  const categoryName = (id: string) =>
    manifest.categories.find((category) => category.id === id)?.name;
  const chapterCount = Object.keys(
    customContent.chapterIndex.value?.chapters ?? {}
  ).length;
  const publishedCount = items.filter((i) => i.status === "published").length;

  if (draft.value) {
    return (
      <ItemForm
        state={state}
        draft={draft.value}
        books={books}
        busy={busy}
        onCancel={() => {
          draft.value = null;
        }}
        onSave={async (input, publish) => {
          if (await run(() => customContent.saveItem(input, { publish }))) {
            draft.value = null;
          }
        }}
      />
    );
  }

  return (
    <div className="sb-settings-page sb-cz-page">
      <section className="sb-settings-section sb-cz-body">
        <p className="sb-cz-intro">
          {t("custom-content-summary", {
            published: publishedCount,
            chapters: chapterCount,
            defaultValue:
              "{{published}} published · shown in Discover on {{chapters}} chapters",
          })}
        </p>

        <div className="sb-cz-group">
          <h3 className="sb-settings-subheading">
            {t("custom-content-categories", { defaultValue: "Categories" })}
          </h3>
          <p className="sb-cz-hint">
            {t("custom-content-categories-hint", {
              defaultValue:
                "Each category gets its own filter and section in Discover.",
            })}
          </p>
          {manifest.categories.length > 0 && (
            <ul className="sb-ccl-chips">
              {manifest.categories.map((category) => (
                <li key={category.id} className="sb-ccl-chip">
                  <span dir="auto">{category.name}</span>
                  <button
                    type="button"
                    className="sb-ccl-chip-remove"
                    disabled={busy}
                    aria-label={t("custom-content-remove-category", {
                      name: category.name,
                      defaultValue: "Remove {{name}}",
                    })}
                    onClick={() =>
                      void run(() => customContent.removeCategory(category.id))
                    }
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="sb-ccl-inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const name = newCategory.value.trim();
              if (!name) {
                return;
              }
              void run(async () => {
                await customContent.addCategory(name);
                newCategory.value = "";
              });
            }}
          >
            <label className="sr-only" htmlFor="sb-ccl-new-category">
              {t("custom-content-new-category", {
                defaultValue: "New category",
              })}
            </label>
            <input
              id="sb-ccl-new-category"
              type="text"
              className="sb-cz-input"
              maxLength={100}
              placeholder={t("custom-content-new-category-placeholder", {
                defaultValue: "e.g. Sermons, Kids, Worship",
              })}
              value={newCategory.value}
              onInput={(event) => {
                newCategory.value = (
                  event.currentTarget as HTMLInputElement
                ).value;
              }}
            />
            <button
              type="submit"
              className="sb-cz-button"
              disabled={busy || !newCategory.value.trim()}
            >
              {t("custom-content-add-category", { defaultValue: "Add" })}
            </button>
          </form>
        </div>

        <div className="sb-settings-field-row">
          <label
            className="sb-settings-field-label"
            htmlFor="sb-ccl-default-author"
          >
            {t("custom-content-default-author", {
              defaultValue: "Default author",
            })}
          </label>
          <input
            id="sb-ccl-default-author"
            type="text"
            className="sb-cz-input"
            maxLength={200}
            defaultValue={manifest.defaultAuthor ?? ""}
            onChange={(event) => {
              const value = (event.currentTarget as HTMLInputElement).value;
              if (value.trim() !== (manifest.defaultAuthor ?? "")) {
                void run(() => customContent.setDefaultAuthor(value));
              }
            }}
          />
        </div>

        <AiSuggestionsSettings state={state} run={run} />

        <div className="sb-cz-group">
          <div className="sb-ccl-heading-row">
            <h3 className="sb-settings-subheading">
              {t("custom-content-items", { defaultValue: "Content" })}
            </h3>
            <button
              type="button"
              className="sb-cz-button sb-cz-button-primary"
              onClick={() => {
                draft.value = {
                  ...EMPTY_DRAFT,
                  author: manifest.defaultAuthor ?? "",
                };
              }}
            >
              <span className="material-symbols-outlined">add</span>
              {t("custom-content-add-item", { defaultValue: "Add content" })}
            </button>
          </div>
          {customContent.canImport && (
            <ImportPanel state={state} books={books} run={run} />
          )}
          {customContent.classifyQueue.value > 0 && (
            <p className="sb-cz-hint" role="status">
              {t("custom-content-classify-queue", {
                count: customContent.classifyQueue.value,
                defaultValue:
                  "Suggesting categories and passages for {{count}} items. This happens while this page is open.",
              })}
            </p>
          )}
          <SuggestedCategories state={state} run={run} />
          {items.length === 0 ? (
            <p className="sb-cz-hint">
              {t("custom-content-no-items", {
                defaultValue:
                  "Nothing here yet. Add a link and the passages it covers.",
              })}
            </p>
          ) : (
            <div
              className="sb-ccl-filters"
              role="group"
              aria-label={t("custom-content-filter", {
                defaultValue: "Show",
              })}
            >
              {ITEM_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="sb-ccl-filter"
                  aria-pressed={filter.value === option}
                  onClick={() => {
                    filter.value = option;
                    visibleCount.value = PAGE_SIZE;
                  }}
                >
                  {filterLabel(t, option)} ·{" "}
                  {items.filter((item) => matchesFilter(item, option)).length}
                </button>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <ul className="sb-ccl-items">
              {items
                .filter((item) => matchesFilter(item, filter.value))
                .slice(0, visibleCount.value)
                .map((item) => (
                  <li key={item.id} className="sb-ccl-item">
                    <div className="sb-ccl-item-text">
                      <span className="sb-ccl-item-title" dir="auto">
                        {item.title || displayUrl(item.url)}
                      </span>
                      <span className="sb-ccl-item-meta">
                        <span
                          className={`sb-ccl-status sb-ccl-status-${item.status}`}
                        >
                          {statusLabel(t, item.status)}
                        </span>
                        <span dir="auto">{displayUrl(item.url)}</span>
                      </span>
                      <span className="sb-ccl-item-meta">
                        {item.categoryIds
                          .map(categoryName)
                          .filter((name): name is string => !!name)
                          .join(" · ")}
                        {item.references.length === 0
                          ? t("custom-content-no-verses", {
                              defaultValue: "No passages yet",
                            })
                          : item.references.map((reference) => (
                              <ReferenceChip
                                key={formatReference(reference, books)}
                                reference={reference}
                                books={books}
                              />
                            ))}
                      </span>
                      {item.classification?.status === "failed" && (
                        <span className="sb-ccl-item-meta sb-ccl-error">
                          {t("custom-content-classify-failed", {
                            defaultValue:
                              "Couldn't get suggestions. Try again, or add passages yourself.",
                          })}
                        </span>
                      )}
                    </div>
                    <div className="sb-ccl-item-actions">
                      {confirmingDelete.value === item.id ? (
                        <button
                          type="button"
                          className="sb-cz-button sb-cz-button-danger"
                          disabled={busy}
                          onClick={() => {
                            confirmingDelete.value = null;
                            void run(() => customContent.deleteItem(item.id));
                          }}
                        >
                          {t("custom-content-confirm-delete-item", {
                            defaultValue: "Confirm delete",
                          })}
                        </button>
                      ) : (
                        <>
                          {item.status !== "published" && (
                            <button
                              type="button"
                              className="sb-cz-button sb-cz-button-quiet"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  customContent.classifyItem(item.id)
                                )
                              }
                            >
                              {t("custom-content-suggest-again", {
                                defaultValue: "Suggest again",
                              })}
                            </button>
                          )}
                          <button
                            type="button"
                            className="sb-cz-button"
                            disabled={busy}
                            onClick={() => {
                              draft.value = draftFromItem(item, books);
                            }}
                          >
                            {t("custom-content-edit-item", {
                              defaultValue: "Edit",
                            })}
                          </button>
                          <button
                            type="button"
                            className="sb-cz-button"
                            disabled={
                              busy ||
                              (item.status !== "published" &&
                                item.references.length === 0)
                            }
                            onClick={() =>
                              void run(() =>
                                customContent.setItemPublished(
                                  item.id,
                                  item.status !== "published"
                                )
                              )
                            }
                          >
                            {item.status === "published"
                              ? t("custom-content-unpublish", {
                                  defaultValue: "Unpublish",
                                })
                              : t("custom-content-publish", {
                                  defaultValue: "Publish",
                                })}
                          </button>
                          <button
                            type="button"
                            className="sb-cz-icon-button"
                            disabled={busy}
                            aria-label={t("custom-content-delete-item", {
                              defaultValue: "Delete",
                            })}
                            onClick={() => {
                              confirmingDelete.value = item.id;
                            }}
                          >
                            <span className="material-symbols-outlined">
                              delete
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          )}
          {items.filter((item) => matchesFilter(item, filter.value)).length >
            visibleCount.value && (
            <button
              type="button"
              className="sb-cz-button"
              onClick={() => {
                visibleCount.value += PAGE_SIZE;
              }}
            >
              {t("custom-content-show-more", { defaultValue: "Show more" })}
            </button>
          )}
        </div>
      </section>

      <footer className="sb-cz-footer">
        {confirmingDeleteLibrary.value ? (
          <button
            type="button"
            className="sb-cz-button sb-cz-button-danger"
            disabled={busy}
            onClick={() => {
              confirmingDeleteLibrary.value = false;
              void run(() => customContent.deleteLibrary());
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            {t("custom-content-confirm-delete-library", {
              defaultValue: "Delete library and all its content",
            })}
          </button>
        ) : (
          <button
            type="button"
            className="sb-cz-button sb-cz-button-danger sb-cz-button-quiet"
            onClick={() => {
              confirmingDeleteLibrary.value = true;
            }}
          >
            <span className="material-symbols-outlined">delete</span>
            {t("custom-content-delete-library", {
              defaultValue: "Delete library",
            })}
          </button>
        )}
        <span className="sb-cz-footer-spacer" />
        <button
          type="button"
          className="sb-cz-button"
          disabled={busy}
          title={t("custom-content-rebuild-hint", {
            defaultValue:
              "Rewrites what Discover shows from your items, in case a publish was interrupted.",
          })}
          onClick={() =>
            void run(async () => {
              await customContent.rebuildIndex();
              state.app.toast(
                t("custom-content-rebuilt", {
                  defaultValue: "Discover is up to date",
                })
              );
            })
          }
        >
          {t("custom-content-rebuild", { defaultValue: "Rebuild index" })}
        </button>
      </footer>
    </div>
  );
}

function ItemForm(props: {
  state: SeedBibleState;
  draft: ItemDraft;
  books: TranslationBook[] | undefined;
  busy: boolean;
  onCancel: () => void;
  onSave: (input: ContentItemInput, publish: boolean) => Promise<void>;
}) {
  const { state, books, busy } = props;
  const { t } = useI18n();
  const form = useSignal<ItemDraft>(props.draft);
  const manifest = state.customContent.manifest.value;
  const parsed = parsePassages(form.value.verses, books);
  const isNew = !form.value.id;

  const set =
    (field: keyof ItemDraft) =>
    (event: Event): void => {
      const target = event.currentTarget as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement;
      form.value = { ...form.value, [field]: target.value };
    };

  const canSave =
    !busy &&
    form.value.url.trim() !== "" &&
    form.value.title.trim() !== "" &&
    parsed.unrecognized.length === 0;
  const canPublish = canSave && parsed.references.length > 0;

  const submit = (publish: boolean) => {
    const current = form.value;
    void props.onSave(
      {
        id: current.id,
        url: current.url,
        title: current.title,
        description: current.description,
        image: current.image,
        author: current.author,
        categoryIds: current.categoryId ? [current.categoryId] : [],
        references: parsed.references,
      },
      publish
    );
  };

  return (
    <div className="sb-settings-page sb-cz-page">
      <form
        className="sb-settings-section sb-cz-body"
        onSubmit={(event) => {
          event.preventDefault();
          if (form.value.published ? canPublish : canSave) {
            submit(form.value.published);
          }
        }}
      >
        <h3 className="sb-settings-subheading">
          {isNew
            ? t("custom-content-new-item", { defaultValue: "Add content" })
            : t("custom-content-edit-item-title", {
                defaultValue: "Edit content",
              })}
        </h3>
        <Field
          id="sb-ccl-url"
          label={t("custom-content-url", { defaultValue: "Link" })}
        >
          <input
            id="sb-ccl-url"
            type="url"
            className="sb-cz-input"
            required
            maxLength={2048}
            placeholder="https://"
            value={form.value.url}
            onInput={set("url")}
          />
        </Field>
        <Field
          id="sb-ccl-title"
          label={t("custom-content-title", { defaultValue: "Title" })}
        >
          <input
            id="sb-ccl-title"
            type="text"
            className="sb-cz-input"
            required
            maxLength={300}
            value={form.value.title}
            onInput={set("title")}
          />
        </Field>
        <Field
          id="sb-ccl-description"
          label={t("custom-content-description", {
            defaultValue: "Description",
          })}
        >
          <textarea
            id="sb-ccl-description"
            className="sb-cz-input sb-ccl-textarea"
            rows={4}
            maxLength={2000}
            value={form.value.description}
            onInput={set("description")}
          />
        </Field>
        <Field
          id="sb-ccl-verses"
          label={t("custom-content-verses", {
            defaultValue: "Passages it covers",
          })}
          hint={t("custom-content-verses-hint", {
            defaultValue:
              "Separate passages with a semicolon, e.g. John 10:1-18; Psalm 23",
          })}
        >
          <input
            id="sb-ccl-verses"
            type="text"
            className="sb-cz-input"
            value={form.value.verses}
            onInput={set("verses")}
            aria-invalid={parsed.unrecognized.length > 0}
            aria-describedby="sb-ccl-verses-status"
          />
        </Field>
        <p id="sb-ccl-verses-status" className="sb-cz-hint" aria-live="polite">
          {parsed.unrecognized.length > 0 ? (
            <span className="sb-ccl-error">
              {t("custom-content-verses-unrecognized", {
                passages: parsed.unrecognized.join("; "),
                defaultValue: "Not a passage we recognize: {{passages}}",
              })}
            </span>
          ) : parsed.references.length > 0 ? (
            t("custom-content-verses-recognized", {
              passages: parsed.references
                .map((reference) => formatReference(reference, books))
                .join("; "),
              defaultValue: "Shows on: {{passages}}",
            })
          ) : null}
        </p>
        <Field
          id="sb-ccl-category"
          label={t("custom-content-category", { defaultValue: "Category" })}
        >
          <select
            id="sb-ccl-category"
            className="sb-cz-input"
            value={form.value.categoryId}
            onChange={set("categoryId")}
          >
            <option value="">
              {t("custom-content-other", { defaultValue: "Other" })}
            </option>
            {manifest?.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="sb-ccl-author"
          label={t("custom-content-author", { defaultValue: "Author" })}
        >
          <input
            id="sb-ccl-author"
            type="text"
            className="sb-cz-input"
            maxLength={200}
            value={form.value.author}
            onInput={set("author")}
          />
        </Field>
        <Field
          id="sb-ccl-image"
          label={t("custom-content-image", {
            defaultValue: "Image link (optional)",
          })}
        >
          <input
            id="sb-ccl-image"
            type="url"
            className="sb-cz-input"
            maxLength={2048}
            placeholder="https://"
            value={form.value.image}
            onInput={set("image")}
          />
        </Field>
      </form>

      <footer className="sb-cz-footer">
        <button type="button" className="sb-cz-button" onClick={props.onCancel}>
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <span className="sb-cz-footer-spacer" />
        {form.value.published ? (
          <button
            type="button"
            className="sb-cz-button sb-cz-button-primary"
            disabled={!canPublish}
            onClick={() => submit(true)}
          >
            {t("save", { defaultValue: "Save" })}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="sb-cz-button"
              disabled={!canSave}
              onClick={() => submit(false)}
            >
              {t("custom-content-save-draft", { defaultValue: "Save draft" })}
            </button>
            <button
              type="button"
              className="sb-cz-button sb-cz-button-primary"
              disabled={!canPublish}
              onClick={() => submit(true)}
            >
              {t("custom-content-publish", { defaultValue: "Publish" })}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function Field(props: {
  id: string;
  label: string;
  hint?: string;
  children: ComponentChildren;
}) {
  return (
    <div className="sb-settings-field-row sb-ccl-field">
      <label className="sb-settings-field-label" htmlFor={props.id}>
        {props.label}
      </label>
      {props.children}
      {props.hint && <span className="sb-cz-hint">{props.hint}</span>}
    </div>
  );
}

/**
 * Bulk import: links pasted one per line, or a CSV. The import service fills
 * in each link's details in the background and adds it for review, so this
 * keeps going after the editor closes.
 */
function ImportPanel(props: {
  state: SeedBibleState;
  books: TranslationBook[] | undefined;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const { state, books, run } = props;
  const { customContent } = state;
  const { t } = useI18n();
  const links = useSignal("");
  const message = useSignal<string | null>(null);
  const isStarting = useSignal(false);
  const progress = customContent.importProgress.value;
  const active =
    progress?.status === "running" || progress?.status === "paused_signin";

  const start = async (parsed: ParsedImport) => {
    if (parsed.entries.length === 0) {
      message.value = t("custom-content-import-nothing", {
        defaultValue:
          "No links to import. Each link must start with http:// or https://.",
      });
      return;
    }
    isStarting.value = true;
    try {
      await run(async () => {
        const summary = await customContent.importEntries(parsed.entries, {
          books,
        });
        const notes = [
          t("custom-content-import-queued", {
            count: summary.queued,
            defaultValue: "{{count}} links are being imported.",
          }),
        ];
        const skipped = summary.alreadyInLibrary + parsed.duplicates;
        if (skipped > 0) {
          notes.push(
            t("custom-content-import-skipped", {
              count: skipped,
              defaultValue:
                "{{count}} were already in your library or listed twice.",
            })
          );
        }
        if (parsed.invalid.length > 0) {
          notes.push(
            t("custom-content-import-invalid", {
              count: parsed.invalid.length,
              defaultValue: "{{count}} weren't links and were left out.",
            })
          );
        }
        if (summary.unknownCategories.length > 0) {
          notes.push(
            t("custom-content-import-unknown-categories", {
              names: summary.unknownCategories.join(", "),
              defaultValue:
                "Categories not in your library were left off: {{names}}.",
            })
          );
        }
        if (summary.unrecognizedPassages.length > 0) {
          notes.push(
            t("custom-content-import-unknown-passages", {
              passages: summary.unrecognizedPassages.join("; "),
              defaultValue: "Passages we didn't recognize: {{passages}}.",
            })
          );
        }
        message.value = notes.join(" ");
        links.value = "";
      });
    } finally {
      isStarting.value = false;
    }
  };

  return (
    <div className="sb-ccl-import">
      {progress ? <ImportProgressBanner state={state} run={run} /> : null}
      {!active && (
        <>
          <label
            className="sb-settings-field-label"
            htmlFor="sb-ccl-import-links"
          >
            {t("custom-content-import-links", {
              defaultValue: "Import links, one per line",
            })}
          </label>
          <textarea
            id="sb-ccl-import-links"
            className="sb-cz-input sb-ccl-textarea"
            rows={4}
            placeholder={t("custom-content-import-links-placeholder", {
              defaultValue:
                "https://www.youtube.com/watch?v=…\nhttps://example.org/sermons/…",
            })}
            value={links.value}
            onInput={(event) => {
              links.value = (event.currentTarget as HTMLTextAreaElement).value;
            }}
          />
          <div className="sb-ccl-import-actions">
            <button
              type="button"
              className="sb-cz-button sb-cz-button-primary"
              disabled={isStarting.value || !links.value.trim()}
              onClick={() => void start(parsePastedLinks(links.value))}
            >
              {t("custom-content-import-start", {
                defaultValue: "Import links",
              })}
            </button>
            <label className="sb-cz-button sb-ccl-file">
              {t("custom-content-import-csv", { defaultValue: "Upload CSV" })}
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                disabled={isStarting.value}
                onChange={async (event) => {
                  const input = event.currentTarget as HTMLInputElement;
                  const file = input.files?.[0];
                  input.value = "";
                  if (!file) {
                    return;
                  }
                  const parsed = parseImportCsv(await file.text());
                  if (!parsed) {
                    message.value = t("custom-content-import-csv-no-url", {
                      defaultValue:
                        'The CSV needs a header row with a "url" column.',
                    });
                    return;
                  }
                  await start(parsed);
                }}
              />
            </label>
          </div>
          <p className="sb-cz-hint">
            {t("custom-content-import-csv-hint", {
              defaultValue:
                "A CSV can also have title, description, author, categories and passages columns. Separate several categories or passages with a semicolon.",
            })}
          </p>
        </>
      )}
      {message.value && (
        <p className="sb-cz-hint" role="status">
          {message.value}
        </p>
      )}
    </div>
  );
}

function ImportProgressBanner(props: {
  state: SeedBibleState;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const { state, run } = props;
  const { t } = useI18n();
  const progress = state.customContent.importProgress.value;
  if (!progress) {
    return null;
  }
  const settled = progress.done + progress.failed;
  const percent =
    progress.total > 0 ? Math.round((settled / progress.total) * 100) : 0;

  if (progress.status === "paused_signin") {
    return (
      <div className="sb-ccl-progress" role="status">
        <p className="sb-ccl-progress-text">
          {t("custom-content-import-paused", {
            settled,
            total: progress.total,
            defaultValue:
              "This import paused at {{settled}} of {{total}} because your session ended. Continue it with your current session?",
          })}
        </p>
        <div className="sb-ccl-import-actions">
          <button
            type="button"
            className="sb-cz-button sb-cz-button-primary"
            onClick={() => void run(() => state.customContent.resumeImport())}
          >
            {t("custom-content-import-resume", { defaultValue: "Continue" })}
          </button>
          <button
            type="button"
            className="sb-cz-button"
            onClick={() => void run(() => state.customContent.cancelImport())}
          >
            {t("custom-content-import-cancel", {
              defaultValue: "Cancel import",
            })}
          </button>
        </div>
      </div>
    );
  }

  if (progress.status === "running") {
    return (
      <div className="sb-ccl-progress" role="status">
        <p className="sb-ccl-progress-text">
          {t("custom-content-import-running", {
            settled,
            total: progress.total,
            failed: progress.failed,
            defaultValue:
              "Importing {{settled}} of {{total}} · {{failed}} failed. This keeps going if you close this page.",
          })}
        </p>
        <div
          className="sb-ccl-progress-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div style={{ width: `${percent}%` }} />
        </div>
        <button
          type="button"
          className="sb-cz-button sb-cz-button-quiet"
          onClick={() => void run(() => state.customContent.cancelImport())}
        >
          {t("custom-content-import-cancel", { defaultValue: "Cancel import" })}
        </button>
      </div>
    );
  }

  return (
    <p className="sb-ccl-progress-text" role="status">
      {progress.status === "done"
        ? t("custom-content-import-done", {
            done: progress.done,
            failed: progress.failed,
            defaultValue:
              "Import finished: {{done}} added for review, {{failed}} couldn't be imported.",
          })
        : t("custom-content-import-stopped", {
            done: progress.done,
            defaultValue:
              "Import stopped after adding {{done}} links for review.",
          })}
    </p>
  );
}

/** A passage, marked by where it came from so the owner knows what to check. */
function ReferenceChip(props: {
  reference: ContentReference;
  books: TranslationBook[] | undefined;
}) {
  const { reference, books } = props;
  const { t } = useI18n();
  const unsure =
    reference.source === "ai" && reference.confidence < CONFIDENT_PASSAGE;
  const origin =
    reference.source === "explicit"
      ? t("custom-content-ref-explicit", {
          defaultValue: "Named in the content",
        })
      : reference.source === "ai"
        ? unsure
          ? t("custom-content-ref-unsure", {
              percent: Math.round(reference.confidence * 100),
              defaultValue: "Suggested, {{percent}}% sure. Please check it.",
            })
          : t("custom-content-ref-ai", {
              percent: Math.round(reference.confidence * 100),
              defaultValue: "Suggested, {{percent}}% sure",
            })
        : t("custom-content-ref-owner", { defaultValue: "Added by you" });
  return (
    <span
      className={`sb-ccl-ref sb-ccl-ref-${unsure ? "unsure" : reference.source}`}
      title={origin}
    >
      {formatReference(reference, books)}
      {unsure ? " ?" : ""}
      <span className="sr-only"> ({origin})</span>
    </span>
  );
}

/**
 * Which chat provider suggests categories and passages for imported items.
 * The provider itself (an extension such as Apologist, with its key and
 * agent) is set up under Extensions, the same as for chat.
 */
function AiSuggestionsSettings(props: {
  state: SeedBibleState;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const { state, run } = props;
  const { customContent } = state;
  const { t } = useI18n();
  const manifest = customContent.manifest.value;
  if (!manifest) {
    return null;
  }
  const providers = customContent.classifierProviders.value;
  const chosen = manifest.classifierProviderId ?? "";
  const missing = chosen !== "" && !providers.some((p) => p.id === chosen);

  return (
    <div className="sb-cz-group">
      <h3 className="sb-settings-subheading">
        {t("custom-content-ai", { defaultValue: "AI suggestions" })}
      </h3>
      <div className="sb-settings-field-row sb-ccl-field">
        <label className="sb-settings-field-label" htmlFor="sb-ccl-classifier">
          {t("custom-content-ai-provider", {
            defaultValue: "Suggest categories and passages with",
          })}
        </label>
        <select
          id="sb-ccl-classifier"
          className="sb-cz-input"
          value={chosen}
          disabled={customContent.isSaving.value}
          onChange={(event) => {
            const value = (event.currentTarget as HTMLSelectElement).value;
            void run(() => customContent.setClassifier(value || null));
          }}
        >
          <option value="">
            {t("custom-content-ai-none", {
              defaultValue: "No AI: only passages named in the content",
            })}
          </option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {translateTitle(t, provider.name)}
            </option>
          ))}
          {missing && <option value={chosen}>{chosen}</option>}
        </select>
        <span className="sb-cz-hint">
          {missing
            ? t("custom-content-ai-missing", {
                defaultValue:
                  "The chosen agent isn't available. Turn its extension on under Extensions.",
              })
            : providers.length === 0
              ? t("custom-content-ai-none-available", {
                  defaultValue:
                    "No installed agent can suggest yet. Turn on an agent such as Apologist under Extensions, with its key.",
                })
              : t("custom-content-ai-hint", {
                  defaultValue:
                    "Set up the agent and its key under Extensions, the same as for chat.",
                })}
        </span>
      </div>
      <label className="sb-ccl-checkbox">
        <input
          type="checkbox"
          checked={manifest.autoPublish === true}
          disabled={customContent.isSaving.value || chosen === ""}
          onChange={(event) => {
            const checked = (event.currentTarget as HTMLInputElement).checked;
            void run(() => customContent.setAutoPublish(checked));
          }}
        />
        {t("custom-content-ai-auto-publish", {
          defaultValue:
            "Publish imported items without review when every passage is named in the content or a confident suggestion",
        })}
      </label>
    </div>
  );
}

/** New categories the AI thought would fit, gathered across items, for the owner to add or ignore. */
function SuggestedCategories(props: {
  state: SeedBibleState;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
}) {
  const { state, run } = props;
  const { customContent } = state;
  const { t } = useI18n();
  const dismissed = useSignal<readonly string[]>([]);
  const manifest = customContent.manifest.value;
  if (!manifest) {
    return null;
  }
  const existing = new Set(
    manifest.categories.map((c) => c.name.trim().toLowerCase())
  );
  const counts = new Map<string, number>();
  for (const item of customContent.items.value) {
    for (const name of item.classification?.suggestedCategories ?? []) {
      const key = name.toLowerCase();
      if (!existing.has(key) && !dismissed.value.includes(key)) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
  }
  const suggestions = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <ul
      className="sb-ccl-suggestions"
      aria-label={t("custom-content-suggested-categories", {
        defaultValue: "Suggested categories",
      })}
    >
      {suggestions.map(([name, count]) => (
        <li key={name} className="sb-ccl-suggestion">
          <span>
            {t("custom-content-suggested-category", {
              name,
              count,
              defaultValue: "Suggested category: {{name}} ({{count}} items)",
            })}
          </span>
          <button
            type="button"
            className="sb-cz-button"
            onClick={() => void run(() => customContent.addCategory(name))}
          >
            {t("custom-content-add-category", { defaultValue: "Add" })}
          </button>
          <button
            type="button"
            className="sb-cz-button sb-cz-button-quiet"
            onClick={() => {
              dismissed.value = [...dismissed.value, name.toLowerCase()];
            }}
          >
            {t("custom-content-dismiss", { defaultValue: "Dismiss" })}
          </button>
        </li>
      ))}
    </ul>
  );
}
