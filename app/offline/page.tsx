export default function OfflinePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        gap: "1rem",
        textAlign: "center",
        padding: "2rem",
        fontFamily: "var(--font-ibm-plex, system-ui, sans-serif)",
        color: "#E6ECEA",
        background: "#060809",
      }}
    >
      <i className="ph-bold ph-wifi-slash" style={{ fontSize: "3rem", color: "#38E07B" }} />
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>Sin conexión</h1>
      <p style={{ margin: 0, opacity: 0.6, maxWidth: "280px" }}>
        Revisa tu conexión a internet e inténtalo de nuevo.
      </p>
    </div>
  );
}
