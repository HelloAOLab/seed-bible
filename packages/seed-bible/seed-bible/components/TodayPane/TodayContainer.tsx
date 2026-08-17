import { useTodayContainer } from "./useTodayContainer";
import { TodayContent } from "./TodayContent";
import { Welcome } from "./Welcome";
import type { TodayScreenProps } from "./TodayPane";

export const TodayContainer = (props: TodayScreenProps) => {
  const { showWelcome, style } = useTodayContainer(props.today);

  return (
    <div className="today-container" style={style}>
      {showWelcome ? (
        <Welcome
          today={props.today}
          login={props.login}
          theme={props.theme}
          onOpenBookSelector={props.onOpenBookSelector}
          onOpenPassage={props.onOpenPassage}
        />
      ) : (
        <TodayContent {...props} />
      )}
    </div>
  );
};
