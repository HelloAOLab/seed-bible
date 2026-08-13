import { useComputed } from "@preact/signals";
import type { ReadonlySignal } from "@preact/signals";
import type { UserIconData } from "../components/containers/PresenceCard";
import { useTodayContext } from "../contexts/today/TodayContext";

import { useMemo, useCallback } from "preact/hooks";

type UsePresenceCard = () => {
  liveText: string;
  reading: ReadonlySignal<string | undefined>;
  userIconsData: ReadonlySignal<UserIconData[]>;
  joinText: string;
  handleJoinClick: () => void;
  showCard: ReadonlySignal<boolean>;
};

export const usePresenceCard: UsePresenceCard = () => {
  const {
    // Aliased rather than used as `t`: PresenceCard is commented out of
    // SocialSection, so `live-now`/`Join` were deliberately left behind in the
    // extension's own translations instead of being promoted into core. Calling
    // them through `t` would make the i18n rules demand core keys for a card
    // that never renders.
    t: translate,
    sharedSessions,
    bookNames,
    userDeterministicIdentityProvider,
    MaterialIcon,
    joinSharedSession,
  } = useTodayContext();

  const liveText = useMemo(() => translate("live-now"), [translate]);
  const joinText = useMemo(() => translate("Join"), [translate]);

  const session = useComputed(() => sharedSessions.value[0]);

  const reading = useComputed(() => {
    if (!session.value) return undefined;

    const bookId = session.value.readingState.bookId.value;
    const chapter = session.value.readingState.chapterNumber.value;

    return `${bookId ? bookNames.value.get(bookId) : bookId} ${chapter}`;
  });

  const userIconsData = useComputed<UserIconData[]>(() => {
    if (!session.value) return [];

    return session.value.connectedUsers.value.map((user) => ({
      pictureUrl: user.profile?.pictureUrl ?? undefined,
      color: user.visual.color,
      icon: userDeterministicIdentityProvider.getIconById(
        user.userId ?? user.connectionId
      ),
      MaterialIcon,
      key: user.userId ?? user.connectionId,
    }));
  });

  const showCard = useComputed(
    () => !!reading.value && userIconsData.value.length > 0
  );

  const handleJoinClick = useCallback(() => {
    const current = session.value;
    if (current) {
      joinSharedSession(current.id);
    }
  }, [session, joinSharedSession, session.value]);

  return {
    liveText,
    reading,
    userIconsData,
    joinText,
    showCard,
    handleJoinClick,
  };
};
