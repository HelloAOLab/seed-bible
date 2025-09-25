let angle = gridPortalBot.tags.cameraRotationZ;

angle = (angle - (Math.PI / 2)) % (Math.PI * 2);

if (angle < 0) angle += (Math.PI * 2);

return angle > Math.PI ?  new Vector2(1, 1) : new Vector2(-1, -1);