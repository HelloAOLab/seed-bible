const { theta, phi, botPosition } = that;

const x = Math.sin(phi) * Math.cos(theta + math.degreesToRadians(270));
const y = Math.sin(phi) * Math.sin(theta + math.degreesToRadians(270));
const z = Math.cos(phi);
const camDesiredForwardDirection = new Vector3(x, y, z).negate().normalize();
const camDesiredForwardDirectionXY = new Vector3(
  camDesiredForwardDirection.x,
  camDesiredForwardDirection.y,
  0
).normalize();
const vectorZ = new Vector3(0, 0, camDesiredForwardDirection.z > 0 ? 1 : -1);
const angleBetween =
  math.degreesToRadians(90) -
  Vector3.angleBetween(camDesiredForwardDirection, vectorZ);
const vectorMagnitude = botPosition.z / Math.tan(angleBetween);
const desiredFocusOnPosition = new Vector3(botPosition.x, botPosition.y, 0).add(
  camDesiredForwardDirectionXY.multiplyScalar(vectorMagnitude)
);
return desiredFocusOnPosition;
