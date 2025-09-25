const {bot} = that;

const cameraPosition = os.getCameraPosition('grid');
const dimension = os.getCurrentDimension();

const botPosition       = new Vector3(bot.masks[dimension + "X"] ?? bot.tags[dimension + "X"], bot.masks[dimension + "Y"] ?? bot.tags[dimension + "Y"], bot.masks[dimension + "Z"] ?? bot.tags[dimension + "Z"]);
const newCamPosition    = new Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z);
const distance          = Vector3.distanceBetween(botPosition, newCamPosition);
return distance;