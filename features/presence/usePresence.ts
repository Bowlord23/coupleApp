import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { usePathname } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useApp } from "../auth/AppProvider";
import { useHaptics } from "../../hooks/useHaptics";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { enqueueChannelOperation } from "../../services/channelLifecycle";

export function usePresence() {
  const { session, space, refresh, online } = useApp();
  const [here, setHere] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reaction, setReaction] = useState({ id: "", shared: false, text: "" });
  const [active, setActive] = useState(AppState.currentState === "active");
  const path = usePathname();
  const haptic = useHaptics();
  const cid = space?.couple.id;
  const version = space?.couple.channel_version;
  const uid = session?.user.id;
  const token = session?.access_token;
  const partner = space?.members.find((member) => member.user_id !== uid);
  const partnerId = partner?.user_id;
  const partnerName = partner?.display_name ?? "Партнёр";
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (s) =>
      setActive(s === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!cid || !version || !uid || !active || !online || path !== "/") return;
    let disposed = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let currentChannel: RealtimeChannel | undefined;
    void enqueueChannelOperation(async () => {
      if (disposed) return;
      const channel = supabase.channel(`couple:${cid}:${version}`, {
        config: { private: true, presence: { key: uid } },
      });
      currentChannel = channel;
      channel
        .on("presence", { event: "sync" }, () => {
          if (!disposed)
            setHere(
              Boolean(partnerId && channel.presenceState()[partnerId]?.length),
            );
        })
        .on("broadcast", { event: "interaction" }, ({ payload }) => {
          if (
            disposed ||
            !payload ||
            typeof payload.id !== "string" ||
            typeof payload.at !== "string"
          )
            return;
          if (Date.now() - Date.parse(payload.at) > 15_000) return;
          void refresh();
          if (payload.user_id === uid && !payload.shared) return;
          const shared = payload.shared === true;
          haptic(shared ? "shared" : "touch");
          setReaction({
            id: payload.id,
            shared,
            text: shared
              ? "Вы здесь. Вместе."
              : `${partnerName} ${payload.kind === "water" ? "поливает" : "касается"} растения`,
          });
          clearTimeout(expiry);
          expiry = setTimeout(
            () => setReaction({ id: "", shared: false, text: "" }),
            6000,
          );
        })
        .on("broadcast", { event: "attention" }, ({ payload }) => {
          if (
            disposed ||
            !payload ||
            payload.user_id === uid ||
            typeof payload.id !== "string" ||
            typeof payload.at !== "string" ||
            Date.now() - Date.parse(payload.at) > 15_000
          )
            return;
          haptic("shared");
          setReaction({
            id: payload.id,
            shared: true,
            text: `${partnerName} отправил(а) вам сердечко 💛`,
          });
          clearTimeout(expiry);
          expiry = setTimeout(
            () => setReaction({ id: "", shared: false, text: "" }),
            6000,
          );
        });
      for (const table of [
        "plants",
        "couples",
        "couple_members",
        "notes",
        "memories",
      ]) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `${table === "couples" ? "id" : "couple_id"}=eq.${cid}`,
          },
          () => {
            void refresh();
          },
        );
      }
      await supabase.realtime
        .setAuth(token)
        .then(() => {
          if (disposed) return;
          channel.subscribe((status) => {
            if (disposed) return;
            setConnected(status === "SUBSCRIBED");
            if (status === "SUBSCRIBED") {
              void channel
                .track({ online_at: new Date().toISOString() })
                .catch(() => undefined);
              void supabase.rpc("mark_seen", {}).then(() => undefined);
              void refresh();
            } else setHere(false);
          });
        })
        .catch(() => {
          if (!disposed) setConnected(false);
        });
    }).catch(() => {
      if (!disposed) setConnected(false);
    });
    const heartbeat = setInterval(() => {
      void supabase.rpc("mark_seen", {}).then(() => undefined);
    }, 60_000);
    return () => {
      disposed = true;
      setHere(false);
      setConnected(false);
      setReaction({ id: "", shared: false, text: "" });
      clearInterval(heartbeat);
      clearTimeout(expiry);
      void enqueueChannelOperation(async () => {
        if (currentChannel) await supabase.removeChannel(currentChannel);
      }).catch(() => undefined);
    };
  }, [
    cid,
    version,
    uid,
    token,
    active,
    online,
    path,
    partnerId,
    partnerName,
    refresh,
    haptic,
  ]);
  const enabled = active && online && path === "/";
  return { here: enabled && here, connected: enabled && connected, reaction };
}
