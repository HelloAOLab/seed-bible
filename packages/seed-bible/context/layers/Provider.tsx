const {createContext, useReducer} = os.appHooks;

const Context = createContext();

const {reducer, initialState} = thisBot.Reducer();

const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <Context.Provider value={{state, dispatch}}>
        {children}
    </Context.Provider>
  );
};

// return {Provider, Context};

globalThis.LayersProvider = Provider;
globalThis.LayersContext = Context;