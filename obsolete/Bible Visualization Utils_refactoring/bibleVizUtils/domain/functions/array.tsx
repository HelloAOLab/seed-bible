export const getRandomArrayElement: <K>(array: K[]) => K | undefined = (
  array
) => {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
};

export const rotateArray: <K>(arr: K[], startIndex: number) => K[] = (
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

export const subtractArrays: (arr1: unknown[], arr2: unknown[]) => unknown[] = (
  arr1,
  arr2
) => {
  return arr1.filter((item) => {
    return !arr2.includes(item);
  });
};
