const { createContext, useState, useContext, useRef, useCallback, useEffect } = os.appHooks;

const CustomArrangementContext = createContext();

const useReferencedState = (initialValue) => {

    const [state, rawSetState] = useState(initialValue);
    const stateRef = useRef(initialValue);

    const setState = useCallback((value) => {
        stateRef.current = value;
        rawSetState(value);
    }, [])
    
    return {state, setState, stateRef}
}

export const CustomArrangementProvider = ({ children }) => {
    
    const {state: isEditor, setState: setIsEditor, stateRef: isEditorRef} = useReferencedState(false);
    
    // useEffect(() => {
    //     return () => {}
    // }, [])

  return (
    <CustomArrangementContext.Provider value={{ isEditor, setIsEditor, isEditorRef }}>
        {children}
    </CustomArrangementContext.Provider>
  );
}

export const useCustomArrangementContext = () => {
    return useContext(CustomArrangementContext);
}