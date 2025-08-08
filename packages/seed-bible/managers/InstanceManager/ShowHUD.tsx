const appName = "HUD";
await os.unregisterApp(appName);
await os.registerApp(appName, thisBot);
const css = thisBot.tags["HUD.css"];
const {useState /*, useEffect, useMemo, useCallback */ } = os.appHooks;

const App = () => {
    const [gameState, setGameState] = useState(thisBot.GetCurrentGameState());
    const [countdownTimer, setCountdownTimer] = useState(3);
    const [gameTime, setGameTime] = useState(thisBot.GetCurrentGameTime());
    globalThis.setGameState = setGameState;
    globalThis.setCountdownTimer = setCountdownTimer;
    globalThis.setGameTime = setGameTime;
    
    return <>
        <style>{css}</style>
        {gameState === GameState.CountdownToStart ? <div className="countdownContainer">
            <p>{countdownTimer}</p>
        </div> : null}
        
        {gameState === GameState.Playing ? <p className="gameTime">{gameTime}</p> : null}
        {gameState === GameState.Playing ? <button className="hudButton pauseButton" onClick={() => {thisBot.TryPauseGame()}}>Pause</button> : null}
        {gameState === GameState.Pause ? <button className="hudButton playButton" onClick={() => {thisBot.TryResumeGame()}}>Play</button> : null}
        {gameState === GameState.Playing || gameState === GameState.Pause ? <button className="hudButton restartButton" onClick={() => {thisBot.TryRestartGame()}}>Restart</button> : null}
        
        {gameState === GameState.GameOver ? <div className="gameOverScreenContainer">
            <div className="gameOverPanel">
                <h2>{`You won in ${gameTime} seconds`}</h2>
                <div className="buttonsContainer">
                    <button onClick={() => {thisBot.TryRestartGame()}}>Play again!</button>
                </div>
            </div>
        </div> : null}
    </>
}

os.compileApp(appName, <App />);