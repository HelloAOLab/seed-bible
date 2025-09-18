
/**
 * Upload panel for creating a dependency made of multiple bot tags.
 *
 * Props:
 * - show: boolean
 * - onClose: () => void
 * - styles: object (same styles object used in PackageManager)
 * - dependencyUpload: { name, description, bots: Array<{botTag:string, notes?:string}> }
 * - setDependencyUpload: (updater) => void
 * - loading: boolean
 * - onUpload: () => void  // usually calls uploadDependency()
 * - validateBotTag: (tag: string) => boolean | 'error'
 *    Return true if bot exists, false if not found, or 'error' if validation failed unexpectedly.
 */
export const DependencyUploadPanel = ({
  show,
  onClose,
  styles,
  dependencyUpload,
  setDependencyUpload,
  loading,
  onUpload,
  validateBotTag,
}) => {
  if (!show) return null;

  const addBotRow = () => {
    setDependencyUpload((prev) => ({
      ...prev,
      bots: [...(prev.bots || []), { botTag: "", notes: "" }],
    }));
  };

  const removeBotRow = (index) => {
    setDependencyUpload((prev) => ({
      ...prev,
      bots: prev.bots.filter((_, i) => i !== index),
    }));
  };

  const updateBotRow = (index, field, value) => {
    setDependencyUpload((prev) => ({
      ...prev,
      bots: prev.bots.map((b, i) => (i === index ? { ...b, [field]: value } : b)),
    }));
  };

  const disabled =
    loading ||
    !dependencyUpload?.name?.trim() ||
    (dependencyUpload?.bots?.length ?? 0) === 0;

  return (
    <div style={styles.uploadPanelOverlay}>
      <div style={styles.uploadPanel}>
        <div style={styles.uploadPanelHeader}>
          <h3>📤 Upload Bot Dependencies</h3>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        <div style={styles.uploadForm}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Dependency Name *</label>
            <input
              type="text"
              value={dependencyUpload.name}
              onChange={(e) =>
                setDependencyUpload((prev) => ({ ...prev, name: e.target.value }))
              }
              style={styles.input}
              placeholder="e.g., 'UI Components', 'Helper Bots', 'Authentication System'"
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Description</label>
            <textarea
              value={dependencyUpload.description}
              onChange={(e) =>
                setDependencyUpload((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              style={styles.textarea}
              placeholder="Describe this dependency collection..."
              rows="3"
            />
          </div>

          <div style={styles.multipleBotSection}>
            <div style={styles.multipleBotHeader}>
              <h4>🤖 Bot Tags</h4>
              <button onClick={addBotRow} style={styles.addBotButton}>
                ➕ Add Bot
              </button>
            </div>

            {(dependencyUpload.bots?.length ?? 0) === 0 && (
              <div style={styles.emptyBotsMessage}>
                <p>No bots added yet. Click "Add Bot" to start.</p>
              </div>
            )}

            {(dependencyUpload.bots ?? []).map((bot, index) => {
              const trimmed = bot.botTag?.trim();
              let validationBlock = null;

              if (trimmed) {
                let verdict;
                try {
                  verdict = validateBotTag(trimmed);
                } catch {
                  verdict = "error";
                }

                validationBlock =
                  verdict === true ? (
                    <div style={styles.botValidSuccess}>
                      <span>✅ Bot found: {trimmed}</span>
                    </div>
                  ) : verdict === false ? (
                    <div style={styles.botValidError}>
                      <span>❌ Bot not found: {trimmed}</span>
                    </div>
                  ) : (
                    <div style={styles.botValidError}>
                      <span>❌ Error validating bot: {trimmed}</span>
                    </div>
                  );
              }

              return (
                <div key={index} style={styles.botUploadItem}>
                  <div style={styles.botUploadHeader}>
                    <span style={styles.botNumber}>Bot #{index + 1}</span>
                    <button onClick={() => removeBotRow(index)} style={styles.removeBotButton}>
                      ✕
                    </button>
                  </div>

                  <div style={styles.botUploadFields}>
                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Bot Tag *</label>
                      <input
                        type="text"
                        value={bot.botTag}
                        onChange={(e) => updateBotRow(index, "botTag", e.target.value)}
                        style={styles.input}
                        placeholder="#botTag"
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.label}>Notes (optional)</label>
                      <input
                        type="text"
                        value={bot.notes}
                        onChange={(e) => updateBotRow(index, "notes", e.target.value)}
                        style={styles.input}
                        placeholder="Optional notes for this bot"
                      />
                    </div>
                  </div>

                  {trimmed && <div style={styles.botValidation}>{validationBlock}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.uploadPanelActions}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={onUpload}
            style={styles.uploadButton}
            disabled={disabled}
          >
            {loading
              ? "⏳ Uploading..."
              : `📤 Upload Dependency (${dependencyUpload.bots?.length ?? 0} bot${
                  (dependencyUpload.bots?.length ?? 0) !== 1 ? "s" : ""
                })`}
          </button>
        </div>
      </div>
    </div>
  );
};
