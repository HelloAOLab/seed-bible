const { createContext, useContext } = os.appHooks;

export const TestamentContext = createContext();

export const useTestamentContext = () => {
    return useContext(TestamentContext);
}