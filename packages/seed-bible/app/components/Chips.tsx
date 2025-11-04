const { useState } = os.appHooks;

function SharePopup({
  shareUrl,
  shareTitle,
  popupTitle = "Share this",
  copyButtonText = "Copy",
  copiedButtonText = "Copied!",
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const url = shareUrl || window.location.href;
  const title = shareTitle || "Check this out!";

  const platforms = [
    {
      name: "Facebook",
      color: "#1877F2",
      share: () =>
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "Twitter",
      color: "#000000",
      share: () =>
        window.open(
          `https://twitter.com/intent/tweet?url=${encodeURIComponent(
            url
          )}&text=${encodeURIComponent(title)}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      color: "#0A66C2",
      share: () =>
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            url
          )}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "WhatsApp",
      color: "#25D366",
      share: () =>
        window.open(
          `https://wa.me/?text=${encodeURIComponent(title + " " + url)}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      color: "#26A5E4",
      share: () =>
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(
            url
          )}&text=${encodeURIComponent(title)}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
    {
      name: "Reddit",
      color: "#FF4500",
      share: () =>
        window.open(
          `https://reddit.com/submit?url=${encodeURIComponent(
            url
          )}&title=${encodeURIComponent(title)}`,
          "_blank"
        ),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
    },
    {
      name: "Email",
      color: "#EA4335",
      share: () =>
        (window.location.href = `mailto:?subject=${encodeURIComponent(
          title
        )}&body=${encodeURIComponent(url)}`),
      svg: (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ width: 24, height: 24 }}
        >
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
        </svg>
      ),
    },
  ];

  const copyLink = async () => {
    try {
      os.setClipboard(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const ShareIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 20, height: 20 }}
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );

  const CloseIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 20, height: 20 }}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  const CopyIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 16, height: 16 }}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const CheckIcon = () => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ width: 16, height: 16 }}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <>
      <div
        onClick={() => setIsOpen(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          animation: "fadeIn 0.2s",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: 32,
            maxWidth: 450,
            width: "90%",
            position: "relative",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            animation: "slideUp 0.3s",
          }}
        >
          <button
            onClick={() => {
              closePopupSettings();
            }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 8,
              borderRadius: 8,
              transition: "background 0.2s",
            }}
          >
            <CloseIcon />
          </button>

          <h2
            style={{
              margin: "0 0 24px 0",
              fontSize: 24,
              fontWeight: 700,
              color: "#1a1a1a",
            }}
          >
            {popupTitle}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {platforms.map((p) => (
              <button
                key={p.name}
                onClick={p.share}
                style={{
                  background: "#f8f9fa",
                  border: "none",
                  borderRadius: 12,
                  padding: 16,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: p.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                  }}
                >
                  {p.svg}
                </div>
                <span style={{ fontSize: 12, fontWeight: 500, color: "#666" }}>
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <div
            style={{
              background: "#f8f9fa",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              readOnly
              value={url}
              style={{
                flex: 1,
                background: "none",
                border: "none",
                fontSize: 14,
                color: "#666",
                outline: "none",
                padding: 4,
              }}
            />
            <button
              onClick={copyLink}
              style={{
                background: copied ? "#10b981" : "#667eea",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                transition: "background 0.2s",
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? copiedButtonText : copyButtonText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        button:hover {
          transform: scale(1.02);
        }
        button:active {
          transform: scale(0.98);
        }
      `}</style>
    </>
  );
}

const QRCodeComponent = ({ url = "https://example.com/session/12345" }) => {
  const [copied, setCopied] = useState(false);
  
  // Generate QR code URL using a free API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${url.toString()}`;
  
  const handleCopy = async () => {
    os.setClipboard(url)
  };
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      // minHeight: '100vh',
      // background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      // fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{
          textAlign: 'center',
          color: '#333',
          marginTop: 0,
          marginBottom: '30px',
          fontSize: '24px',
          fontWeight: '600'
        }}>
          Session QR Code
        </h2>
        
        <div style={{
          background: '#f8f9fa',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <img 
            src={qrCodeUrl} 
            alt="QR Code"
            style={{
              width: '200px',
              height: '200px',
              display: 'block'
            }}
          />
        </div>
        
        <div style={{
          background: '#f1f3f5',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '14px',
          color: '#495057',
          wordBreak: 'break-all',
          fontFamily: 'monospace'
        }}>
          {url}
        </div>
        
        <button
          onClick={handleCopy}
          style={{
            width: '100%',
            padding: '14px',
            background: copied ? '#28a745' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            transform: copied ? 'scale(0.98)' : 'scale(1)',
            boxShadow: copied ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.target.style.background = '#5568d3';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.target.style.background = '#667eea';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
            }
          }}
        >
          {copied ? '✓ Copied!' : 'Copy Session Link'}
        </button>
      </div>
    </div>
  );
};
return {SharePopup,QRCodeComponent};
