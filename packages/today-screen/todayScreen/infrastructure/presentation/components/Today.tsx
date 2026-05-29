import { TodayProvider } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import { TodayContainer } from "./ui/TodayContainer";

const { memo } = os.appCompat;

export interface TodayConfig {
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
  language: string;
  username: string | undefined;
  userId: string | undefined;
}

type TodayProps = {
  config: TodayConfig;
  customCSS?: string;
};

export const Today = memo<(args: TodayProps) => preact.JSX.Element | null>(
  ({ config, customCSS }) => {
    return (
      <>
        {customCSS && <style>{customCSS}</style>}
        <TodayProvider config={config}>
          <TodayContainer />
        </TodayProvider>
      </>
    );
  }
);
