import { createContext } from "preact";

/** The ids a `SettingRow` gives its control, so a `Switch` inside it is named and described by the row without the caller wiring ids. */
export const SettingRowContext = createContext<{
  controlId: string;
  descriptionId: string | undefined;
} | null>(null);
