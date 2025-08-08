os.unregisterApp('aiProgress');
await os.registerApp('aiProgress', thisBot);

const App = () => {
    return <>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <img
            src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/190b21f4ffc5b3e178696e8402c43c4cc71ef1e4d2c85fb21c57b33e6157534a.gif"
            alt="this slowpoke moves"
            stylr={{
                position: "absolute",
                top: "15px",
                left: "15px",
                height: "30px",
                width: "30px",
                userSelect: "none",
            }}
        />
    </>
}
os.compileApp('aiProgress', <App />);
