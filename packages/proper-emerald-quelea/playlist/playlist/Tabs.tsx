const { useState } = os.appHooks;

const Tabs = ({ tabs, onTabChange }) => {
    const [activeTab, setActiveTab] = useState(tabs[0]);

    const handleTabClick = (tab) => {
        setActiveTab(tab);
        onTabChange(tab);
    };

    return (
        <div style={styles.tabsContainer}>
            {tabs.map((tab, index) => (
                <div
                    key={index}
                    style={{
                        ...styles.tab,
                        ...(activeTab === tab ? styles.activeTab : {}),
                        width: `${100 / tabs.length}%`
                    }}
                    onClick={() => handleTabClick(tab)}
                >
                    {tab}
                </div>
            ))}
        </div>
    );
};

const styles = {
    tabsContainer: {
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        backgroundColor: '#F0F1F1',
        width: '100%',
        padding: '0.60rem',
        borderRadius: '4px',
        margin: '1rem 0'
    },
    tab: {
        padding: '0.75rem 1.25rem',
        cursor: 'pointer',
        borderRadius: '5px',
        backgroundColor: '#f0f0f0',
        color: '#333',
        fontWeight: 'bold',
        transition: 'background-color 0.3s, color 0.3s',
        textAlign: 'center'
    },
    activeTab: {
        backgroundColor: '#fff',
        color: '#D36433',
    },
};

return Tabs;