import type { JSX, VNode } from "preact";

export function CasualOSApp({
  children,
}: {
  id: string;
  children: JSX.Element | VNode | string;
}) {
  return <>{children}</>;
}
