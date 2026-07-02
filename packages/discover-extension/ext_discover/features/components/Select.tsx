import { featureSelectCss } from "ext_discover.css.featureSelectCss";

const { useCallback, useState, useRef } = os.appHooks;

export function Select(props: Record<string, any>) {
  const {
    name,
    limit = 5,
    sxSelect,
    hidden = false,
    value,
    onChangeListener,
    options,
    secondary,
    errorMessage = "",
    regex = /^.*$/,
    styleCont = {},
  } = props;
  const [error, setError] = useState(false);
  const [hide, setHide] = useState(hidden);
  const selectRef = useRef<HTMLSelectElement>(null);

  const handleChange = useCallback(
    (e: any) => {
      if (e.target.value === "N/A") return setHide(false);
      const inputValue = e.target.value;
      onChangeListener(inputValue);
      setError(!regex.test(inputValue));
    },
    [regex, onChangeListener]
  );

  const optionsLength = options.length;
  const sliceLimit = hide ? limit : optionsLength;
  const showOptions = options.slice(0, sliceLimit);
  const isLessOptions = showOptions.length < optionsLength;

  return (
    <>
      <style>{featureSelectCss}</style>
      <div
        style={styleCont}
        className={`select-box ${secondary ? "secondary" : ""}`}
      >
        {!secondary && <p>{name}</p>}
        <select
          id={name}
          name={name}
          value={value}
          ref={selectRef}
          style={sxSelect}
          onChange={(e: any) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target.value === "N/A") {
              setHide(false);
              setTimeout(() => {
                const el = selectRef.current as any;
                el?.click();
              }, 50);
              return;
            }
            handleChange(e);
          }}
          className="form-control"
        >
          {showOptions.map((param: any) => {
            const { label, value: valueOption, hex, border, disabled } = param;
            return (
              <option
                disabled={disabled}
                style={{ background: hex, border: `1px solid ${border}` }}
                selected={value == valueOption}
                key={valueOption}
                value={valueOption}
                label={label}
              >
                {label}
              </option>
            );
          })}
          {isLessOptions && (
            <option
              value="N/A"
              style={{ background: "#f0f0f0", border: "1px solid #ccc" }}
            >
              Show More...
            </option>
          )}
        </select>
      </div>
      {error && <small className="error-message">{errorMessage}</small>}
    </>
  );
}
