
function AOLabUpdateCard() {
    return
    if (masks.stopNotification)
        return
    return (
        <div style={{
            backgroundColor: '#f3f4f6',
            borderRadius: '16px',
            padding: '10px',
            //   width: '320px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            position: 'relative',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            position: 'absolute',
            bottom: '100px',
            left: '25px'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#6b7280',
                    margin: '0'
                }}>
                    AO Lab update available!
                </h2>
                <button
                    onClick={() => setTagMask(thisBot, 'stopNotification', true, 'local')}
                    style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '20px',
                        color: '#6b7280',
                        cursor: 'pointer',
                        padding: '0',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                    ✕
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '4px 0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg className='coloredIcon' width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                                <path d="M1 4v6h6" />
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                        </div>
                        <span
                            onClick={()=>{os.goToURL('')}}
                         style={{
                            fontSize: '16px',
                            color: '#6b7280',
                            fontWeight: '400'
                        }}>
                            Click to restart
                        </span>
                    </div>
                    <svg className='coloredIcon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '4px 0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <svg className='coloredIcon' width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <rect x="9" y="9" width="6" height="6" />
                                <path d="M9 1v6" />
                                <path d="M15 1v6" />
                                <path d="M9 17v6" />
                                <path d="M15 17v6" />
                                <path d="M1 9h6" />
                                <path d="M17 9h6" />
                                <path d="M1 15h6" />
                                <path d="M17 15h6" />
                            </svg>
                        </div>
                        <span
                            onClick={() => os.openURL('https://www.youtube.com/playlist?list=PLAbcI57nItL1NL6SgqlSltE3O18zupDBX')}
                            style={{
                                fontSize: '16px',
                                color: '#6b7280',
                                fontWeight: '400'
                            }}>
                            What's new?
                        </span>
                    </div>
                    <svg className='coloredIcon' width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                        <path d="M9 18l6-6-6-6" />
                    </svg>
                </div>
            </div>
        </div>
    );
}


export { AOLabUpdateCard }