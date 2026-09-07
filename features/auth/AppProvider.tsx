import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "../../lib/supabase";
import { friendlyError } from "../../lib/errors";
import { loadSpace } from "../../services/space";
import { REFRESH_INTERVAL_MS } from "../../constants/product";
import type { Profile, Space } from "../../types/database";
import {
  disablePush,
  registerPushToken,
  type PushStatus,
} from "../../services/notifications";

type State = {
  session: Session | null;
  profile: Profile | null;
  space: Space | null;
  booting: boolean;
  ready: boolean;
  online: boolean;
  error: string | null;
  pushStatus: PushStatus | "retrying";
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const Context = createContext<State | null>(null);
export function AppProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [space, setSpace] = useState<Space | null>(null);
  const [booting, setBooting] = useState(isConfigured);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | "retrying">("retrying");
  const generation = useRef(0);
  const alive = useRef(true);
  const userId = session?.user.id;
  const refresh = useCallback(async () => {
    if (!userId) return;
    const ticket = ++generation.current;
    try {
      const [p, next] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        loadSpace(userId),
      ]);
      if (p.error) throw p.error;
      if (!alive.current || ticket !== generation.current) return;
      setProfile(p.data);
      setSpace(next);
      setReady(true);
      setError(null);
    } catch (e) {
      if (alive.current && ticket === generation.current)
        setError(friendlyError(e));
    }
  }, [userId]);
  const syncPush = useCallback(async () => {
    if (!userId) return;
    try {
      const status = await registerPushToken(userId);
      if (alive.current) setPushStatus(status);
    } catch {
      if (alive.current) setPushStatus("retrying");
    }
  }, [userId]);
  useEffect(() => {
    if (!isConfigured) return;
    alive.current = true;
    let mounted = true;
    let eventReceived = false;
    let currentUser: string | undefined;
    const acceptSession = (next: Session | null) => {
      if (!mounted) return;
      if (currentUser !== next?.user.id) {
        generation.current++;
        setSpace(null);
        setProfile(null);
        setReady(false);
        setPushStatus("retrying");
      }
      currentUser = next?.user.id;
      setSession(next);
      setBooting(false);
    };
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      eventReceived = true;
      acceptSession(next);
    });
    void supabase.auth
      .getSession()
      .then(({ data: value, error: e }) => {
        if (!mounted) return;
        if (e) setError(friendlyError(e));
        else if (!eventReceived) acceptSession(value.session);
        setBooting(false);
      })
      .catch((e) => {
        if (mounted) {
          setError(friendlyError(e));
          setBooting(false);
        }
      });
    return () => {
      mounted = false;
      alive.current = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  useEffect(() => {
    void Promise.resolve().then(syncPush);
  }, [syncPush]);
  useEffect(() => {
    const stop = NetInfo.addEventListener((state) => {
      const connected =
        state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(connected);
      if (connected) void refresh();
    });
    if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        supabase.auth.startAutoRefresh();
        void refresh();
        void syncPush();
      } else supabase.auth.stopAutoRefresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, REFRESH_INTERVAL_MS);
    const pushTimer = setInterval(() => {
      if (AppState.currentState === "active") void syncPush();
    }, 5 * 60_000);
    return () => {
      stop();
      listener.remove();
      clearInterval(timer);
      clearInterval(pushTimer);
      supabase.auth.stopAutoRefresh();
    };
  }, [refresh, syncPush]);
  const signOutUserId = session?.user.id;
  const signOut = useCallback(async () => {
    if (signOutUserId)
      await disablePush(signOutUserId).catch(() => undefined);
    const { error: e } = await supabase.auth.signOut({ scope: "local" });
    if (e) throw e;
    generation.current++;
    setSession(null);
    setSpace(null);
    setProfile(null);
    setReady(false);
    setError(null);
    setPushStatus("retrying");
  }, [signOutUserId]);
  return (
    <Context.Provider
      value={{
        session,
        profile,
        space,
        booting,
        ready,
        online,
        error,
        pushStatus,
        refresh,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing AppProvider");
  return value;
}
