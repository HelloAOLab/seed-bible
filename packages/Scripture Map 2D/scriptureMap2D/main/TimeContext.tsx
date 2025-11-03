const {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} = os.appHooks;

const TimeContext = createContext();

export const TimeProvider = ({ children }) => {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(`[Debug] TimeContext setInterval`);
      setTick(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TimeContext.Provider value={{ tick }}>{children}</TimeContext.Provider>
  );
};

export const useTimeContext = () => {
  return useContext(TimeContext);
};
