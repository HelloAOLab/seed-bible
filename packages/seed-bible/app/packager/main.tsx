// const { useState, useEffect } = React;
const { useState, useEffect } = os.appHooks;
const styles = thisBot.styles();
import { DependencyUploadPanel } from "app.packager.dependencyUploadPanel";
import { DependencyManager } from "app.packager.dependencyManager";
const PackageManager = () => {
  const [packages, setPackages] = useState([]);
  const [myPackages, setMyPackages] = useState([]);
  const [currentBot, setCurrentBot] = useState(null);
  const [botConfig, setBotConfig] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [tagCode, setTagCode] = useState("");
  const [availablePackages, setAvailablePackages] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPackage, setCurrentPackage] = useState({
    name: "",
    version: "1.0.0",
    description: "",
    mainBotTag: "",
    otherBots: [],
    dependencies: [], // Now stores linked dependency IDs
    author: "",
    license: "MIT",
  });

  const [activeTab, setActiveTab] = useState("create");
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // New states for dependency management
  const [uploadedDependencies, setUploadedDependencies] = useState([]);
  // Update the dependencyUpload state structure
  const [dependencyUpload, setDependencyUpload] = useState({
    name: "", // Single name for the entire dependency
    description: "", // Single description for the entire dependency
    bots: [], // Array of { botTag: '', notes: '' }
  });
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  useEffect(() => {
    if (activeTab !== "create") {
      loadAvailablePackages();
      getMyPackages();
    }
    loadUploadedDependencies();
  }, [activeTab]);

  // Add this state near the top with other useState declarations
  const [additionalBots, setAdditionalBots] = useState({});
  const [selectedAdditionalBot, setSelectedAdditionalBot] = useState(null);

  // New function to load uploaded dependencies
  const loadUploadedDependencies = async () => {
    try {
      // Load from storage or API - replace with your actual implementation
      // const stored = localStorage.getItem('packageDependencies');
      // if (stored) {
      //     setUploadedDependencies(JSON.parse(stored));
      // }
      console.log("loading deps");
      const data = await thisBot.getDependencies();
      setAvailablePackages(data);
      const filtered = data.filter((e: any) => e.data.userAuth === authBot.id);
      console.log(filtered, "filtered");
      setMyPackages(filtered);
      if (data) setUploadedDependencies(data.map((data: any) => data.data));
    } catch (error) {
      console.error("Error loading dependencies:", error);
    }
  };

  // New function to save dependencies
  const saveDependenciesToStorage = (deps: any) => {
    try {
      localStorage.setItem("packageDependencies", JSON.stringify(deps));
    } catch (error) {
      console.error("Error saving dependencies:", error);
    }
  };

  // New function to upload/add a dependency
  const uploadDependency = async () => {
    if (!dependencyUpload.name.trim()) {
      showNotification("Dependency name is required", "error");
      return;
    }

    if (dependencyUpload.type === "bot" && !dependencyUpload.botTag.trim()) {
      showNotification("Bot tag is required for bot dependencies", "error");
      return;
    }

    if (dependencyUpload.type === "link" && !dependencyUpload.source.trim()) {
      showNotification("Source URL is required for link dependencies", "error");
      return;
    }

    try {
      setLoading(true);

      // Validate bot exists if it's a bot dependency
      if (dependencyUpload.type === "bot") {
        const bot = getBot("system", dependencyUpload.botTag);
        if (!bot) {
          showNotification("Bot not found - please check the tag", "error");
          return;
        }
      }

      const newDependency = {
        id: Date.now(),
        ...dependencyUpload,
        createdAt: new Date().toISOString(),
        status: "active",
      };

      const updatedDeps = [...uploadedDependencies, newDependency];
      thisBot.addDependencies({ ...newDependency });
      console.log(updatedDeps, "updatedDeps");
      // setUploadedDependencies(updatedDeps);
      // saveDependenciesToStorage(updatedDeps);

      loadUploadedDependencies();
      loadAvailablePackages();
      getMyPackages();
      // Reset form
      setDependencyUpload({
        name: "",
        description: "",
        type: "bot",
        botTag: "",
        version: "1.0.0",
        source: "",
      });

      showNotification(
        `Dependency "${newDependency.name}" uploaded successfully!`
      );
      setShowUploadPanel(false);
    } catch (error) {
      showNotification("Error uploading dependency", "error");
    } finally {
      setLoading(false);
    }
  };

  // New function to delete a dependency
  const deleteDependency = (depId: any) => {
    const updatedDeps = uploadedDependencies.filter((dep) => dep.id !== depId);
    setUploadedDependencies(updatedDeps);
    saveDependenciesToStorage(updatedDeps);

    // Remove from current package if linked
    setCurrentPackage((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter((id) => id !== depId),
    }));

    showNotification("Dependency removed successfully!");
  };

  // New function to link/unlink dependency to current package
  const toggleDependencyLink = (depId: any, data: any) => {
    setCurrentPackage((prev) => {
      const isLinked = prev.dependencies.find((e) => e.depId === depId);
      const newDeps = isLinked
        ? prev.dependencies.filter(({ id }) => id !== depId)
        : [...prev.dependencies, { depId, name: data.name, type: data.type }];

      return {
        ...prev,
        dependencies: newDeps,
      };
    });

    const dependency = uploadedDependencies.find((dep) => dep.id === depId);
    const isLinked = currentPackage.dependencies.find((e) => e.depId === depId);
    showNotification(
      `${dependency.name} ${isLinked ? "unlinked from" : "linked to"} package`
    );
  };

  // Add this function after the existing loadBotConfig function
  const loadAdditionalBot = async (tag: any, index: any) => {
    try {
      const bot = getBot("system", tag);
      if (bot) {
        setAdditionalBots((prev) => ({
          ...prev,
          [index]: bot,
        }));
      } else {
        // Remove from additionalBots if bot not found
        setAdditionalBots((prev) => {
          const updated = { ...prev };
          delete updated[index];
          return updated;
        });
      }
    } catch (error) {
      console.error("Error loading additional bot:", error);
    }
  };

  // Update the updateOtherBot function
  const updateOtherBot = (index: any, field: any, value: any) => {
    setCurrentPackage((prev) => ({
      ...prev,
      otherBots: prev.otherBots.map((bot, i) =>
        i === index ? { ...bot, [field]: value } : bot
      ),
    }));

    // If updating the tag field and it has a value, try to load the bot
    if (field === "tag" && value.trim()) {
      loadAdditionalBot(value.trim(), index);
    } else if (field === "tag" && !value.trim()) {
      // Remove from additionalBots if tag is cleared
      setAdditionalBots((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      if (selectedAdditionalBot === index) {
        setSelectedAdditionalBot(null);
      }
    }
  };

  useEffect(() => {
    loadUploadedDependencies();
    getMyPackages();
    loadAvailablePackages();
  }, []);

  async function getMyPackages() {
    return;
    try {
      const result = await os.listDataByMarker(tags.recordName, "publicRead");
      if (result.success) {
        const filtered = result.items
          .map((data: any) => ({
            data: data.data,
            address: data.address,
          }))
          .filter(
            (item: any) => item.data?.userAuth === authBot.id && item.data?.id
          );
        setMyPackages(filtered);
      }
    } catch (error) {
      showNotification("Error loading packages", error);
    }
  }

  async function loadAvailablePackages() {
    return;
    try {
      const result = await os.listDataByMarker(tags.recordName, "publicRead");
      if (result.success) {
        setAvailablePackages(result.items);
      }
    } catch (error) {
      showNotification("Error loading packages", "error");
    }
  }

  useEffect(() => {
    if (currentPackage.mainBotTag.trim()) {
      loadBotConfig(currentPackage.mainBotTag);
    } else {
      setCurrentBot(null);
      setBotConfig(null);
    }
  }, [currentPackage.mainBotTag]);

  const loadBotConfig = async (tag: any) => {
    os.log(tag);
    try {
      setLoading(true);
      const bot = getBot("system", tag);
      console.log(bot);
      if (bot) {
        setCurrentBot(bot);
        if (bot.tags.config) {
          setBotConfig(bot.tags.config);
        } else {
          setBotConfig(null);
        }
      } else {
        setCurrentBot(null);
        setBotConfig(null);
        showNotification("Bot not found", "error");
      }
    } catch (error) {
      showNotification("Error loading bot config", "error");
      setCurrentBot(null);
      setBotConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: any, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const addOtherBot = () => {
    setCurrentPackage((prev: any) => ({
      ...prev,
      otherBots: [...prev.otherBots, { tag: "", description: "" }],
    }));
  };

  const removeOtherBot = (index) => {
    setCurrentPackage((prev) => ({
      ...prev,
      otherBots: prev.otherBots.filter((_, i) => i !== index),
    }));
  };

  const validatePackage = () => {
    if (!currentPackage.name.trim()) return "Package name is required";
    if (!currentPackage.version.trim()) return "Version is required";
    if (!currentPackage.mainBotTag.trim())
      return "Main bot system tag is required";
    if (!currentBot) return "Main bot not found - please check the tag";

    return null;
  };

  const pushPackage = async () => {
    const error = validatePackage();
    if (error) {
      showNotification(error, "error");
      return;
    }

    setLoading(true);
    try {
      // Get linked dependencies details
      const linkedDependencies = uploadedDependencies.filter((dep) =>
        currentPackage.dependencies.includes(dep.id)
      );

      const newPackage = {
        ...currentPackage,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        status: "active",
        configEditor: botConfig,
        linkedDependencies, // Store full dependency details
      };

      await thisBot.addPackage(newPackage);

      showNotification(
        `Package "${newPackage.name}" v${newPackage.version} created successfully!`
      );
      setCurrentPackage({
        name: "",
        version: "1.0.0",
        description: "",
        mainBotTag: "",
        otherBots: [],
        dependencies: [], // Now stores linked dependency IDs
        author: "",
        license: "MIT",
      });
      await getMyPackages();
    } catch (error) {
      showNotification("Error creating package", "error");
    } finally {
      setLoading(false);
    }
  };

  const updatePackage = async (packageId: any) => {
    try {
      setLoading(true);
      const match = myPackages.find(({ data }) => data.id === packageId);
      if (!match) {
        showNotification("Package not found", "error");
        return;
      }

      const oldPkg = match.data;
      const versionParts = oldPkg?.version
        ? oldPkg.version.split(".")
        : ["1", "0", "0"];
      versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
      const newVersion = versionParts.join(".");

      const updatedPackage = {
        ...oldPkg,
        version: newVersion,
        updatedAt: new Date().toISOString(),
      };
      if (oldPkg.type === "package") {
        await thisBot.addPackage(updatedPackage);
      } else {
        await thisBot.addDependencies(updatedPackage);
      }
      await getMyPackages();
      showNotification(
        `Package "${updatedPackage.name}" updated to v${updatedPackage.version}!`
      );
    } catch (error) {
      os.log(error);
      showNotification("Error updating package", "error");
    } finally {
      setLoading(false);
    }
  };

  const deletePackage = async (address: any) => {
    try {
      setLoading(true);
      const result = await os.eraseData(tags.recordName, address);
      if (result.success) {
        showNotification("Package deleted successfully!");
        await getMyPackages();
      } else {
        showNotification("Error deleting package", "error");
      }
    } catch (error) {
      showNotification("Error deleting package", "error");
    } finally {
      setLoading(false);
    }
  };

  const ConfigViewer = ({ config, title }) => {
    if (!config) {
      return (
        <div style={styles.configEmpty}>
          <div style={styles.emptyIcon}>⚙️</div>
          <p>No configuration found</p>
          <small>The bot doesn't have a config tag or it's empty</small>
        </div>
      );
    }

    return (
      <div style={styles.configViewer}>
        <div style={styles.configHeader}>
          <span style={styles.configIcon}>⚙️</span>
          <h4>{title}</h4>
        </div>
        <div style={styles.configContent}>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      </div>
    );
  };

  const filteredPackages = availablePackages;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <div style={styles.logoContainer}>
              <span style={styles.logo}>📦</span>
              <div>
                <h1 style={styles.title}>Package Manager</h1>
                <p style={styles.subtitle}>
                  Create and manage your CasualOS packages
                </p>
              </div>
            </div>
          </div>
          {loading && (
            <div style={styles.loadingSpinner}>
              <div style={styles.spinner}></div>
            </div>
          )}
        </div>
      </div>

      {notification && (
        <div
          style={{
            ...styles.notification,
            ...(notification.type === "success"
              ? styles.notificationSuccess
              : styles.notificationError),
          }}
        >
          <span style={styles.notificationIcon}>
            {notification.type === "success" ? "✅" : "❌"}
          </span>
          {notification.message}
        </div>
      )}

      <DependencyUploadPanel
        show={showUploadPanel}
        onClose={() => setShowUploadPanel(false)}
        styles={styles}
        dependencyUpload={dependencyUpload}
        setDependencyUpload={setDependencyUpload}
        loading={loading}
        onUpload={uploadDependency}
        validateBotTag={(tag: any) => {
          try {
            const bot = getBot("system", tag);
            return !!bot;
          } catch {
            return "error";
          }
        }}
      />

      <div style={styles.mainContent}>
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab("create")}
            style={{
              ...styles.tab,
              ...(activeTab === "create" ? styles.tabActive : {}),
            }}
          >
            <span>➕</span>
            Create Package
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            style={{
              ...styles.tab,
              ...(activeTab === "manage" ? styles.tabActive : {}),
            }}
          >
            <span>⚙️</span>
            My Packages & Dependencies ({myPackages.length})
          </button>
          <button
            onClick={() => setActiveTab("dependencies")}
            style={{
              ...styles.tab,
              ...(activeTab === "dependencies" ? styles.tabActive : {}),
            }}
          >
            <span>🔗</span>
            Dependencies ({uploadedDependencies.length})
          </button>
        </div>

        {activeTab === "create" && (
          <div style={styles.tabContent}>
            <div style={styles.createGrid}>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>📋 Package Information</h3>

                <div style={styles.formGrid}>
                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Package Name *</label>
                    <input
                      type="text"
                      value={currentPackage.name}
                      onChange={(e) =>
                        setCurrentPackage((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      style={styles.input}
                      placeholder="my-awesome-package"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Version *</label>
                    <input
                      type="text"
                      value={currentPackage.version}
                      onChange={(e) =>
                        setCurrentPackage((prev) => ({
                          ...prev,
                          version: e.target.value,
                        }))
                      }
                      style={styles.input}
                      placeholder="1.0.0"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Author</label>
                    <input
                      type="text"
                      value={currentPackage.author}
                      onChange={(e) =>
                        setCurrentPackage((prev) => ({
                          ...prev,
                          author: e.target.value,
                        }))
                      }
                      style={styles.input}
                      placeholder="Your Name"
                    />
                  </div>

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>License</label>
                    <select
                      value={currentPackage.license}
                      onChange={(e) =>
                        setCurrentPackage((prev) => ({
                          ...prev,
                          license: e.target.value,
                        }))
                      }
                      style={styles.select}
                    >
                      <option value="MIT">MIT</option>
                      <option value="Apache-2.0">Apache 2.0</option>
                      <option value="GPL-3.0">GPL 3.0</option>
                      <option value="BSD-3-Clause">BSD 3-Clause</option>
                    </select>
                  </div>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea
                    value={currentPackage.description}
                    onChange={(e) =>
                      setCurrentPackage((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    style={styles.textarea}
                    placeholder="Describe what your package does..."
                    rows="3"
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Main Bot System Tag *</label>
                  <div style={styles.botTagInput}>
                    <input
                      type="text"
                      value={currentPackage.mainBotTag}
                      onChange={(e) =>
                        setCurrentPackage((prev) => ({
                          ...prev,
                          mainBotTag: e.target.value,
                        }))
                      }
                      style={styles.input}
                      placeholder="#mainSystem"
                    />
                    {currentPackage.mainBotTag && (
                      <button
                        onClick={() => loadBotConfig(currentPackage.mainBotTag)}
                        style={styles.reloadButton}
                        disabled={loading}
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.subsection}>
                  <div style={styles.subsectionHeader}>
                    <h4 style={styles.subsectionTitle}>🤖 Additional Bots</h4>
                    <button onClick={addOtherBot} style={styles.addButton}>
                      ➕ Add Bot
                    </button>
                  </div>

                  {currentPackage.otherBots.map((bot, index) => (
                    <div key={index} style={styles.additionalBotContainer}>
                      <div style={styles.botItem}>
                        <input
                          type="text"
                          value={bot.tag}
                          onChange={(e) =>
                            updateOtherBot(index, "tag", e.target.value)
                          }
                          style={styles.input}
                          placeholder="Bot tag (e.g., #helper)"
                        />
                        <input
                          type="text"
                          value={bot.description}
                          onChange={(e) =>
                            updateOtherBot(index, "description", e.target.value)
                          }
                          style={styles.input}
                          placeholder="Bot description"
                        />
                        <button
                          onClick={() => removeOtherBot(index)}
                          style={styles.removeButton}
                        >
                          ✕
                        </button>
                      </div>

                      {additionalBots[index] && (
                        <div style={styles.additionalBotTabs}>
                          <div style={styles.botTabHeader}>
                            <div style={styles.botTabInfo}>
                              <span style={styles.botFoundIcon}>✅</span>
                              <span style={styles.botTabTitle}>
                                Bot Found: {bot.tag}
                              </span>
                            </div>
                            <div style={styles.botTabActions}>
                              <button
                                onClick={() =>
                                  setSelectedAdditionalBot(
                                    selectedAdditionalBot === index
                                      ? null
                                      : index
                                  )
                                }
                                style={{
                                  ...styles.botTabToggle,
                                  ...(selectedAdditionalBot === index
                                    ? styles.botTabToggleActive
                                    : {}),
                                }}
                              >
                                {selectedAdditionalBot === index
                                  ? "🔽 Hide"
                                  : "🔽 Show Details"}
                              </button>
                            </div>
                          </div>

                          {selectedAdditionalBot === index && (
                            <div style={styles.botTabContent}>
                              {additionalBots[index].tags.config && (
                                <div style={styles.botConfigSection}>
                                  <h5 style={styles.botSectionTitle}>
                                    ⚙️ Configuration
                                  </h5>
                                  <div style={styles.miniConfigViewer}>
                                    <pre style={styles.miniConfigContent}>
                                      {JSON.stringify(
                                        additionalBots[index].tags.config,
                                        null,
                                        2
                                      )}
                                    </pre>
                                  </div>
                                </div>
                              )}

                              <div style={styles.botTagsSection}>
                                <h5 style={styles.botSectionTitle}>
                                  📁 Available Tags
                                </h5>
                                <div style={styles.miniTagsGrid}>
                                  {Object.keys(additionalBots[index].tags)
                                    .filter((tag) => tag.startsWith("@"))
                                    .map((tag) => (
                                      <span
                                        key={tag}
                                        style={styles.miniTagBadge}
                                      >
                                        📄 {tag}
                                      </span>
                                    ))}
                                </div>
                                {Object.keys(additionalBots[index].tags).filter(
                                  (tag) => tag.startsWith("@")
                                ).length === 0 && (
                                  <p style={styles.noTagsMessage}>
                                    No @ tags found in this bot
                                  </p>
                                )}
                              </div>

                              <div style={styles.botStatsSection}>
                                <h5 style={styles.botSectionTitle}>
                                  📊 Quick Stats
                                </h5>
                                <div style={styles.botStats}>
                                  <div style={styles.statItem}>
                                    <span style={styles.statLabel}>
                                      Total Tags:
                                    </span>
                                    <span style={styles.statValue}>
                                      {
                                        Object.keys(additionalBots[index].tags)
                                          .length
                                      }
                                    </span>
                                  </div>
                                  <div style={styles.statItem}>
                                    <span style={styles.statLabel}>
                                      @ Tags:
                                    </span>
                                    <span style={styles.statValue}>
                                      {
                                        Object.keys(
                                          additionalBots[index].tags
                                        ).filter((tag) => tag.startsWith("@"))
                                          .length
                                      }
                                    </span>
                                  </div>
                                  <div style={styles.statItem}>
                                    <span style={styles.statLabel}>
                                      Has Config:
                                    </span>
                                    <span style={styles.statValue}>
                                      {additionalBots[index].tags.config
                                        ? "✅ Yes"
                                        : "❌ No"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {bot.tag.trim() && !additionalBots[index] && (
                        <div style={styles.botNotFound}>
                          <span style={styles.botNotFoundIcon}>❌</span>
                          <span style={styles.botNotFoundText}>
                            Bot "{bot.tag}" not found
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <DependencyManager
                  styles={styles}
                  uploadedDependencies={uploadedDependencies}
                  currentPackage={currentPackage}
                  onToggleLink={toggleDependencyLink}
                  onDelete={deleteDependency}
                  onOpenUpload={() => setShowUploadPanel(true)}
                />
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>⚙️ Bot Configuration</h3>

                {currentBot ? (
                  <ConfigViewer
                    config={botConfig}
                    title={`Config for ${currentPackage.mainBotTag}`}
                  />
                ) : (
                  <div style={styles.configEmpty}>
                    <div style={styles.emptyIcon}>🤖</div>
                    <p>Enter a main bot tag to view configuration</p>
                    <small>The bot configuration will be displayed here</small>
                  </div>
                )}

                {currentBot && (
                  <div style={styles.botTags}>
                    <h4 style={styles.subsectionTitle}>📁 Bot Tags</h4>
                    <div style={styles.tagsGrid}>
                      {Object.keys(currentBot.tags)
                        .filter((tag) => tag.startsWith("@"))
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTag(tag);
                              setTagCode(currentBot.tags[tag]);
                            }}
                            style={{
                              ...styles.tagButton,
                              ...(selectedTag === tag
                                ? styles.tagButtonActive
                                : {}),
                            }}
                          >
                            📄 {tag}
                          </button>
                        ))}
                    </div>

                    {selectedTag && (
                      <div style={styles.codeViewer}>
                        <div style={styles.codeHeader}>📄 {selectedTag}</div>
                        <pre style={styles.codeContent}>{tagCode}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.createActions}>
              <button
                onClick={pushPackage}
                style={styles.createButton}
                disabled={loading}
              >
                {loading ? "⏳ Creating..." : "🚀 Create Package"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "manage" && (
          <div style={styles.tabContent}>
            <h3 style={styles.sectionTitle}>📦 Your Packages</h3>

            {myPackages.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📦</div>
                <h4>No packages yet</h4>
                <p>Create your first package to get started!</p>
                <button
                  onClick={() => setActiveTab("create")}
                  style={styles.createButton}
                >
                  ➕ Create Package
                </button>
              </div>
            ) : (
              <div style={styles.packagesGrid}>
                {myPackages.map(({ data: pkg, address }) => (
                  <div key={pkg.id} style={styles.packageCard}>
                    <div style={styles.packageHeader}>
                      <div style={styles.packageTitle}>
                        <h4>{pkg.name}</h4>
                        <span style={styles.packageVersion}>
                          v{pkg.version}
                        </span>
                      </div>
                      <div style={styles.packageActions}>
                        <button
                          onClick={() => updatePackage(pkg.id)}
                          style={styles.updateButton}
                          disabled={loading}
                        >
                          🔄 Update
                        </button>
                        <button
                          onClick={() => deletePackage(address)}
                          style={styles.deleteButton}
                          disabled={loading}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>

                    <p style={styles.packageDescription}>
                      {pkg.description || "No description provided"}
                    </p>

                    <div style={styles.packageMeta}>
                      <div>
                        <strong>Main Bot:</strong> {pkg.mainBotTag}
                      </div>
                      <div>
                        <strong>Other Bots:</strong>{" "}
                        {pkg.otherBots?.length || 0}
                      </div>
                      <div>
                        <strong>Dependencies:</strong>{" "}
                        {pkg.dependencies?.length || 0}
                      </div>
                      <div>
                        <strong>Author:</strong> {pkg.author || "Unknown"}
                      </div>
                      <div>
                        <strong>License:</strong> {pkg.license}
                      </div>
                    </div>

                    <div style={styles.packageFooter}>
                      <small>
                        Created: {new Date(pkg.createdAt).toLocaleDateString()}
                        {pkg.updatedAt &&
                          ` • Updated: ${new Date(pkg.updatedAt).toLocaleDateString()}`}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "dependencies" && (
          <div style={styles.tabContent}>
            <div style={styles.dependenciesHeader}>
              <h3 style={styles.sectionTitle}>🔗 Manage Dependencies</h3>
              <button
                onClick={() => setShowUploadPanel(true)}
                style={styles.createButton}
              >
                📤 Upload New Dependency
              </button>
            </div>

            {uploadedDependencies.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📦</div>
                <h4>No dependencies uploaded yet</h4>
                <p>
                  Upload bot, package, or link dependencies to use in your
                  packages!
                </p>
                <button
                  onClick={() => setShowUploadPanel(true)}
                  style={styles.createButton}
                >
                  📤 Upload First Dependency
                </button>
              </div>
            ) : (
              <div style={styles.dependencyList}>
                {uploadedDependencies.map((dep) => {
                  const getIcon = (type: any) => {
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

                  return (
                    <div key={dep.id} style={styles.dependencyCard}>
                      <div style={styles.dependencyCardHeader}>
                        <div style={styles.dependencyCardInfo}>
                          <span style={styles.dependencyIcon}>
                            {getIcon(dep.type)}
                          </span>
                          <div>
                            <h5 style={styles.dependencyName}>{dep.name}</h5>
                            <p style={styles.dependencyType}>
                              {dep.type} {dep.version && `v${dep.version}`}
                            </p>
                          </div>
                        </div>
                        <div style={styles.dependencyCardActions}>
                          <button
                            onClick={() => deleteDependency(dep.id)}
                            style={styles.deleteDependencyButton}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>

                      {dep.description && (
                        <p style={styles.dependencyDescription}>
                          {dep.description}
                        </p>
                      )}

                      {dep.type === "bot" && dep.botTag && (
                        <div style={styles.dependencyMeta}>
                          <strong>Bot Tag:</strong> {dep.botTag}
                        </div>
                      )}

                      {dep.type === "link" && dep.source && (
                        <div style={styles.dependencyMeta}>
                          <strong>Source:</strong>{" "}
                          <a
                            href={dep.source}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {dep.source}
                          </a>
                        </div>
                      )}

                      <div style={styles.dependencyFooter}>
                        <small>
                          Created:{" "}
                          {new Date(dep.createdAt).toLocaleDateString()}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { PackageManager };
