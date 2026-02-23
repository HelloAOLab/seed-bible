const { useCallback, useState } = os.appHooks;
const G = globalThis as any;
const Input = (props: any) => {
  const {
    value,
    class: C,
    icon = null,
    onChangeListener,
    sxInput = {},
    style,
    placeholder,
    errorMessage = "",
    type = "text",
    regex = /^.*$/,
    onFocus = () => {},
    onBlur = () => {},
  } = props;

  const [error, setError] = useState(false);

  const handleChange = useCallback(
    (e: any) => {
      const inputValue = e.target.value;
      onChangeListener(inputValue);
      setError(!regex.test(inputValue));
    },
    [regex]
  );

  return (
    <>
      <style>{thisBot.tags["input.css"]}</style>
      <div style={style} class="input-container">
        {icon && (
          <span
            class="material-symbols-outlined unfollow"
            style={{
              fontSize: "24px",
              position: "absolute",
              top: "50%",
              left: "8px",
              transform: `translateY(-50%)`,
            }}
            onClick={() => {
              G.setHide((p: any) => !p);
            }}
          >
            {icon}
          </span>
        )}
        {type === "textarea" ? (
          <textarea
            style={{ paddingLeft: icon ? "2rem" : "", ...sxInput }}
            value={value}
            onChange={handleChange}
            id="input"
            class={`input-field textarea`}
            placeholder={placeholder}
          />
        ) : (
          <input
            onFocus={onFocus}
            onBlur={onBlur}
            style={{ paddingLeft: icon ? "2rem" : "" }}
            value={value}
            onChange={handleChange}
            type={type}
            id="input"
            class={`input-field ${type} ${C}`}
            placeholder={placeholder}
          />
        )}
        {error && <small className="error-message">{errorMessage}</small>}
      </div>
    </>
  );
};

return Input;
