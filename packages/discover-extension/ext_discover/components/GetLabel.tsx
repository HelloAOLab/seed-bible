import { splitBookAndVerse } from "ext_discover.hooks.splitBookAndVerse";
import { getGetLabelManager } from "ext_discover.managers.GetLabelManager";
import type { GetLabelProps } from "ext_discover.interfaces.components.GetLabel";

const G = globalThis as Record<string, any>;

function getLowerCaseBookMapping(): Record<string, string> {
  const bot =
    (G.Playlist as Record<string, any>) || (G.thisBot as Record<string, any>);
  return bot?.tags?.LowerCaseBookMapping ?? G.LowerCaseBookMapping ?? {};
}

export function GetLabel({
  value,
  currentOpenedBook,
  widthCompare = 176,
  fontSize,
  needToShowInMobile = false,
  instanceKey = "default",
  manager = getGetLabelManager(instanceKey),
}: GetLabelProps) {
  const isMobile = manager.isMobile.value;
  const { book, verse } = splitBookAndVerse(currentOpenedBook?.book || "");
  const lowerCaseBookMapping = getLowerCaseBookMapping();

  return (
    <span
      ref={(el) =>
        manager.attachContainer(el, widthCompare, needToShowInMobile)
      }
      style={{ fontSize: fontSize ? fontSize : "" }}
    >
      {value === "discover"
        ? `${
            isMobile ? book : lowerCaseBookMapping[book?.toLocaleLowerCase()]
          } ${currentOpenedBook?.chapter ? `- ${currentOpenedBook?.chapter}` : ""}${verse}`
        : ""}
    </span>
  );
}
