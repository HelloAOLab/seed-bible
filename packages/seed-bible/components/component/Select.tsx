const { useCallback, useState, useRef } = os.appHooks;

const Button = thisBot.Button();
// <option value="" disabled>
//     {placeholder}
// </option>

const Select = ({ name, limit = 5, sxSelect, hidden = false, value, onChangeListener, options, secondary, placeholder, errorMessage = "", regex = /^.*$/, styleCont = {} }) => {

    const [error, setError] = useState(false);
    const [hide, setHide] = useState(hidden);
    const selectRef = useRef();

    const handleChange = useCallback((e) => {
        if (e.target.value === 'N/A') return setHide(false);
        const inputValue = e.target.value;
        onChangeListener(inputValue);
        setError(!regex.test(inputValue));
    }, [regex]);

    const optionsLength = options.length;

    const sliceLimit = hide ? limit : optionsLength;

    const showOptions = options.slice(0, sliceLimit);

    const isLessOptions = showOptions.length < optionsLength;

    return <>
        <style>{thisBot.tags["select.css"]}</style>
        <div style={styleCont} className={`select-box ${secondary ? 'secondary' : ''}`}>
            {!secondary && <p>{name}</p>}
            <select
                id={name}
                name={name}
                value={value}
                ref={selectRef}
                style={sxSelect}
                onChange={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.target.value === "N/A") {
                        setHide(false);
                        setTimeout(() => {
                            const el = selectRef.current;
                            el.click();
                        }, 50);
                        return;
                    }
                    handleChange(e);
                }}
                className="form-control"
            >

                {showOptions.map(({ label, value: valueOption, hex, border, disabled }) => {
                    return (
                        <option disabled={disabled} style={{ background: hex, border: `1px solid ${border}` }} selected={value == valueOption} key={valueOption} value={valueOption} label={label}>
                            {label}
                        </option>
                    );
                })}
                {isLessOptions && <option 
                    value="N/A" 
                    style={{ background: "#f0f0f0", border: "1px solid #ccc" }}
                    onClick={() => {
                        setHide(false);
                        setTimeout(() => {
                            const el = selectRef.current;
                            el.click();
                        }, 50);
                    }}
                >
                    Show More...
                </option>}
            </select>
            {false && hidden && (
                <Button
                    style={{ fontSize: "12px", marginLeft: '12px', color: '#4459F3' }}
                    onClick={() => {
                        setHide(p => !p)
                    }}
                    small
                    secondaryAlt
                >
                    {isLessOptions ? "Show more" : 'Show less'}
                </Button>
            )}
        </div>
        {error && <small className="error-message">{errorMessage}</small>}
    </>;
}

return Select;

