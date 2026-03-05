const { createContext, useContext, useEffect } = os.appHooks;

type GlobalsContextValue = typeof globalThis & Record<string, any>;

const defaultGlobalsContextValue = new Proxy({} as GlobalsContextValue, {
  get(_target, property) {
    return (globalThis as any)[property as any];
  },
  set(_target, property, value) {
    (globalThis as any)[property as any] = value;
    return true;
  },
  has(_target, property) {
    return property in globalThis;
  },
});

let globalsContextSingleton: GlobalsContextValue = defaultGlobalsContextValue;

const GlobalsContext = createContext(globalsContextSingleton);

export function getGlobalsContextSingleton(): GlobalsContextValue {
  return globalsContextSingleton;
}

export function setGlobalsContextSingleton(
  value: GlobalsContextValue
): GlobalsContextValue {
  globalsContextSingleton = value;
  return globalsContextSingleton;
}

export function useGlobalsContext(): GlobalsContextValue {
  return useContext(GlobalsContext) ?? globalsContextSingleton;
}

export function GlobalsContextProvider({
  children,
  value,
}: {
  children: any;
  value?: GlobalsContextValue;
}) {
  const contextValue = value ?? globalsContextSingleton;

  useEffect(() => {
    setGlobalsContextSingleton(contextValue);
  }, [contextValue]);

  return (
    <GlobalsContext.Provider value={contextValue}>
      {children}
    </GlobalsContext.Provider>
  );
}
