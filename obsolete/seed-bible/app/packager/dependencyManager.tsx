
/**
 * Lists uploaded dependencies and lets the user link/unlink them to the current package.
 *
 * Props:
 * - styles: object
 * - uploadedDependencies: Array<{
 *     id:number|string, name:string, description?:string,
 *     type:'package'|'bot'|'link', version?:string, botTag?:string, source?:string
 *   }>
 * - currentPackage: { dependencies: Array<number|string> }
 * - onToggleLink: (depId) => void
 * - onDelete: (depId) => void
 * - onOpenUpload: () => void  // open the upload panel
 */
export const DependencyManager = ({
    styles,
    uploadedDependencies,
    currentPackage,
    onToggleLink,
    onDelete,
    onOpenUpload,
}) => {
    const getIcon = (type) => {
        switch (type) {
            case "package":
                return "📦";
            case "dependency":
                return "🤖";
            case "link":
                return "🔗";
            default:
                return "📦";
        }
    };

    const deps = uploadedDependencies || [];
    const linkedIds = new Set(
        (currentPackage?.dependencies || []).map(d => typeof d === 'object' ? d.depId : d)
    );

    return (
        <div style={styles.dependencyManager}>
            <div style={styles.dependencyManagerHeader}>
                <h4>🔗 Link Dependencies</h4>
                <button onClick={onOpenUpload} style={styles.addButton}>
                    📤 Upload New
                </button>
            </div>

            {deps.length === 0 ? (
                <div style={styles.emptyDependencies}>
                    <div style={styles.emptyIcon}>📦</div>
                    <p>No dependencies uploaded yet</p>
                    <small>Upload dependencies to link them to your packages</small>
                </div>
            ) : (
                <div style={styles.dependencyList}>
                    {deps.map((dep) => {

                        const isLinked = linkedIds.has(dep.id);

                        return (
                            <div
                                key={dep.id}
                                style={{
                                    ...styles.dependencyCard,
                                    ...(isLinked ? styles.dependencyCardLinked : {}),
                                }}
                            >
                                <div style={styles.dependencyCardHeader}>
                                    <div style={styles.dependencyCardInfo}>
                                        <span style={styles.dependencyIcon}>{getIcon(dep.type)}</span>
                                        <div>
                                            <h5 style={styles.dependencyName}>{dep.name}</h5>
                                            <p style={styles.dependencyType}>
                                                {dep.type} {dep.version && `v${dep.version}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={styles.dependencyCardActions}>
                                        <button
                                            onClick={() => onToggleLink(dep.id, dep)}
                                            style={{
                                                ...styles.linkButton,
                                                ...(isLinked ? styles.linkButtonLinked : {}),
                                            }}
                                        >
                                            {isLinked ? "🔗 Linked" : "➕ Link"}
                                        </button>
                                        {null/*<button
                      onClick={() => onDelete(dep.id)}
                      style={styles.deleteDependencyButton}
                      title="Delete dependency"
                    >
                      🗑️
                    </button>*/}
                                    </div>
                                </div>

                                {dep.description && (
                                    <p style={styles.dependencyDescription}>{dep.description}</p>
                                )}

                                {dep.type === "bot" && dep.botTag && (
                                    <div style={styles.dependencyMeta}>
                                        <strong>Bot Tag:</strong> {dep.botTag}
                                    </div>
                                )}

                                {dep.type === "link" && dep.source && (
                                    <div style={styles.dependencyMeta}>
                                        <strong>Source:</strong> {dep.source}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
