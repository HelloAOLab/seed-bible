let mindMapBot = getBot(byTag("mmTypingManager", true));
whisper(mindMapBot, "onClick", that);
clearInterval(masks.interval);
clearInterval(masks.interval2);
destroy(thisBot);
