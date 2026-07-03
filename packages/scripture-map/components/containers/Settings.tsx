import { ProjectFiltersSelector } from "./ProjectFiltersSelector";
import { ProjectStateSetter } from "./ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "./ReadingHistoryUserFiltersSelector";
import { Tooltip } from "./Tooltip";
import { useReadingHistoryTimeline } from "../../hooks/useReadingHistoryTimeline";
import { useSettings } from "../../hooks/useSettings";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { Dispatch, MutableRef, StateUpdater } from "preact/hooks";
import { ScriptureMapModes } from "../../models/scriptureMap";
import { useScriptureMapContext } from "../../contexts/ScriptureMap/ScriptureMapContext";
import type { ReadingHistoryTimelineFooterData } from "../../../seed-bible-utils/infrastructure/models/seedBible";

import { useRef } from "preact/hooks";

export type BaseSettingsOptionProps = {
  callback: () => void;
  staticText: string;
};

export type StaticSettingsOptionProps = BaseSettingsOptionProps & {
  type: "static";
  icon?: string;
};

export type ConditionalSettingsOptionProps = BaseSettingsOptionProps & {
  type: "dynamic";
  enabledText: string;
  disabledText: string;
  condition: boolean;
  enabledIcon?: string;
  disabledIcon?: string;
};

export type DividerSettingsOptionProps = {
  type: "divider";
};

export type SettingsOptionProps =
  | StaticSettingsOptionProps
  | ConditionalSettingsOptionProps
  | DividerSettingsOptionProps;

export type SettingsOptionData = {
  key: string;
} & SettingsOptionProps;

export interface SettingsOptionsProps {
  setShowOptions: Dispatch<StateUpdater<boolean>>;
  settingsButtonRef: MutableRef<HTMLDivElement | null>;
  optionsData: SettingsOptionData[];
  optionsTitle: string;
  optionsDescription: string;
}

export interface SettingsLegendSquareProps {
  style: React.CSSProperties;
}

export interface SettingsLegendSquareData extends SettingsLegendSquareProps {
  key: number;
}

export interface SettingsLegendProps {
  legendSquaresData: SettingsLegendSquareData[];
  lessText: string;
  moreText: string;
}

export interface SettingsYearselectorOptionData extends SettingsYearselectorOptionProps {
  key: number;
}

export interface SettingsYearselectorProps {
  yearSelectorLabelTextContent: string;
  yearSelectorOptionsData: SettingsYearselectorOptionData[];
}

export interface SettingsYearselectorOptionProps {
  className: string;
  onClick: () => void;
  content: number;
}

const SETTINGS_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5a87cdff4617c9047e44ec47ddd8a101aa317e2223d83dd40f615e3f9740f03a.svg";

const Option = (props: SettingsOptionProps) => {
  const { MaterialIcon } = useScriptureMapContext();

  switch (props.type) {
    case "static": {
      const { callback, staticText, icon } = props;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callback();
          }}
          className="option-button"
        >
          {icon && <MaterialIcon>{icon}</MaterialIcon>}
          {staticText}
        </button>
      );
    }
    case "dynamic": {
      const {
        callback,
        condition,
        enabledText,
        disabledText,
        staticText,
        enabledIcon,
        disabledIcon,
      } = props;
      const icon = condition ? enabledIcon : disabledIcon;
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            callback();
          }}
          className="option-button"
        >
          {icon && <MaterialIcon>{icon}</MaterialIcon>}
          {`${condition ? enabledText : disabledText} ${staticText}`}
        </button>
      );
    }
    case "divider": {
      return <div className="option-divider"></div>;
    }
  }
};

const SettingsOptions = ({
  setShowOptions,
  settingsButtonRef,
  optionsData,
  optionsTitle,
  optionsDescription,
}: SettingsOptionsProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useClickOutside([containerRef, settingsButtonRef], () =>
    setShowOptions(false)
  );

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="settings-options-container"
    >
      <span>{optionsTitle}</span>
      <span>{optionsDescription}</span>
      {optionsData.map((data) => (
        <Option {...data} />
      ))}
    </div>
  );
};

// const oldIcon = <svg
//   width="20"
//   height="20"
//   viewBox="0 0 20 20"
//   fill="none"
//   stroke="currentColor"
//   xmlns="http://www.w3.org/2000/svg"
// >
//   <g clip-path="url(#clip0_5496_10795)">
//     <path
//       d="M1.25 3.33594H4.16667M14.5833 10.0026C16.4243 10.0026 17.9167 8.51023 17.9167 6.66927C17.9167 4.82831 16.4243 3.33594 14.5833 3.33594H8.33333M5.41667 16.6693C3.57572 16.6693 2.08333 15.1769 2.08333 13.3359C2.08333 11.495 3.57572 10.0026 5.41667 10.0026H10.4167M9.58333 16.6693H14.5833"
//       stroke="var(--pageTextColor)"
//       stroke-width="1.5"
//       stroke-linecap="round"
//       stroke-linejoin="round"
//     />
//     <path
//       d="M4.16669 3.33333C4.16669 3.88587 4.38618 4.41577 4.77688 4.80647C5.16758 5.19717 5.69749 5.41667 6.25002 5.41667C6.80255 5.41667 7.33246 5.19717 7.72316 4.80647C8.11386 4.41577 8.33335 3.88587 8.33335 3.33333C8.33335 2.7808 8.11386 2.25089 7.72316 1.86019C7.33246 1.46949 6.80255 1.25 6.25002 1.25C5.69749 1.25 5.16758 1.46949 4.77688 1.86019C4.38618 2.25089 4.16669 2.7808 4.16669 3.33333Z"
//       stroke="var(--pageTextColor)"
//       stroke-width="1.5"
//       stroke-linecap="round"
//       stroke-linejoin="round"
//     />
//     <path
//       d="M5.41669 16.6693C5.41669 17.2218 5.63618 17.7517 6.02688 18.1424C6.41758 18.5331 6.94749 18.7526 7.50002 18.7526C8.05255 18.7526 8.58246 18.5331 8.97316 18.1424C9.36386 17.7517 9.58335 17.2218 9.58335 16.6693C9.58335 16.1167 9.36386 15.5868 8.97316 15.1961C8.58246 14.8054 8.05255 14.5859 7.50002 14.5859C6.94749 14.5859 6.41758 14.8054 6.02688 15.1961C5.63618 15.5868 5.41669 16.1167 5.41669 16.6693Z"
//       stroke="var(--pageTextColor)"
//       stroke-width="1.5"
//       stroke-linecap="round"
//       stroke-linejoin="round"
//     />
//     <path
//       d="M10.4167 9.9974C10.4167 10.5499 10.6362 11.0798 11.0269 11.4705C11.4176 11.8612 11.9475 12.0807 12.5 12.0807C13.0526 12.0807 13.5825 11.8612 13.9732 11.4705C14.3639 11.0798 14.5834 10.5499 14.5834 9.9974C14.5834 9.44486 14.3639 8.91496 13.9732 8.52426C13.5825 8.13356 13.0526 7.91406 12.5 7.91406C11.9475 7.91406 11.4176 8.13356 11.0269 8.52426C10.6362 8.91496 10.4167 9.44486 10.4167 9.9974Z"
//       stroke="var(--pageTextColor)"
//       stroke-width="1.5"
//       stroke-linecap="round"
//       stroke-linejoin="round"
//     />
//     <path
//       d="M14.6952 18.5034C14.7291 18.7091 14.9265 18.806 15.1191 18.7263C15.4595 18.5853 16.066 18.3107 16.9853 17.8145C17.6009 17.4823 18.0061 17.2162 18.2709 17.0165C18.6014 16.7671 18.6014 16.3619 18.2709 16.1125C18.0062 15.9128 17.6009 15.6468 16.9853 15.3145C16.0661 14.8185 15.4596 14.5439 15.1192 14.4029C14.9266 14.323 14.7291 14.42 14.6952 14.6257C14.6421 14.949 14.5833 15.5384 14.5833 16.5645C14.5833 17.5907 14.6421 18.1801 14.6952 18.5034Z"
//       stroke="var(--pageTextColor)"
//       stroke-width="1.5"
//       stroke-linecap="round"
//       stroke-linejoin="round"
//     />
//   </g>
//   <defs>
//     <clipPath id="clip0_5496_10795">
//       <rect width="24" height="24" fill="white" />
//     </clipPath>
//   </defs>
// </svg>

const ReadingHistoryTimelineSection = ({
  footer,
}: {
  footer?: ReadingHistoryTimelineFooterData;
}) => {
  const { ReadingHistoryTimeline } = useScriptureMapContext();
  const { itemsData, timelineRef } = useReadingHistoryTimeline();

  return (
    <ReadingHistoryTimeline
      itemsData={itemsData}
      timelineRef={timelineRef}
      Tooltip={Tooltip}
      footer={footer}
    />
  );
};

export const Settings = () => {
  const {
    settingsClass,
    settingsButtonRef,
    handleSettingsButtonClick,
    showOptions,
    setShowOptions,
    collapsed,
    mode,
    project,
    isInSelectionMode,
    shouldShowReadingHistory,
    optionsData,
    legendSquaresData,
    yearSelectorLabelTextContent,
    yearSelectorOptionsData,
    title,
    optionsTitle,
    optionsDescription,
    lessText,
    moreText,
  } = useSettings();

  return (
    <div className={settingsClass}>
      <div className="settings-title scripture-title">
        <span class="material-symbols-outlined">splitscreen_portrait</span>
        <span className="scripture-title">{title}</span>
      </div>

      <div
        className="header-button settings-button"
        ref={settingsButtonRef}
        onClick={handleSettingsButtonClick}
      >
        <img src={SETTINGS_ICON} alt="SETTINGS_ICON" className="coloredIcon" />
        {showOptions && (
          <SettingsOptions
            setShowOptions={setShowOptions}
            settingsButtonRef={settingsButtonRef}
            optionsData={optionsData}
            optionsTitle={optionsTitle}
            optionsDescription={optionsDescription}
          />
        )}
      </div>

      <span className={"horizontal-divider"}></span>

      {mode === ScriptureMapModes.Project && project && (
        <>
          <ProjectStateSetter />
          {!isInSelectionMode && <ProjectFiltersSelector />}
        </>
      )}
      {shouldShowReadingHistory && (
        <>
          <ReadingHistoryUserFiltersSelector />
          <ReadingHistoryTimelineSection
            footer={
              collapsed
                ? undefined
                : {
                    legendSquaresData,
                    lessText,
                    moreText,
                    yearSelectorLabelTextContent,
                    yearSelectorOptionsData,
                  }
            }
          />
        </>
      )}
    </div>
  );
};
