import "./CustomizableIcon.css";
import { createContext, type ComponentChildren } from "preact";
import { useContext } from "preact/hooks";
import { signal, type ReadonlySignal } from "@preact/signals";
import type {
  CustomizationIconId,
  CustomizationIcons,
} from "../../managers/CustomizationsManager";

const NO_CUSTOM_ICONS = signal<CustomizationIcons>({});

const CustomIconsContext =
  createContext<ReadonlySignal<CustomizationIcons>>(NO_CUSTOM_ICONS);

export function CustomIconsProvider(props: {
  icons: ReadonlySignal<CustomizationIcons>;
  children: ComponentChildren;
}) {
  return (
    <CustomIconsContext.Provider value={props.icons}>
      {props.children}
    </CustomIconsContext.Provider>
  );
}

/**
 * Draws an uploaded SVG as a mask filled with `currentColor`, so it follows
 * the theme and active/hover states the same way the built-in icons do.
 */
export function CustomIconImage(props: {
  url: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`sb-custom-icon${props.className ? ` ${props.className}` : ""}`}
      style={{
        "--sb-custom-icon-url": `url(${JSON.stringify(props.url)})`,
        "--sb-custom-icon-size": `${props.size ?? 24}px`,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Renders the active customization's own icon for `id` when it has one, and
 * `children` (the app's built-in icon) otherwise.
 */
export function CustomizableIcon(props: {
  id: CustomizationIconId;
  size?: number;
  className?: string;
  children: ComponentChildren;
}) {
  const url = useContext(CustomIconsContext).value[props.id];
  if (!url) {
    return <>{props.children}</>;
  }
  return (
    <CustomIconImage url={url} size={props.size} className={props.className} />
  );
}
