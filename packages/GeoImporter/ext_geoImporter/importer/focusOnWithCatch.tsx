import type {
  Bot,
  FocusOnOptions,
} from "../../../../typings/AuxLibraryDefinitions";
const focusOnWithCatch = async (props: {
  bot: Bot;
  position?: { x: number; y: number; z?: number };
  options?: FocusOnOptions;
}) => {
  const { bot, position, options } = props;
  if (bot) {
    try {
      await os.focusOn(bot, {
        ...options,
      });
    } catch {
      os.log("Focus inturrupted by user");
    }
  } else {
    try {
      await os.focusOn(position || { x: 0, y: 0, z: 0 }, {
        ...options,
      });
    } catch {
      os.log("Focus inturrupted by user");
    }
  }
};
export default focusOnWithCatch;
