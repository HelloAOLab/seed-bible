/**
 * `CapitalizeFirstLetter` moved to the core package (see `./colors` for why the
 * import targets a concrete core file). The other two helpers are not core's
 * business and stay here.
 */
export {
  CapitalizeFirstLetter,
  type CapitalizeFirstLetterType,
} from "@packages/seed-bible/seed-bible/managers/Strings";

export const applyTranslationRule = (
  rule: string,
  variables: Record<string, string>
): string => {
  return rule.replace(
    /\{(\w+)\}/g,
    (_, key: string) => variables[key] ?? `{${key}}`
  );
};
type FormatNumberToUSDCurrencyType = (params: { value: number }) => string;

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
