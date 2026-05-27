type useWhyChangedType = (name: string, value: unknown) => void;

const { useEffect, useRef } = os.appHooks;

export const useWhyChanged: useWhyChangedType = (name, value) => {
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      console.log(`[WhyChanged] ${name} changed:`, {
        before: prev.current,
        after: value,
      });
      prev.current = value;
    }
  });
};
