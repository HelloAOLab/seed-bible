import { TodayProvider } from "todayScreen.infrastructure.presentation.contexts.today.TodayContext";
import { TodayContainer } from "./containers/TodayContainer";
import type { Signal } from "@preact/signals";
import type {
  CommunityReading,
  CommunityReadingSpanId,
  UserLastReading,
} from "todayScreen.domain.models.readingHistory";

const { memo } = os.appCompat;

export interface TodayConfig {
  MaterialIcon: (props: {
    children: string;
    className?: string;
  }) => preact.JSX.Element;
  SeedBibleIcon: (params?: {
    // eslint-disable-next-line
    [key: string]: any;
    size?: number | undefined;
  }) => preact.JSX.Element;
  language: string;
  username: string | undefined;
  userId: string | undefined;
  userLastReading: Signal<UserLastReading>;
  communityReading: Signal<CommunityReading<CommunityReadingSpanId>>;
  translate: (key: string, options?: Record<string, unknown>) => string;
  bookNames: Signal<Map<string, string>>;
  addTab: (
    bookId: string,
    chapter: number,
    translationId?: string | undefined
  ) => void;
  getDefaultTranslation: () => string | undefined;
  openBookSelector: () => void;
  translationBooks: Signal<{
    books: Array<{ id: string; name: string; commonName?: string }>;
  } | null>;
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
