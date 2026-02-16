import type { TestamentContextType } from "scriptureMap2D.main.interfaces";

const { createContext, useContext } = os.appHooks;

export const TestamentContext = createContext<TestamentContextType | undefined>(
  undefined
);

export const useTestamentContext: () => TestamentContextType = () => {
  const context = useContext(TestamentContext);

  if (!context) {
    throw new Error(
      "useTestamentContext must be used within a TestamentContext"
    );
  }

  return context as TestamentContextType;
};
