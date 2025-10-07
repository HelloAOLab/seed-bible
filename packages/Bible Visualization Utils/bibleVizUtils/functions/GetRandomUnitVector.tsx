const randomX = Math.random() * 2 - 1;
const randomY = Math.random() * 2 - 1;
const randomZ = Math.random() * 2 - 1;
const randomVectorNormalized = new Vector3(
  randomX,
  randomY,
  randomZ
).normalize();
return randomVectorNormalized;
