const { useState, useMemo } = os.appHooks;
import {
  availableLanguages,
  changeLanguage,
  getBrowserLanguage,
} from "app.hooks.i18n";

const LANG_META: Record<string, { cc: string; display: string }> = {
  am: { cc: "et", display: "Amharic" },
  ar: { cc: "sa", display: "Arabic" },
  bn: { cc: "bd", display: "Bengali" },
  zh: { cc: "cn", display: "Chinese" },
  en: { cc: "us", display: "English \u2013 US" },
  fr: { cc: "fr", display: "French" },
  hi: {
    cc: "in",
    display: "Hindi \u2013 \u0939\u093f\u0928\u094d\u0926\u0940",
  },
  iid: { cc: "id", display: "Indonesian" },
  ja: { cc: "jp", display: "Japanese" },
  ko: { cc: "kr", display: "Korean" },
  mn: { cc: "mn", display: "Mongolian" },
  ne: { cc: "np", display: "Nepali" },
  ps: { cc: "af", display: "Pashto" },
  fa: { cc: "ir", display: "Persian" },
  pt: { cc: "br", display: "Portuguese" },
  ru: { cc: "ru", display: "Russian" },
  es: { cc: "es", display: "Spanish" },
  sw: { cc: "tz", display: "Swahili" },
  ti: { cc: "er", display: "Tigrinya" },
  tr: { cc: "tr", display: "Turkish" },
  uk: { cc: "ua", display: "Ukrainian" },
  ur: { cc: "pk", display: "Urdu" },
  ug: { cc: "cn", display: "Uyghur" },
  vi: { cc: "vn", display: "Vietnamese" },
};

const FlagImg = ({ cc }: { cc: string }) => (
  <img
    src={`https://flagcdn.com/w40/${cc}.png`}
    alt=""
    style={{
      width: "28px",
      height: "28px",
      borderRadius: "50%",
      objectFit: "cover",
      flexShrink: 0,
    }}
  />
);

export function LanguageSelectModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const detectedCode = getBrowserLanguage();
  const [selectedLang, setSelectedLang] = useState(detectedCode);
  const [search, setSearch] = useState("");

  const detectedMeta = LANG_META[detectedCode];
  const detectedLangInfo = availableLanguages.find(
    (l) => l.code === detectedCode
  );

  const otherLanguages = useMemo(() => {
    const filtered = availableLanguages.filter((l) => l.code !== detectedCode);
    if (!search.trim()) return filtered;
    const q = search.toLowerCase();
    return filtered.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        (LANG_META[l.code]?.display || "").toLowerCase().includes(q)
    );
  }, [search, detectedCode]);

  const handleContinue = () => {
    changeLanguage(selectedLang);
    localStorage.setItem("seedBibleLangSelected", "true");
    onComplete();
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9998,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "420px",
          maxWidth: "92vw",
          maxHeight: "85vh",
          backgroundColor: "#fff",
          borderRadius: "16px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'DM Sans', 'Satoshi', system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "28px 28px 20px",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              margin: "0 0 4px",
              fontSize: "22px",
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            Select your language
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#666",
            }}
          >
            Select your language for reading and translating
          </p>
        </div>

        {/* Detected language */}
        <div style={{ padding: "0 28px" }}>
          <p
            style={{
              margin: "0 0 10px",
              fontSize: "14px",
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            Based on your location
          </p>
          <div
            onClick={() => setSelectedLang(detectedCode)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              cursor: "pointer",
              backgroundColor:
                selectedLang === detectedCode ? "#fdf6ef" : "#f5f5f5",
              border:
                selectedLang === detectedCode
                  ? "1.5px solid var(--selectedSpaceColor)"
                  : "1.5px solid transparent",
            }}
          >
            {detectedMeta?.cc && <FlagImg cc={detectedMeta.cc} />}
            <span
              style={{ fontSize: "15px", fontWeight: 500, color: "#1a1a1a" }}
            >
              {detectedMeta?.display ||
                detectedLangInfo?.nativeName ||
                "English"}
            </span>
            {selectedLang === detectedCode && (
              <span
                className="material-symbols-outlined"
                style={{
                  marginLeft: "auto",
                  color: "var(--selectedSpaceColor)",
                  fontSize: "22px",
                }}
              >
                check_circle
              </span>
            )}
          </div>
        </div>

        {/* Other languages */}
        <div
          style={{
            padding: "16px 28px 0",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
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
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "#1a1a1a",
              }}
            >
              Other languages
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "13px",
                backgroundColor: "#fafafa",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "16px", color: "#999" }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search"
                value={search}
                onInput={(e: any) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  fontSize: "13px",
                  width: "80px",
                  color: "#1a1a1a",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div
            style={{
              overflowY: "auto",
              flex: 1,
              maxHeight: "220px",
              borderRadius: "12px",
              backgroundColor: "#f5f5f5",
            }}
          >
            {otherLanguages.map((lang) => {
              const meta = LANG_META[lang.code];
              const isSelected = selectedLang === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#fdf6ef" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected)
                      (
                        e.currentTarget as HTMLDivElement
                      ).style.backgroundColor = "#ebebeb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected)
                      (
                        e.currentTarget as HTMLDivElement
                      ).style.backgroundColor = "transparent";
                  }}
                >
                  {meta?.cc && <FlagImg cc={meta.cc} />}
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: isSelected ? 600 : 400,
                      color: "#1a1a1a",
                    }}
                  >
                    {meta?.display || lang.nativeName}
                  </span>
                  {isSelected && (
                    <span
                      className="material-symbols-outlined"
                      style={{
                        marginLeft: "auto",
                        color: "var(--selectedSpaceColor)",
                        fontSize: "22px",
                      }}
                    >
                      check_circle
                    </span>
                  )}
                </div>
              );
            })}
            {otherLanguages.length === 0 && (
              <div
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#999",
                  fontSize: "14px",
                }}
              >
                No languages found
              </div>
            )}
          </div>
        </div>

        {/* Continue button */}
        <div style={{ padding: "20px 28px 28px" }}>
          <button
            onClick={handleContinue}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "28px",
              border: "none",
              backgroundColor: "var(--selectedSpaceColor)",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </>
  );
}
