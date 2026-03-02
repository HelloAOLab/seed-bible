export const GetRandomArrayElement = <K,>(array: K[]): K | undefined => {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

export const RotateArray: <K>(arr: K[], startIndex: number) => K[] = (
  arr,
  startIndex
) => {
  if (startIndex < 0 || startIndex >= arr.length) {
    throw new Error("The start index is off of the array limits.");
  }

  const firstPart = arr.slice(startIndex);
  const secondPart = arr.slice(0, startIndex);
  const rotatedArray = firstPart.concat(secondPart);
  return rotatedArray;
};
