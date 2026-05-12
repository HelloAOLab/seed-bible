export type CapitalizeFirstLetterType = (text: string) => string;
type FormatNumberToUSDCurrencyType = (params: { value: number }) => string;

export const CapitalizeFirstLetter: CapitalizeFirstLetterType = (text) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const FormatNumberToUSDCurrency: FormatNumberToUSDCurrencyType = ({
  value,
}) => {
  const formattedString = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);

  return formattedString;
};
