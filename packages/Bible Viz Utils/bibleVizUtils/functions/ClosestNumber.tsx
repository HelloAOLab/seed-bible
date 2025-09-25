const { arr, input } = that;

let closest = arr[0];
let closestDifference = Math.abs(input - closest);

for (let i = 1; i < arr.length; i++) {
  const difference = Math.abs(input - arr[i]);

  if (difference < closestDifference) {
    closest = arr[i];
    closestDifference = difference;
  }
}

return closest;