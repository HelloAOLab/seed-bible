export function WelcomeModal({
  onContinue,
  onDismiss,
}: {
  onContinue: () => void;
  onDismiss: () => void;
}) {
  return (
    <>
      <div
        onClick={onDismiss}
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
          width: "500px",
          maxWidth: "90vw",
          backgroundColor: "#fff",
          borderRadius: "12px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
          fontFamily: "'DM Sans', 'Satoshi', system-ui, sans-serif",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          padding: "50px 32px 32px",
          // height: "310px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <img
            src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1767786038/Seed_Bible_-_All_Logos_2025-04_dd6je1.png"
            style={{
              height: "48px",
              objectFit: "contain",
            }}
            alt="Seed Bible"
          />
        </div>

        {/* Title */}
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "22px",
            fontWeight: 600,
            color: "#1a1a1a",
            textAlign: "center",
            fontFamily: "'Satoshi', 'DM Sans', system-ui, sans-serif",
          }}
        >
          Welcome to Seed Bible
        </h2>

        {/* Description */}
        <p
          style={{
            margin: "0 0 32px",
            fontSize: "15px",
            lineHeight: 1.5,
            color: "#666",
            textAlign: "center",
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          This scripture session is temporary and will erase in
          <br />
          12 hours for your privacy.
        </p>

        {/* Continue button */}
        <button
          onClick={onContinue}
          style={{
            width: "40%",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "var(--selectedSpaceColor, #d36433)",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'Satoshi', 'DM Sans', system-ui, sans-serif",
          }}
        >
          Continue
        </button>
      </div>
    </>
  );
}
