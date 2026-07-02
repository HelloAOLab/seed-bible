export const TAB_STYLES = {
  tabsContainer: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.25rem",
    backgroundColor: "#F0F1F1",
    width: "100%",
    padding: "0.60rem",
    borderRadius: "4px",
    margin: "1rem 0",
  },
  tab: {
    padding: "0.75rem 1.25rem",
    cursor: "pointer",
    borderRadius: "5px",
    backgroundColor: "#f0f0f0",
    color: "#333",
    fontWeight: "bold",
    transition: "background-color 0.3s, color 0.3s",
    textAlign: "center",
  },
  activeTab: {
    backgroundColor: "#fff",
    color: "#D36433",
  },
} as const;
