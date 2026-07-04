export const getFirstNonSpaceChars = (
  str: string,
  count: number = 3
): string => {
  let result = "";
  for (let i = 0; i < str.length && result.length < count; i++) {
    if (str[i] !== " ") result += str[i];
  }
  return result;
};
