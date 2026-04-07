import sendMessage from "ext_twitchPub.host.sendMessage";
const { command, chatterName } = that;

switch (command) {
  case "!givelink":
    if (globalThis?.QrValue) {
      sendMessage({
        message: `Hi ${chatterName}! Here's your link to access the content on your device: ${globalThis.QrValue}`,
      });
    } else {
      console.error("QrValue is not set. Cannot send link.");
      sendMessage({
        message: `Sorry ${chatterName}, the link is not available at the moment. Please try again later.`,
      });
    }
    break;
  case "!help": {
    const commandsList = `Hi ${chatterName}! Here's a list of available commands:\n!givelink - Receive the link to access the content on your device.\n!help - List of available commands.`;
    sendMessage({
      message: commandsList,
    });
    break;
  }
  default:
    sendMessage({
      message: `Sorry ${chatterName}, I didn't recognize that command. Type !help for a list of available commands.`,
    });
}
