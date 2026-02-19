/* global os, thisBot, configBot, getID, tags, sendRemoteData */
const { useState, useEffect, useRef } = os.appHooks;
import { SettingsIcon } from "app.components.phosphoricons";
import { MenuIcon } from "app.components.icons";
const Reciver = getBot("system", "app.reciver");
import { useTabsContext } from "app.hooks.tabs";

import {
  TreeIcon,
  LogIcon,
  LeafIcon,
  CatIcon,
  DogIcon,
  CoffeBeanIcon,
} from "app.components.phosphoricons";
import { useMouseMove } from "app.hooks.mouseMove";

const MAX_VISIBLE = 5;
const icons = [TreeIcon, LogIcon, LeafIcon, CatIcon, DogIcon, CoffeBeanIcon];
export const colors = [
  "#34D399",
  "#60A5FA",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#F87171",
  "#10B981",
  "#F59E0B",
];

function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return h >>> 0;
}

function computeVisual(remoteId) {
  const h = hashString(String(remoteId));
  const iconIndex = h % icons.length;
  const colorIndex = Math.floor(h / icons.length) % colors.length;
  return { iconIndex, colorIndex };
}

function getOrSetVisualInTags(remoteId) {
  try {
    if (typeof tags !== "undefined") {
      if (!tags.userPresenceData) tags.userPresenceData = {};
      if (!tags.userPresenceData.visuals) tags.userPresenceData.visuals = {};
      if (!tags.userPresenceData.usedIndices)
        tags.userPresenceData.usedIndices = { colors: [], icons: [] };

      if (!tags.userPresenceData.visuals[remoteId]) {
        // Get available indices (filter out used ones)
        let availableColorIndices = colors
          .map((_, i) => i)
          .filter((i) => !tags.userPresenceData.usedIndices.colors.includes(i));

        let availableIconIndices = icons
          .map((_, i) => i)
          .filter((i) => !tags.userPresenceData.usedIndices.icons.includes(i));

        // If all indices are used, reset and use all indices again
        if (availableColorIndices.length === 0) {
          tags.userPresenceData.usedIndices.colors = [];
          availableColorIndices = colors.map((_, i) => i);
        }

        if (availableIconIndices.length === 0) {
          tags.userPresenceData.usedIndices.icons = [];
          availableIconIndices = icons.map((_, i) => i);
        }

        // Compute visual with available indices
        const visual = computeVisual(
          remoteId,
          availableColorIndices,
          availableIconIndices
        );

        // Record the used indices
        tags.userPresenceData.usedIndices.colors.push(visual.colorIndex);
        tags.userPresenceData.usedIndices.icons.push(visual.iconIndex);

        tags.userPresenceData.visuals[remoteId] = visual;
      }

      const data = tags.userPresenceData.visuals[remoteId];
      return {
        ...data,
        color: colors[data.colorIndex],
        Icon: icons[data.iconIndex],
      };
    }
  } catch (_) {
    return { color: null, Icon: null };
  }
  return computeVisual(remoteId);
}

globalThis.GetOrSetVisualInTags = getOrSetVisualInTags;
shout("onGetOrSetVisualInTagsDefined");

async function getSelfIdSafe() {
  try {
    return getID?.(configBot) ?? configBot?.id ?? null;
  } catch (_) {
    return configBot?.id ?? null;
  }
}

function safeUpdateSession(hostId, updater) {
  try {
    const clonedTags = JSON.parse(JSON.stringify(tags || {}));
    if (!clonedTags.sessions) clonedTags.sessions = {};
    const old = clonedTags.sessions[hostId] || { config: {}, followers: [] };
    const updatedSession = updater(old);
    clonedTags.sessions[hostId] = updatedSession;
    tags.sessions = clonedTags.sessions;
    os.emit?.("sessionsUpdated", clonedTags.sessions);
    return clonedTags.sessions;
  } catch (err) {
    os.log("safeUpdateSession failed:", err);
  }
}
function getUserSessionInfo(userId) {
  try {
    if (typeof tags === "undefined" || !tags.sessions) {
      return { inSession: false, role: "none", config: null };
    }

    const sessions = tags.sessions;
    let role = "none";
    let config = null;
    let hostId = null;

    // 1️⃣ Check if user is a host
    if (sessions[userId]) {
      role = "host";
      config = sessions[userId].config || null;
      hostId = userId;
    } else {
      // 2️⃣ Check if user is a co-host or follower in another session
      for (const [hId, sess] of Object.entries(sessions)) {
        if (sess.coHosts?.includes(userId)) {
          role = "coHost";
          config = sess.config || null;
          hostId = hId;
          break;
        }
        if (sess.followers?.includes(userId)) {
          role = "follower";
          config = sess.config || null;
          hostId = hId;
          break;
        }
      }
    }

    const inSession = role !== "none";
    return { inSession, role, config, hostId };
  } catch (err) {
    os.log?.("getUserSessionInfo failed:", err);
    return { inSession: false, role: "none", config: null };
  }
}
globalThis.GetUserSessionInfo = getUserSessionInfo;

export function UserPresence({ collapsed = false }) {
  const [showSettings, setShowSettings] = useState(false);
  const [users, setUsers] = useState([]);
  const listenersAddedRef = useRef(false);
  const { position } = useMouseMove();
  const [selfId, setSelfId] = useState(null);
  const [sessions, setSessions] = useState(tags.sessions || {});
  const [following, setFollowing] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [, update] = useState();
  const [isPrivateMode, setIsPrivateMode] = useState(
    tags.isPrivateMode || false
  );
  const {
    addTab,
    updateTab,
    setActiveTab,
    tabs,
    removeTab,
    activeTab,
    sharedTab,
    setSharedTab,
  } = useTabsContext();

  useEffect(() => {
    const handleClickOutside = (event) => {
      const settingsContainer = document.querySelector(".stngs");
      if (settingsContainer && !settingsContainer.contains(event.target)) {
        setShowSettings(false);
      }
    };

    if (showSettings) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSettings]);
  useEffect(() => {
    if (configBot.tags.hosted) {
      handleBarClick();
    }
    (async () => {
      const id = await getSelfIdSafe();
      setSelfId(id);
      if (!tags.sessions) tags.sessions = {};
      if (tags.sessions[id]) {
        setIsHost(true);
        setHasInteracted(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selfId) return;
    const amHost = !!sessions[selfId];
    setIsHost(amHost);
    if (amHost) setFollowing(null);
  }, [sessions, selfId]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        if (JSON.stringify(tags.sessions) !== JSON.stringify(sessions)) {
          setSessions(JSON.parse(JSON.stringify(tags.sessions || {})));
        }
      } catch (_) {}
    }, 1000);
    os.on?.("sessionsUpdated", (sess) => setSessions(sess));
    return () => clearInterval(interval);
  }, [sessions]);

  const refreshOthers = async () => {
    // return
    const remotes = (await os.remotes()) || [];
    const selfIdLocal = await getSelfIdSafe();
    const allIds = new Set(remotes);

    // Include all IDs found in sessions (host, cohosts, followers)
    Object.entries(tags.sessions || {}).forEach(([hostId, session]) => {
      allIds.add(hostId);
      (session.coHosts || []).forEach((id) => allIds.add(id));
      (session.followers || []).forEach((id) => allIds.add(id));
    });

    // ✅ Build user list with session info
    const mapped = Array.from(allIds).map((userId) => {
      const { iconIndex, colorIndex } = getOrSetVisualInTags(userId);
      const info = getUserSessionInfo(userId);
      return {
        remoteId: userId,
        iconIndex,
        colorIndex,
        isCurrentHost: info.role === "host",
        isCoHost: info.role === "coHost",
        isFollower: info.role === "follower",
        inSession: info.inSession,
        hostId: info.hostId,
        isSelf: userId === selfIdLocal,
      };
    });

    // ✅ Show:
    // - All hosts
    // - Yourself (if host or following)
    // - Anyone in a session
    // - Exclude private users
    const privateUsers = tags.privateUsers || [];
    const visible = mapped.filter(
      (u) =>
        !privateUsers.includes(u.remoteId) &&
        (u.isCurrentHost ||
          (u.inSession && u.hostId) ||
          (u.isSelf && (isHost || following)))
    );

    // Sort: hosts first, then others
    visible.sort((a, b) => {
      if (a.isCurrentHost && !b.isCurrentHost) return -1;
      if (!a.isCurrentHost && b.isCurrentHost) return 1;
      return String(a.remoteId).localeCompare(String(b.remoteId));
    });

    setUsers(visible);
  };

  useEffect(() => {
    refreshOthers();
    if (!listenersAddedRef.current) {
      listenersAddedRef.current = true;
      const onJoin = (evt) => {
        const rid = evt?.remoteId;
        if (!rid) return;
        const { iconIndex, colorIndex } = getOrSetVisualInTags(rid);
        // setUsers((prev) => {
        //   if (prev.some((u) => u.remoteId === rid)) return prev;
        //   const next = [...prev, { remoteId: rid, iconIndex, colorIndex }];
        //   next.sort((a, b) =>
        //     String(a.remoteId).localeCompare(String(b.remoteId))
        //   );
        //   return next;
        // });
      };
      const onLeave = (evt) => {
        const rid = evt?.remoteId;
        if (!rid) return;
        setUsers((prev) => prev.filter((u) => u.remoteId !== rid));
      };
      const onRemoteData = (evt) => {
        const that = evt;
        const name = that.name;
        if (!name) return;

        if (name === "sessionStarted") {
          const { hostId, tab } = that.that || {};
          console.log(hostId, "sessionStarted", "sessionData", that.that);
          if (!hostId || hostId === selfId) return;
          // if(!tags.onlineTab)
          addTab({ ...tab, sharedTab: true, hostId: hostId });
          masks["sharedTab"] = tab.id;
          // setTagMask(thisBot, 'onlineTab', tab, 'tempShared')
          // tags.onlineTab = tab
          update((prev) => !prev);
          if (masks["invitationFor"] === hostId) {
            os.log(
              masks["invitationFor"],
              hostId,
              tab,
              `masks['invitationFor'] === hostId`
            );
            // followHost(masks['invitationFor']);
            // setHasInteracted(true);

            setTimeout(() => {
              HandleSharedTabClick();
              setActiveTab(tags.onlineTab.id);
              UpdateTab(tags.onlineTab);
            }, 500);
            return;
          }
          // Add notification
          const notifId = `${hostId}-${Date.now()}`;
          setNotifications((prev) => [
            ...prev,
            { id: notifId, hostId, timestamp: Date.now() },
          ]);

          // Auto-remove after 10 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notifId));
          }, 10000);
        } else if (name === "sessionFollow") {
          const { hostId, followerId } = that.that || {};
          if (hostId === selfId) {
            setSessions((prev) => {
              const updated = safeUpdateSession(selfId, (old) => ({
                ...old,
                config: old.config || defaultConfig(),
                followers: Array.from(
                  new Set([...(old.followers || []), followerId])
                ),
              }));
              return updated;
            });
          }
        } else if (name === "sessionEnd") {
          os.log(tabs, sharedTab, masks["sharedTab"], "allTabs", "sessionEnd");
          removeTab(masks["sharedTab"]);
          setSharedTab(null);
          tags.onlineTab = null;

          const { hostId } = that.that || {};
          if (!hostId) return;
          setNotifications([]);
          update((prev) => !prev);
          setSessions((prev) => {
            const next = { ...prev };
            delete next[hostId];
            const cloned = JSON.parse(JSON.stringify(tags || {}));
            if (cloned.sessions && cloned.sessions[hostId]) {
              delete cloned.sessions[hostId];
            }
            tags.sessions = cloned.sessions;
            return next;
          });

          // If I was following this host, reset my state
          setFollowing((prev) => {
            if (prev === hostId) {
              setHasInteracted(false);
              return null;
            }
            return prev;
          });
        } else if (name === "sessionUnfollow") {
          const { hostId, followerId } = that.that || {};
          if (hostId === selfId) {
            setSessions((prev) => {
              const updated = safeUpdateSession(selfId, (old) => ({
                ...old,
                followers: (old.followers || []).filter(
                  (id) => id !== followerId
                ),
              }));
              return updated;
            });
          }
        } else if (name === "inviteSession") {
          const { inviterId, config } = that.that || {};
          if (!inviterId || inviterId === selfId) return;

          // show invite notification
          const notifId = `${inviterId}-${Date.now()}`;
          setNotifications((prev) => [
            ...prev,
            {
              id: notifId,
              inviterId,
              config,
              type: "invite",
              timestamp: Date.now(),
            },
          ]);

          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== notifId));
          }, 15000);
        } else if (name === "userWentPrivate") {
          const { userId } = that.that || {};
          if (!userId) return;
          // Track private users so we don't show them
          if (!tags.privateUsers) tags.privateUsers = [];
          if (!tags.privateUsers.includes(userId)) {
            tags.privateUsers = [...tags.privateUsers, userId];
          }
          // Remove user from visible users list
          setUsers((prev) => prev.filter((u) => u.remoteId !== userId));
          os.log?.(`[PrivateMode] User ${userId} went private`);
        } else if (name === "userWentPublic") {
          const { userId } = that.that || {};
          if (!userId) return;
          // Remove from private users list
          if (tags.privateUsers) {
            tags.privateUsers = tags.privateUsers.filter((id) => id !== userId);
          }
          // Refresh to show user again
          refreshOthers();
          os.log?.(`[PrivateMode] User ${userId} went public`);
        }
      };

      os.addBotListener(thisBot, "onRemoteJoined", onJoin);
      os.addBotListener(thisBot, "onRemoteLeave", onLeave);
      os.addBotListener(thisBot, "onRemoteData", onRemoteData);
    }
  }, [following, sessions, selfId, sharedTab, setSharedTab]);
  useEffect(() => {
    if (tags.onlineTab) {
      addTab({
        ...tags.onlineTab,
        sharedTab: true,
        hostId: tags.hostIdForOnlineTab,
      });
      masks["sharedTab"] = tags.onlineTab;
    }
    // setTagMask(thisBot, 'onlineTab', tab, 'tempShared')
  }, []);
  const defaultConfig = () => ({
    onlyHostNav: true,
    sharedTab: true,
    autoScroll: true,
    onlyHostHighlight: false,
    highlightDuration: 16,
    onlyHostSelect: true,
    showOthersActivity: false,
  });

  const handleBarClick = () => {
    if (hasInteracted) return;

    setHasInteracted(true);

    // Check if there's already an active host
    const existingHosts = Object.keys(sessions);

    if (existingHosts.length === 0) {
      // No host exists - become the host
      startSession();
    } else {
      // Host exists - become a follower
      const hostId = existingHosts[0];
      os.log(configBot.id, "following", hostId);
      followHost(hostId);
      setActiveTab(tags.onlineTab.id);
      UpdateTab(tags.onlineTab);
    }
  };
  globalThis.HandleSharedTabClick = handleBarClick;

  const startSession = () => {
    const config = defaultConfig();
    const updated = safeUpdateSession(selfId, () => ({
      config,
      followers: [],
      coHosts: [],
    }));
    setSessions(updated);
    setIsHost(true);
    setFollowing(null);
    // os.log(globalThis?.CurrentTab.id, 'globalThis?.CurrentTab.id')
    // updateActiveTab({ sharedTab: true, hostId: selfId })
    const { color } = getOrSetVisualInTags(configBot.id);
    if (!tags.onlineTab)
      globalThis.CurrentTab = addTab({
        id: uuid(),
        taken: false,
        sharedTab: true,
        hostId: configBot.id,
        color,
        data: {
          use: "thePage",
          type: "book",
          book: "Genesis",
          bookId: "GEN",
          chapter: 1,
          translation: "BSB",
          shortName: "BSB",
        },
      });
    masks["sharedTab"] = globalThis.CurrentTab.id;
    globalThis.UpdateTab(globalThis.CurrentTab);
    setActiveTab(globalThis.CurrentTab.id);
    tags.onlineTab = globalThis.CurrentTab;
    tags.hostIdForOnlineTab = configBot.id;
    // Notify all other users
    const notifyOthers = async () => {
      const remotes = (await os.remotes()) || [];
      const others = remotes.filter((id) => id !== selfId);
      if (others.length > 0) {
        sendRemoteData(others, "sessionStarted", {
          hostId: selfId,
          tab: globalThis?.CurrentTab,
        });
        masks["sharedTab"] = globalThis?.CurrentTab.id;
        update((prev) => !prev);
      }
    };
    notifyOthers();
  };
  globalThis.StartSession = startSession;

  async function FollowSpecificUser(targetUserId) {
    const selfId = await getSelfIdSafe();
    if (!targetUserId || !selfId) return;

    const targetSession = tags.sessions?.[targetUserId];
    if (targetSession) {
      // target already host → follow them
      safeUpdateSession(targetUserId, (old) => ({
        ...old,
        followers: Array.from(new Set([...(old.followers || []), selfId])),
      }));
      sendRemoteData([targetUserId], "sessionFollow", {
        hostId: targetUserId,
        followerId: selfId,
      });
      os.log?.(`[FollowSpecificUser] You are now following ${targetUserId}`);
    } else {
      // target not host → create host session for them
      safeUpdateSession(targetUserId, () => ({
        config: {
          onlyHostNav: true,
          sharedTab: true,
          autoScroll: true,
          onlyHostHighlight: true,
          highlightDuration: 16,
          onlyHostSelect: true,
          showOthersActivity: false,
        },
        followers: [selfId],
        coHosts: [],
      }));
      tags.sessions = tags.sessions || {};
      sendRemoteData([targetUserId], "sessionStarted", {
        hostId: targetUserId,
      });
      sendRemoteData([targetUserId], "sessionFollow", {
        hostId: targetUserId,
        followerId: selfId,
      });
      os.log?.(
        `[FollowSpecificUser] Created and followed new session for ${targetUserId}`
      );
    }
  }

  globalThis.FollowSpecificUser = FollowSpecificUser;

  async function InviteUser(targetUserId) {
    const selfId = await getSelfIdSafe();
    if (!targetUserId || !selfId) return;
    const config = defaultConfig();
    masks["invitationFor"] = targetUserId;
    sendRemoteData([targetUserId], "inviteSession", {
      inviterId: selfId,
      config,
    });

    os.log?.(`[InviteUser] Invited ${targetUserId} to host session.`);
  }
  globalThis.InviteUser = InviteUser;
  async function AcceptInvite(inviterId) {
    startSession();
  }
  const stopSession = () => {
    os.log("removeTab", masks["sharedTab"], removeTab, "removeTab");
    // return
    removeTab(masks["sharedTab"]);

    const myFollowers = sessions[selfId]?.followers || [];
    tags.onlineTab = null;
    // if (myFollowers.length) {
    //   sendRemoteData(myFollowers, "sessionEnd", { hostId: selfId });
    // }
    const notifyOthers = async () => {
      const remotes = (await os.remotes()) || [];
      const others = remotes.filter((id) => id !== selfId);
      if (others.length > 0) {
        sendRemoteData(others, "sessionEnd", { hostId: selfId });
      }
    };
    notifyOthers();
    const next = { ...sessions };
    delete next[selfId];
    const cloned = JSON.parse(JSON.stringify(tags));
    cloned.sessions = next;
    tags.sessions = cloned.sessions;

    // os.emit?.("sessionsUpdated", next);
    setSessions(next);
    setIsHost(false);
    setHasInteracted(false);
    tags.sessions = null;
  };

  const unfollowHost = () => {
    if (!following || !selfId) return;

    // Remove self from the host's followers
    safeUpdateSession(following, (old) => ({
      ...old,
      followers: (old.followers || []).filter((id) => id !== selfId),
    }));

    // Clean up if the host session has no followers or cohosts left
    // const hostSession = tags.sessions?.[following];
    // if (
    //   hostSession &&
    //   (!hostSession.followers?.length && !hostSession.coHosts?.length)
    // ) {
    //   delete tags.sessions[following];
    // }

    // Update local state
    setFollowing(null);
    setHasInteracted(false);
    sendRemoteData(sessions[following].followers, "sessionUnfollow", {
      hostId: following,
      followerId: selfId,
    });
  };

  const togglePrivateMode = async () => {
    const newPrivateMode = !isPrivateMode;
    setIsPrivateMode(newPrivateMode);
    tags.isPrivateMode = newPrivateMode;

    const remotes = (await os.remotes()) || [];
    const others = remotes.filter((id) => id !== selfId);

    if (newPrivateMode) {
      // Going private: notify others that this user is going offline/invisible
      if (others.length > 0) {
        sendRemoteData(others, "userWentPrivate", { userId: selfId });
      }
      // If hosting a session, end it
      if (isHost) {
        stopSession();
      }
      // If following someone, unfollow
      if (following) {
        unfollowHost();
      }
    } else {
      // Coming back online: notify others that this user is visible again
      if (others.length > 0) {
        sendRemoteData(others, "userWentPublic", { userId: selfId });
      }
    }

    os.log?.(
      `[PrivateMode] User ${selfId} is now ${newPrivateMode ? "private" : "public"}`
    );
  };

  globalThis.TogglePrivateMode = togglePrivateMode;
  globalThis.IsPrivateMode = () => isPrivateMode;

  const followHost = (hostId) => {
    if (!sessions[hostId]) return;
    setFollowing(hostId);
    sendRemoteData([hostId], "sessionFollow", { hostId, followerId: selfId });
    const updated = safeUpdateSession(hostId, (old) => ({
      ...old,
      followers: Array.from(new Set([...(old.followers || []), selfId])),
    }));
    setSessions(updated);
    refreshOthers();
  };

  const makeCoHost = (hostId, userId) => {
    const updated = safeUpdateSession(hostId, (old) => ({
      ...old,
      coHosts: Array.from(new Set([...(old.coHosts || []), userId])),
    }));
    setSessions(updated);
  };

  const swapHost = (currentHostId, newHostId) => {
    const currentSession = sessions[currentHostId];
    if (!currentSession) return;
    if (!currentSession.followers?.includes(newHostId)) return;
    const next = { ...sessions };
    delete next[currentHostId];
    next[newHostId] = {
      ...currentSession,
      followers: Array.from(
        new Set([...(currentSession.followers || []), currentHostId])
      ).filter((f) => f !== newHostId),
    };
    tags.sessions = next;
    setSessions(next);
    setIsHost(false);
    setFollowing(newHostId);
  };

  const updateConfig = (newConfig) => {
    setSessions((prev) => {
      const updated = safeUpdateSession(selfId, (old) => ({
        ...old,
        config: newConfig,
        followers: old.followers || [],
        coHosts: old.coHosts || [],
      }));
      return updated;
    });
  };

  // Separate hosts and followers
  const hosts = users.filter((u) => u.isCurrentHost);
  const followers = users.filter((u) => !u.isCurrentHost);

  const allSortedUsers = [...hosts, ...followers];
  const visibleUsers = allSortedUsers.slice(0, MAX_VISIBLE);
  const hiddenCount =
    allSortedUsers.length > MAX_VISIBLE
      ? allSortedUsers.length - MAX_VISIBLE
      : 0;

  const getStatusText = () => {
    if (isHost) return "You're hosting";
    if (following) return "Following";
    if (Object.keys(sessions).length > 0) return "";
    return "Start session";
  };
  const existingHosts = Object.keys(sessions);
  const hostId = existingHosts[0];
  const info = getOrSetVisualInTags(hostId);
  // if (getStatusText() !== "Start session" || notifications.length > 0)
  return (
    <>
      <div
        style={
          !collapsed
            ? {
                marginTop: "10px",
                // border: `1px solid var(--tabSelection) !important`,
                // borderBottom: 'none',
                // borderRadius: '5px 5px 0 0',
                // background: `color-mix(in srgb, var(--tabSelection) 50%, transparent) !important`,
                // zIndex: 1000,
                // position: 'relative',
                // "border-bottom": 0,
                // "opacity": activeTab !== masks['sharedTab'] ? '0.4' : null
              }
            : {
                display: "none",
              }
        }
        className="userPresence-container"
      >
        <div
          onClick={!hasInteracted ? handleBarClick : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#ffffff3d",
            borderRadius:
              getStatusText() !== "Start session" ? "5px 5px 0 0" : 5,
            padding: "4px 8px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
            // marginTop: 10,
            justifyContent: "space-between",
            cursor: !hasInteracted ? "pointer" : "default",
            transition: "all 0.2s ease",
            height: "38px",
          }}
          className="start-session-bar"
        >
          <style>
            {getStatusText() !== "Start session" &&
              `
          .userPresence-container{
              border: 1px solid ${info.color} !important;
              border-radius: 5px 5px 0 0;
              background: color-mix(in srgb, ${info.color} 50%, transparent) !important;
              z-index: 1000;
              position: relative;
              border-bottom: 0;
              /* opacity: 0.4;  Uncomment and adjust if needed */
            }
            .sharedTab{
              border: 1px solid ${info.color} !important;
              background: color-mix(in srgb, ${info.color} 50%, transparent) !important;

            }
          `}
          </style>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!hasInteracted && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text1)",
                  fontWeight: 600,
                  marginLeft: 4,
                }}
              >
                {getStatusText()}
              </span>
            )}

            {getStatusText() !== "Start session" &&
              visibleUsers.map(({ remoteId, iconIndex, colorIndex }, index) => {
                const Icon = icons[iconIndex];
                const ringColor = colors[colorIndex];
                const canActOn =
                  isHost && sessions[selfId]?.followers?.includes(remoteId);
                const isRemoteAHost = !!sessions[remoteId];
                const menuItems = [];

                if (isRemoteAHost && !following && hasInteracted && !isHost) {
                  menuItems.push({
                    icon: <MenuIcon name="person_add" />,
                    title: "Follow",
                    onClick: async () => followHost(remoteId),
                  });
                }
                if (canActOn) {
                  menuItems.push({
                    icon: <MenuIcon name="supervisor_account" />,
                    title: "Make Co-Host",
                    onClick: () => makeCoHost(selfId, remoteId),
                  });
                  menuItems.push({
                    icon: <MenuIcon name="swap_horiz" />,
                    title: "Swap Host",
                    onClick: () => swapHost(selfId, remoteId),
                  });
                }

                return (
                  <div
                    key={remoteId}
                    style={{ display: "flex", alignItems: "center" }}
                    className="user-presence-item"
                  >
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!menuItems.length) return;
                        const OPTIONS = { type: "normal", items: menuItems };
                        openPopupSettings(OPTIONS);
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        border: `2px solid ${ringColor}`,
                        padding: masks[`${remoteId}-photo`] ? 0 : 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        cursor: menuItems.length ? "pointer" : "default",
                        opacity: menuItems.length ? 1 : 0.6,
                      }}
                    >
                      {masks[`${remoteId}-photo`] ? (
                        <img src={masks[`${remoteId}-photo`]} />
                      ) : (
                        <Icon width={15} height={15} />
                      )}
                    </div>
                    {Object.values(sessions).some((s) =>
                      s.coHosts?.includes(remoteId)
                    ) && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#666",
                          marginLeft: 4,
                          fontWeight: 600,
                        }}
                      >
                        (Co-Host)
                      </span>
                    )}
                    {index === 0 && visibleUsers.length > 1 && (
                      <div
                        style={{
                          width: 1,
                          height: 24,
                          backgroundColor: "#d1d1d1",
                          marginLeft: 4,
                          marginRight: 4,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            {hiddenCount > 0 && (
              <div
                style={{
                  borderRadius: "50%",
                  backgroundColor: "#B0B0B0",
                  color: "black",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  fontSize: 10,
                  padding: "3px 4px",
                  border: "2px solid #838383",
                }}
              >
                +{hiddenCount}
              </div>
            )}
          </div>

          {hasInteracted && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(showSettings ? false : position);
              }}
            >
              <SettingsIcon />
            </div>
          )}

          {showSettings && hasInteracted && (
            <div
              style={{
                zIndex: 99999,
                position: "absolute",
                left: 220,
                top: 30,
              }}
            >
              {isHost ? (
                <ScriptureNavigationSettings
                  config={sessions[selfId]?.config || defaultConfig()}
                  onChange={updateConfig}
                  onStop={stopSession}
                />
              ) : following ? (
                <FollowerPanel hostId={following} onUnfollow={unfollowHost} />
              ) : null}
            </div>
          )}
        </div>
      </div>
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 100000,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {notifications.map((notif) =>
          notif.type === "invite" ? (
            <InviteNotification
              key={notif.id}
              inviterId={notif.inviterId}
              onAccept={() => {
                AcceptInvite(notif.inviterId);
                setHasInteracted(true);
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                );
              }}
              onDismiss={() =>
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                )
              }
            />
          ) : (
            <SessionNotification
              key={notif.id}
              hostId={notif.hostId}
              onJoin={() => {
                followHost(notif.hostId);
                setHasInteracted(true);

                setActiveTab(tags.onlineTab.id);
                UpdateTab(tags.onlineTab);

                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                );
              }}
              onDismiss={() => {
                setNotifications((prev) =>
                  prev.filter((n) => n.id !== notif.id)
                );
              }}
            />
          )
        )}
      </div>
    </>
  );
}

function FollowerPanel({ hostId, onUnfollow }) {
  const { iconIndex, colorIndex } = getOrSetVisualInTags(hostId);
  const Icon = icons[iconIndex];
  const color = colors[colorIndex];
  return (
    <div
      className="stngs"
      style={{
        background: "#202020",
        color: "#fff",
        padding: 16,
        borderRadius: 10,
        width: 260,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {masks[`${hostId}-photo`] ? (
            <img src={masks[`${hostId}-photo`]} />
          ) : (
            <Icon fill="white" width={14} height={14} />
          )}
        </div>
        <div>
          <p style={{ color: "#999", fontSize: 12, marginTop: 4 }}>
            Settings sync automatically
          </p>
        </div>
      </div>
      <button
        onClick={onUnfollow}
        style={{
          background: "#FF4D4F",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 12px",
          cursor: "pointer",
          width: "100%",
          fontSize: 13,
        }}
      >
        Leave Session
      </button>
    </div>
  );
}

function ScriptureNavigationSettings({ config, onChange, onStop }) {
  const [state, setState] = useState(config);

  const toggle = (key) => {
    const newState = { ...state, [key]: !state[key] };
    setState(newState);
    onChange(newState);
  };

  const setHighlightDuration = (val) => {
    const newState = { ...state, highlightDuration: val };
    setState(newState);
    onChange(newState);
  };

  return (
    <div
      className="stngs"
      style={{
        backgroundColor: "#202020",
        color: "#fff",
        width: "290px",
        height: "fit-content",
        padding: "16px",
        overflowY: "auto",
        borderRadius: "10px",
      }}
    >
      <h1 style={{ fontSize: 14, marginBottom: 16 }}>Scripture Navigation</h1>

      <SettingRow
        label={state.onlyHostNav ? "Only Host" : "Everyone"}
        isOn={state.onlyHostNav}
        onToggle={() => toggle("onlyHostNav")}
      />

      <SettingRow
        label={state.sharedTab ? "Shared Tab Only" : "All Tabs"}
        isOn={state.sharedTab}
        onToggle={() => toggle("sharedTab")}
      />

      <SettingRow
        label={state.autoScroll ? "Auto Scroll On" : "Auto Scroll Off"}
        isOn={state.autoScroll}
        onToggle={() => toggle("autoScroll")}
      />

      <hr style={{ borderColor: "#333", margin: "12px 0" }} />

      <SettingRow
        label={!state.onlyHostHighlight ? "Everyone" : "Only Host Highlight"}
        isOn={state.onlyHostHighlight}
        onToggle={() => toggle("onlyHostHighlight")}
      />

      <div style={{ marginTop: 10 }}>
        <span style={{ fontSize: 13, fontWeight: "600" }}>Highlight For</span>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 6 }}>
          {[4, 8, 16, 20].map((d) => (
            <button
              key={d}
              onClick={() => setHighlightDuration(d)}
              style={{
                background:
                  state.highlightDuration === d ? "#333" : "transparent",
                color: "#fff",
                border: "none",
                padding: "6px 12px",
                fontSize: 12,
                borderRadius: 6,
                cursor: "pointer",
                marginRight: 8,
              }}
            >
              {d === 4 ? (
                <span className="material-symbols-outlined">all_inclusive</span>
              ) : (
                `${d} sec`
              )}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStop}
        style={{
          marginTop: 16,
          background: "#FF4D4F",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "8px 12px",
          cursor: "pointer",
          width: "100%",
        }}
      >
        End Session
      </button>
    </div>
  );
}

function SettingRow({ label, isOn, onToggle }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}
    >
      <span style={{ fontSize: 13 }}>{label}</span>
      <div
        style={{
          width: 42,
          height: 24,
          backgroundColor: isOn ? "#FF6B35" : "#444",
          borderRadius: 12,
          position: "relative",
          cursor: "pointer",
        }}
        onClick={onToggle}
      >
        <div
          style={{
            width: 20,
            height: 20,
            backgroundColor: "#fff",
            borderRadius: "50%",
            position: "absolute",
            top: 2,
            left: isOn ? 20 : 2,
            transition: "left 0.3s",
          }}
        />
      </div>
    </div>
  );
}

function InviteNotification({ inviterId, onAccept, onDismiss }) {
  const { iconIndex, colorIndex } = getOrSetVisualInTags(inviterId);
  const Icon = icons[iconIndex];
  const color = colors[colorIndex];
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#111",
        color: "#fff",
        padding: 16,
        borderRadius: 12,
        width: 320,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        animation: "slideIn 0.3s ease-out",
        position: "relative",
      }}
    >
      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        ×
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `3px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {masks[`${inviterId}-photo`] ? (
            <img
              style={{ borderRadius: "50%" }}
              src={masks[`${inviterId}-photo`]}
            />
          ) : (
            <Icon fill="white" width={20} height={20} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            A user wants to follow you
          </p>
          <p style={{ fontSize: 12, color: "#999" }}>
            <span style={{ color }}>{inviterId}</span> invited you to a session
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onAccept}
          style={{
            flex: 1,
            background: color,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.02)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Accept
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#999",
          }}
        >
          {timeLeft}
        </div>
      </div>
    </div>
  );
}

function SessionNotification({ hostId, onJoin, onDismiss }) {
  const { iconIndex, colorIndex } = getOrSetVisualInTags(hostId);
  const Icon = icons[iconIndex];
  const color = colors[colorIndex];
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "#000",
        color: "#fff",
        padding: 16,
        borderRadius: 12,
        width: 320,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        animation: "slideIn 0.3s ease-out",
        position: "relative",
      }}
    >
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: "bold",
        }}
      >
        ×
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `3px solid ${color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {masks[`${hostId}-photo`] ? (
            <img
              style={{ borderRadius: "50%" }}
              src={masks[`${hostId}-photo`]}
            />
          ) : (
            <Icon fill="white" width={20} height={20} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
            Session Started
          </p>
          <p style={{ fontSize: 12, color: "#999" }}>
            <span style={{ color }}>{hostId}</span> started a navigation session
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        <button
          onClick={onJoin}
          style={{
            flex: 1,
            background: color,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.02)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
          class="join-session-button"
        >
          Join Session
        </button>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "2px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
            color: "#999",
          }}
        >
          {timeLeft}
        </div>
      </div>
    </div>
  );
}
