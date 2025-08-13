const {deltaTime} = that;
switch(thisBot.GetCurrentGameState())
{
    case GameState.CountdownToStart: {
        let countdownTimer = !isNaN(thisBot.masks.countdownTimer) ? thisBot.masks.countdownTimer : thisBot.tags.maxCountdownTimer
        countdownTimer -= deltaTime
        thisBot.SetCountdownTimer({value: countdownTimer})
        if(countdownTimer <= 0) 
        {
            thisBot.StartGame();
        }
    }
    break;
    case GameState.Playing: {
        let gameTime = thisBot.masks.gametime;
        gameTime += deltaTime
        thisBot.SetGameTime({value: gameTime})
    }
    break;
}