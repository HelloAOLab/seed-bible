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
import { BOOK_SLUGS, type BookId } from "../../managers/BibleDataManager";
import { parseSingleVerseReference } from "../../managers/parseVerseReference";
import { isVerseReferenceInBounds } from "../../managers/verseReferenceBounds";
import { formatRefLabel } from "../ScriptureItemInput/scriptureSuggestions";
import { useI18n } from "../../i18n/I18nManager";

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

/**
 * The book's name in the open translation, or, with no translation open,
 * an English name built from its URL slug ("1-john" → "1 John").
 */
function bookName(bookId: string, books: TranslationBook[] | undefined) {
  const fromTranslation = books?.find((book) => book.id === bookId)?.commonName;
  if (fromTranslation) {
    return fromTranslation;
  }
  const slug = BOOK_SLUGS[bookId as BookId];
  if (!slug) {
    return bookId;
  }
  return slug
    .split("-")
    .map((word) =>
      word === "of" ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}

function formatReference(
  reference: ContentReference,
  books: TranslationBook[] | undefined
): string {
  return `${bookName(reference.book, books)} ${formatRefLabel({
    bookId: reference.book,
    chapter: reference.chapter,
    endChapter: reference.endChapter,
    verse: reference.verse,
    endVerse: reference.endVerse,
  })}`;
}

/** Reads the typed references; anything that isn't a real passage is reported back as typed. */
function parseReferences(
  text: string,
  books: TranslationBook[] | undefined
): { references: ContentReference[]; unrecognized: string[] } {
  const references: ContentReference[] = [];
  const unrecognized: string[] = [];
  for (const part of text.split(/[;\n]/)) {
    const typed = part.trim();
    if (!typed) {
      continue;
    }
    const parsed = parseSingleVerseReference(typed, books);
    if (
      !parsed ||
      !isVerseReferenceInBounds(
        parsed.bookId,
        parsed.chapter,
        parsed.verse,
        parsed.endChapter,
        parsed.endVerse,
        books
      )
    ) {
      unrecognized.push(typed);
      continue;
    }
    references.push({
      book: parsed.bookId,
      chapter: parsed.chapter,
      ...(parsed.endChapter !== undefined
        ? { endChapter: parsed.endChapter }
        : {}),
      ...(parsed.verse !== undefined ? { verse: parsed.verse } : {}),
      ...(parsed.endVerse !== undefined ? { endVerse: parsed.endVerse } : {}),
      source: "owner",
      confidence: 1,
    });
  }
  return { references, unrecognized };
}

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
  const chapterCount = Object.keys(manifest.chapters).length;
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
          {items.length === 0 ? (
            <p className="sb-cz-hint">
              {t("custom-content-no-items", {
                defaultValue:
                  "Nothing here yet. Add a link and the passages it covers.",
              })}
            </p>
          ) : (
            <ul className="sb-ccl-items">
              {items.map((item) => (
                <li key={item.id} className="sb-ccl-item">
                  <div className="sb-ccl-item-text">
                    <span className="sb-ccl-item-title" dir="auto">
                      {item.title || displayUrl(item.url)}
                    </span>
                    <span className="sb-ccl-item-meta">
                      <span
                        className={`sb-ccl-status sb-ccl-status-${item.status}`}
                      >
                        {item.status === "published"
                          ? t("custom-content-status-published", {
                              defaultValue: "Published",
                            })
                          : t("custom-content-status-draft", {
                              defaultValue: "Draft",
                            })}
                      </span>
                      <span dir="auto">{displayUrl(item.url)}</span>
                    </span>
                    <span className="sb-ccl-item-meta">
                      {[
                        ...item.categoryIds
                          .map(categoryName)
                          .filter((name): name is string => !!name),
                        ...item.references.map((reference) =>
                          formatReference(reference, books)
                        ),
                      ].join(" · ") ||
                        t("custom-content-no-verses", {
                          defaultValue: "No passages yet",
                        })}
                    </span>
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
  const parsed = parseReferences(form.value.verses, books);
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
