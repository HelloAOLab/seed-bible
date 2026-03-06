import type {
  AvailableTranslations,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";

const { useMemo, useState } = os.appHooks;

interface BibleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  translationId: string | null;
  bookId: string | null;
  availableTranslations: AvailableTranslations | null;
  translationBooks: TranslationBooks | null;
  loading: boolean;
  onSelectTranslation: (translation: string) => void;
  onSelectBook: (book: string) => void;
}

function groupBooks(translationBooks: TranslationBooks | null, search: string) {
  if (!translationBooks) {
    return {
      oldTestament: [] as TranslationBooks["books"],
      newTestament: [] as TranslationBooks["books"],
    };
  }

  const loweredSearch = search.trim().toLowerCase();
  const filteredBooks = loweredSearch
    ? translationBooks.books.filter(
        (book) =>
          book.name.toLowerCase().includes(loweredSearch) ||
          book.commonName.toLowerCase().includes(loweredSearch)
      )
    : translationBooks.books;

  return {
    oldTestament: filteredBooks.filter((book) => book.order <= 39),
    newTestament: filteredBooks.filter((book) => book.order > 39),
  };
}

export function BibleSelector(props: BibleSelectorProps) {
  const {
    isOpen,
    onClose,
    translationId,
    bookId,
    availableTranslations,
    translationBooks,
    loading,
    onSelectTranslation,
    onSelectBook,
  } = props;

  const [search, setSearch] = useState("");

  const { oldTestament, newTestament } = useMemo(
    () => groupBooks(translationBooks, search),
    [translationBooks, search]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          border: "1px solid #d8d8d8",
          borderRadius: "12px",
          padding: "12px",
          background: "#f7f7f7",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <strong>Select Bible Book</strong>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #d2d2d2",
              borderRadius: "6px",
              padding: "4px 8px",
              background: "#f0f0f0",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <select
            value={translationId ?? ""}
            disabled={loading || !availableTranslations}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              onSelectTranslation(target.value);
            }}
            style={{
              minWidth: "96px",
              border: "1px solid #d2d2d2",
              borderRadius: "6px",
              padding: "6px 8px",
              background: "#f0f0f0",
            }}
          >
            {(availableTranslations?.translations ?? []).map((translation) => (
              <option key={translation.id} value={translation.id}>
                {translation.id}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              setSearch(target.value);
            }}
            placeholder="Search book..."
            style={{
              flex: 1,
              border: "1px solid #d2d2d2",
              borderRadius: "6px",
              padding: "6px 10px",
              background: "#f0f0f0",
            }}
          />

          <div
            style={{
              border: "1px solid #d2d2d2",
              borderRadius: "6px",
              padding: "6px 10px",
              background: "#f0f0f0",
              color: "#666",
              whiteSpace: "nowrap",
            }}
          >
            All books
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div
            style={{ borderRight: "1px solid #e2e2e2", paddingRight: "12px" }}
          >
            <h4 style={{ marginTop: 0, marginBottom: "10px" }}>
              Old Testament
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px 10px",
              }}
            >
              {oldTestament.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  disabled={loading}
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: "4px 4px",
                    color: book.id === bookId ? "#111" : "#555",
                    fontWeight: book.id === bookId ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {book.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ marginTop: 0, marginBottom: "10px" }}>
              New Testament
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px 10px",
              }}
            >
              {newTestament.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  disabled={loading}
                  style={{
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: "4px 4px",
                    color: book.id === bookId ? "#111" : "#555",
                    fontWeight: book.id === bookId ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  {book.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
