await os.registerApp('alwaysShowIframe', thisBot);

const css = `
.vm-iframe-container iframe:first-child {
    pointer-events: auto !important;
}
`;

os.compileApp(
    'alwaysShowIframe',
    <div>
        <style>{css}</style>
    </div>
);