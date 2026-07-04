import type { TestamentInfo } from "../../../seed-bible-utils/domain/models/arrangement";

import { createContext } from "preact";
import { useContext } from "preact/hooks";

export interface TestamentContextType {
  testament: TestamentInfo;
  testamentIndex: number;
}

interface TestamentProviderProps {
  children: React.ReactNode;
  value: TestamentContextType;
}

export const TestamentContext = createContext<TestamentContextType | undefined>(
  undefined
);

export const TestamentProvider = ({
  children,
  value,
}: TestamentProviderProps) => {
  return (
    <TestamentContext.Provider value={value}>
      {children}
    </TestamentContext.Provider>
  );
};

export const useTestamentContext = () => {
  const context = useContext(TestamentContext);

  if (!context) {
    throw new Error(
      "useTestamentContext must be used within a TestamentContext"
    );
  }

  return context;
};
