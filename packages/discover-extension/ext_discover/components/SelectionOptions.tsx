import { selectionOptionsCss } from "ext_discover.css.selectionOptionsCss";
import { RenderIcon } from "ext_discover.components.RenderIcon";
import { LoaderSecondary } from "ext_discover.features.components.LoaderSecondary";
import type {
  SelectionOptionItem,
  SelectionOptionsProps,
} from "ext_discover.interfaces.components.SelectionOptions";

export function SelectionOptions({
  handleClose,
  options,
  dontCloseOnClick = false,
  isPlaylist = false,
  onClickOption,
  loading = false,
}: SelectionOptionsProps) {
  const onClick = (option: SelectionOptionItem) => {
    if (onClickOption) {
      onClickOption(option);
    } else if (option.onClick) {
      option.onClick(option);
    }
    if (!dontCloseOnClick) {
      handleClose();
    }
  };

  return (
    <>
      <style>{selectionOptionsCss}</style>
      <div className="backdrop" onClick={handleClose} />
      <div className="selection-contianer">
        {loading ? (
          <div className="selection-option-loading">
            <LoaderSecondary />
          </div>
        ) : (
          options.map((option) =>
            isPlaylist ? (
              <div
                className="selection-option"
                key={option.key ?? option.label}
                onClick={() => onClick(option)}
              >
                <RenderIcon
                  isCustomIcons={false}
                  small
                  icon="subscriptions"
                  list={option.metaData?.list ?? []}
                />
                <p className="selection-option-label">{option.label}</p>
              </div>
            ) : (
              <div
                onClick={() => onClick(option)}
                className="selection-option"
                key={option.key ?? option.label}
              >
                {option.label}
              </div>
            )
          )
        )}
        {options.length === 0 && (
          <p className="selection-option-label">{t("noOptionsFound")}</p>
        )}
      </div>
    </>
  );
}
