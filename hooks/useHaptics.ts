import * as Haptics from "expo-haptics";
import { useApp } from "../features/auth/AppProvider";
import { useCallback } from "react";
export function useHaptics() {
  const enabled = useApp().profile?.haptics !== false;
  return useCallback(
    (kind: "water" | "touch" | "shared" | "tap") => {
      if (!enabled) return;
      const action =
        kind === "water"
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          : kind === "shared"
            ? Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              )
            : Haptics.selectionAsync();
      void action.catch(() => undefined);
    },
    [enabled],
  );
}
