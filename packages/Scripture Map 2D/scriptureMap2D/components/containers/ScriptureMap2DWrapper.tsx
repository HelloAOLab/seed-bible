import { Container } from "scriptureMap2D.components.containers.Container";
import { Settings } from "scriptureMap2D.components.containers.Settings";
import { Controls } from "scriptureMap2D.components.containers.Controls";
import { useScriptureMap2DWrapper } from "scriptureMap2D.hooks.useScriptureMap2DWrapper";

export const ScriptureMap2DWrapper = () => {
  const { style } = useScriptureMap2DWrapper();

  return (
    <div className="scripture-map-2d-wrapper" style={style}>
      <Settings />
      <Container />
      <Controls />
    </div>
  );
};
