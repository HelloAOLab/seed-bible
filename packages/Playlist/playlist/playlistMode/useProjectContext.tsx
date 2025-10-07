const { createContext, useContext, useState, useCallback, useLayoutEffect } =
  os.appHooks;

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [menuState, setMenuState] = useState({
    hideHeadings: false,
    areBooksClosed: false,
    projectSettings: {},
    showVersionHistory: false,
  });

  const setMenuValue = useCallback((value, name) => {
    setMenuState((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  useLayoutEffect(() => {
    globalThis.ProjectMenuState = { ...menuState };
    // Optional: global access if you really need it
    globalThis.SetProjectMenuState = setMenuState;
    return () => {
      globalThis.SetProjectMenuState = null;
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
