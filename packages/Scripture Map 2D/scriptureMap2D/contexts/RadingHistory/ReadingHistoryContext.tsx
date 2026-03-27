import type {
  ReadingHistoryContextType,
  ReadingHistoryProviderProps,
} from "scriptureMap2D.main.interfaces";
import { useReadingHistoryProvider } from "scriptureMap2D.contexts.RadingHistory.useReadingHistoryProvider";

const { createContext, useContext } = os.appHooks;

const ReadingHistoryContext = createContext<
  ReadingHistoryContextType | undefined
>(undefined);

export const ReadingHistoryProvider: (
  args: ReadingHistoryProviderProps
) => React.JSX.Element = ({ children }) => {
  const contextValue = useReadingHistoryProvider();

  return (
    <ReadingHistoryContext.Provider value={contextValue}>
      {children}
    </ReadingHistoryContext.Provider>
  );
};

export const useReadingHistoryContext: () => ReadingHistoryContextType = () => {
  const context = useContext(ReadingHistoryContext);

  if (!context) {
    throw new Error(
      "useReadingHistoryContext must be used within a ReadingHistoryContext"
    );
  }

  return context as ReadingHistoryContextType;
};
