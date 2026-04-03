import type { JSX, VNode } from "preact";
const { useEffect } = os.appHooks;

async function renderApp(id: string, content: JSX.Element | VNode | string) {
  setTimeout(async () => {
    console.log("Render APP", id);
    await os.registerApp(id, thisBot);
    await os.compileApp(id, content);
  }, 0);
}

export function CasualOSApp({
  id,
  children,
}: {
  id: string;
  children: JSX.Element | VNode | string;
}) {
  useEffect(() => {
    renderApp(id, children);
  }, [id, children]);

  return <></>;
}
