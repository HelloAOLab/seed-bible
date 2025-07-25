
const ProfileCard = ({
    profileName,
    description,
    location,
    uid,
    link,
    tags,
    date
}) => {
    const cardStyle = {
        width: '320px',
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    };

    const headerStyle = {
        height: '80px',
        background: 'linear-gradient(135deg, #a8d5ba 0%, #c8e6c9 100%)',
        position: 'relative'
    };

    const avatarStyle = {
        position: 'absolute',
        bottom: '-25px',
        left: '20px',
        width: '50px',
        height: '50px',
        backgroundColor: '#2e7d57',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold',
        border: '3px solid white'
    };

    const contentStyle = {
        padding: '35px 20px 20px',
        position: 'relative'
    };

    const subscribeButtonStyle = {
        position: 'absolute',
        top: '15px',
        right: '20px',
        backgroundColor: '#4459F3',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    };

    const titleStyle = {
        fontSize: '24px',
        fontWeight: '600',
        color: '#333',
        margin: '0 0 4px 0'
    };

    const subtitleStyle = {
        fontSize: '14px',
        color: '#666',
        margin: '0 0 12px 0'
    };

    const descriptionStyle = {
        fontSize: '14px',
        color: '#333',
        lineHeight: '1.4',
        margin: '0 0 16px 0'
    };

    const linkStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#666',
        fontSize: '14px',
        textDecoration: 'none',
        marginBottom: '20px'
    };

    const linkIconStyle = {
        width: '16px',
        height: '16px',
        opacity: 0.6
    };

    const infoRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        fontSize: '14px'
    };

    const labelStyle = {
        color: '#666',
        fontWeight: '500'
    };

    const valueStyle = {
        color: '#333'
    };

    const tagsContainerStyle = {
        marginTop: '16px'
    };

    const tagsWrapperStyle = {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '8px'
    };

    const tagStyle = {
        backgroundColor: '#f5f5f5',
        color: '#333',
        padding: '6px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '500',
        border: 'none'
    };

    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <div style={avatarStyle}>{profileName.split('')[0]}</div>
            </div>

            <div style={contentStyle}>
                <button style={subscribeButtonStyle}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V19C3 20.11 3.89 21 5 21H11V19H5V3H13V9H21Z" />
                    </svg>
                    Subscribe
                </button>

                <h1 style={titleStyle}>{profileName}</h1>
                <p style={subtitleStyle}>ID:{uid}</p>
                {description && <p style={descriptionStyle}>
                    {description}
                </p>}

                {link && <a href="#" style={linkStyle}>
                    <svg style={linkIconStyle} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H6.9C4.01 7 1.9 9.11 1.9 12s2.11 5 5 5h4v-1.9H6.9C5.19 17.1 3.9 15.71 3.9 12zM8 13h8v-2H8v2zm9.1-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.89 0 5-2.11 5-5s-2.11-5-5-5z" />
                    </svg>
                    {link}
                </a>}

                {date && <div style={infoRowStyle}>
                    <span style={labelStyle}>Date created</span>
                    <span style={valueStyle}>{date}</span>
                </div>}

                {location && <div style={infoRowStyle}>
                    <span style={labelStyle}>Location</span>
                    <span style={valueStyle}>{location}</span>
                </div>}

                {tags && <div style={tagsContainerStyle}>
                    <div style={infoRowStyle}>
                        <span style={labelStyle}>Tags</span>
                    </div>
                    <div style={tagsWrapperStyle}>
                        <span style={tagStyle}>Arts & Crafts</span>
                        <span style={tagStyle}>Mom</span>
                        <span style={tagStyle}>Annotations</span>
                    </div>
                </div>}
            </div>
        </div>
    );
};

export { ProfileCard };