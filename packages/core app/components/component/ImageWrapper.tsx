const ImageWrapper = ({ children }) => {
    return <div style={{ position: 'relative' }}>
        {children}
        <p style={{ position: 'absolute', margin: '0', top: 0, left: 0, width: '100%', height: '100%', zIndex: '1' }} />
    </div>
}

return ImageWrapper;