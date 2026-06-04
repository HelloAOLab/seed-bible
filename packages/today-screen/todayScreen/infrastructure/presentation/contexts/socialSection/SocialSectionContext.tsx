const { createContext, useContext } = os.appHooks;

export interface SocialSectionUserProfile {
  name: string;
  pictureUrl?: string | null | undefined;
  color: string;
  icon: string;
}

export interface SocialSectionContextType {
  /** Map of subscribed user id → whether their reading is currently shown. */
  userFilters: Map<string, boolean>;
  /** Map of subscribed user id → their visual profile. */
  userProfileMap: Map<string, SocialSectionUserProfile>;
}

interface SocialSectionProviderProps {
  children: React.ReactNode;
  value: SocialSectionContextType;
}

const SocialSectionContext = createContext<
  SocialSectionContextType | undefined
>(undefined);

export const SocialSectionProvider = ({
  children,
  value,
}: SocialSectionProviderProps) => {
  return (
    <SocialSectionContext.Provider value={value}>
      {children}
    </SocialSectionContext.Provider>
  );
};

export const useSocialSectionContext = () => {
  const context = useContext(SocialSectionContext);

  if (!context) {
    throw new Error(
      "useSocialSectionContext must be used within a SocialSectionProvider"
    );
  }

  return context;
};
