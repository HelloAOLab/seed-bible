type CapitalizeFirstLetterType = (text: string) => string;

export const CapitalizeFirstLetter: CapitalizeFirstLetterType = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
