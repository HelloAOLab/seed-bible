
const { useEffect, useState, render } = os.appHooks;

const DragDropOverlay = () => {
    return // paused
    const [dragState, setDragState] = useState({
        isDragOver: false,
        draggedFiles: []
    });

    useEffect(() => {
        const handleDragEnter = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragState(prev => ({ ...prev, isDragOver: true }));
        };

        const handleDragLeave = (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only hide overlay if leaving the entire document
            if (e.clientX === 0 || e.clientY === 0 ||
                e.clientX === window.innerWidth || e.clientY === window.innerHeight) {
                setDragState(prev => ({ ...prev, isDragOver: false }));
            }
        };

        const handleDragOver = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const files = Array.from(e.dataTransfer.files);
            const fileInfo = files.map(file => ({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: new Date(file.lastModified).toLocaleString(),
                sizeFormatted: formatFileSize(file.size)
            }));
            // os.log(files)
            shout('checkUploadedFiles', { files })
            setDragState({
                isDragOver: false,
                draggedFiles: fileInfo
            });

            // Auto-hide after 1 seconds
            setTimeout(() => {
                setDragState(prev => ({ ...prev, draggedFiles: [] }));
            }, 1000);
        };

        document.addEventListener('dragenter', handleDragEnter);
        document.addEventListener('dragleave', handleDragLeave);
        document.addEventListener('dragover', handleDragOver);
        document.addEventListener('drop', handleDrop);

        return () => {
            document.removeEventListener('dragenter', handleDragEnter);
            document.removeEventListener('dragleave', handleDragLeave);
            document.removeEventListener('dragover', handleDragOver);
            document.removeEventListener('drop', handleDrop);
        };
    }, []);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!dragState.isDragOver && dragState.draggedFiles.length === 0) {
        return null;
    }

    return (
        <>
            {dragState.isDragOver && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(2px)'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '40px',
                        borderRadius: '12px',
                        border: '3px dashed #4459F3',
                        textAlign: 'center',
                        maxWidth: '400px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '16px',
                            color: '#4459F3'
                        }}>📁</div>
                        <h3 style={{
                            margin: '0 0 8px 0',
                            color: '#333',
                            fontSize: '20px'
                        }}>Drop files here</h3>
                        <p style={{
                            margin: '0',
                            color: '#666',
                            fontSize: '14px'
                        }}>Release to upload files</p>
                    </div>
                </div>
            )}

            {dragState.draggedFiles.length > 0 && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    zIndex: 9999,
                    maxWidth: '350px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid #e0e0e0'
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '16px',
                        borderBottom: '1px solid #f0f0f0',
                        paddingBottom: '12px'
                    }}>
                        <h4 style={{
                            margin: '0',
                            color: '#333',
                            fontSize: '16px'
                        }}>Files Dropped ({dragState.draggedFiles.length})</h4>
                        <button
                            onClick={() => setDragState(prev => ({ ...prev, draggedFiles: [] }))}
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '18px',
                                cursor: 'pointer',
                                color: '#999',
                                padding: '0',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >×</button>
                    </div>

                    {dragState.draggedFiles.map((file, index) => (
                        <div key={index} style={{
                            marginBottom: '12px',
                            padding: '12px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            fontSize: '12px'
                        }}>
                            <div style={{
                                fontWeight: 'bold',
                                marginBottom: '4px',
                                color: '#333',
                                wordBreak: 'break-word'
                            }}>{file.name}</div>
                            <div style={{ color: '#666', marginBottom: '2px' }}>
                                Size: {file.sizeFormatted}
                            </div>
                            <div style={{ color: '#666', marginBottom: '2px' }}>
                                Type: {file.type || 'Unknown'}
                            </div>
                            <div style={{ color: '#666' }}>
                                Modified: {file.lastModified}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export { DragDropOverlay }