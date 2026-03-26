const { createContext, useContext, useState, useCallback, useLayoutEffect } =
  os.appHooks;
const G = globalThis as any;
const ProjectContext = createContext<any>(null);

export function ProjectProvider(props: any) {
  const { children } = props;
  const [menuState, setMenuState] = useState({
    hideHeadings: false,
    areBooksClosed: false,
    projectSettings: {},
    showVersionHistory: false,
  });

  const setMenuValue = useCallback((value: any, name: string) => {
    setMenuState((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  useLayoutEffect(() => {
    G.ProjectMenuState = { ...menuState };
    // Optional: global access if you really need it
    G.SetProjectMenuState = setMenuState;
    return () => {
      G.SetProjectMenuState = null;
    };
  }, [menuState]);

  return (
    <ProjectContext.Provider value={{ menuState, setMenuValue }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectMenu() {
  return useContext(ProjectContext);
}
