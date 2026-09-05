import { useEffect, useRef, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { randomUUID } from "expo-crypto";
import {
  Button,
  Copy,
  ErrorMessage,
  Screen,
  styles,
} from "../../components/ui";
import { Plant } from "../../components/Plant";
import { useApp } from "../auth/AppProvider";
import { usePresence } from "../presence/usePresence";
import { useTask } from "../../hooks/useTask";
import { useHaptics } from "../../hooks/useHaptics";
import { supabase } from "../../lib/supabase";
import { APP_NAME, GROWTH_CONFIG } from "../../constants/product";
import { theme } from "../../constants/theme";
import { cooldownRemaining, daysTogether } from "./rules";
import { NoteSheet } from "../notes/NoteSheet";
export default function HomeScreen() {
  const app = useApp();
  const task = useTask();
  const presence = usePresence();
  const haptic = useHaptics();
  const [noteOpen, setNoteOpen] = useState(false);
  const [pulse, setPulse] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const pending = useRef<{ kind: "water" | "touch"; id: string } | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const space = app.space;
  if (!space) return null;
  const partner = space.members.find((m) => m.user_id !== app.session?.user.id);
  const note = space.notes.find((n) => n.author_id !== app.session?.user.id);
  const remaining = cooldownRemaining(
    space.lastWater,
    now,
    GROWTH_CONFIG.waterCooldownMs,
  );
  async function act(kind: "water" | "touch") {
    if (!space) return;
    await task.run(async () => {
      // Keep the request id after an ambiguous network failure, so retry cannot award twice.
      if (!pending.current || pending.current.kind !== kind)
        pending.current = { kind, id: randomUUID() };
      const request = pending.current;
      const { data, error } = await supabase.rpc("perform_action", {
        target_plant: space.plant.id,
        kind,
        request_id: request.id,
      });
      if (error) throw error;
      pending.current = null;
      haptic(data?.shared ? "shared" : kind);
      setPulse(request.id);
      await app.refresh();
    });
  }
  const presenceText = !partner
    ? "Ваше место ждёт второго человека"
    : !presence.connected
      ? "Проверяем, кто рядом…"
      : presence.here
        ? `${partner.display_name} здесь`
        : partner.last_seen_at
          ? `${partner.display_name} был(а) здесь ${new Date(partner.last_seen_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
          : `${partner.display_name} пока не в приложении`;
  return (
    <Screen>
      <View style={styles.row}>
        <Text style={styles.label}>НАШ МАЛЕНЬКИЙ САД</Text>
        <Text style={styles.label}>
          День {daysTogether(space.couple.created_at)}
        </Text>
      </View>
      {(!app.online || app.error) && (
        <View>
          <ErrorMessage
            message={
              !app.online
                ? "Нет связи. Растение подождёт. Действия доступны после подключения."
                : app.error
            }
          />
          <Button
            title="Обновить"
            secondary
            onPress={() => void app.refresh()}
          />
        </View>
      )}
      <View style={local.garden}>
        <Plant
          stage={space.plant.stage}
          pulse={presence.reaction.id || pulse}
          shared={presence.reaction.shared}
        />
        <Text style={local.plantName}>{space.plant.name}</Text>
        <Text style={local.presence}>
          {presence.here ? "●  " : "○  "}
          {presenceText}
        </Text>
        <Text accessibilityLiveRegion="polite" style={local.moment}>
          {presence.reaction.text || "Растём в своём ритме."}
        </Text>
      </View>
      {note && (
        <View style={local.note}>
          <Text style={styles.label}>
            ОТ {partner?.display_name.toUpperCase() ?? "ПАРТНЁРА"}
          </Text>
          <Text style={local.noteText}>{note.text}</Text>
        </View>
      )}
      {space.couple.invite_code && (
        <View style={local.invite}>
          <Copy>Пригласите партнёра</Copy>
          <Text selectable style={local.code}>
            {space.couple.invite_code}
          </Text>
          <Button
            title="Поделиться кодом"
            secondary
            onPress={() =>
              void task.run(async () => {
                await Share.share({
                  message: `Давай вырастим что-то вместе. Наш код в ${APP_NAME}: ${space.couple.invite_code}`,
                });
              })
            }
          />
        </View>
      )}
      <ErrorMessage message={task.error} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title={
              remaining > 0
                ? `Полив через ${Math.ceil(remaining / 3_600_000)} ч`
                : "Полить"
            }
            disabled={task.busy || !app.online || remaining > 0}
            onPress={() => void act("water")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Коснуться"
            secondary
            disabled={task.busy || !app.online}
            onPress={() => void act("touch")}
          />
        </View>
      </View>
      <Button
        title="Оставить записку"
        secondary
        disabled={!app.online || !partner}
        onPress={() => {
          haptic("tap");
          setNoteOpen(true);
        }}
      />
      <View style={styles.row}>
        <Button
          title="Моменты"
          secondary
          onPress={() => router.push("/memories")}
        />
        <Button title="Мы" secondary onPress={() => router.push("/us")} />
      </View>
      <NoteSheet visible={noteOpen} close={() => setNoteOpen(false)} />
    </Screen>
  );
}
const local = StyleSheet.create({
  garden: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  plantName: {
    fontSize: 25,
    fontWeight: "500",
    letterSpacing: -0.5,
    color: theme.text,
    textAlign: "center",
  },
  presence: {
    color: theme.accent,
    fontSize: 14,
    marginTop: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  moment: {
    color: theme.muted,
    fontSize: 13,
    textAlign: "center",
    minHeight: 36,
    marginTop: 14,
  },
  note: {
    paddingLeft: 18,
    borderLeftWidth: 2,
    borderColor: theme.border,
    gap: 8,
  },
  noteText: { fontSize: 19, lineHeight: 28, color: theme.text },
  invite: { gap: 12 },
  code: { fontSize: 26, letterSpacing: 5, color: theme.accent },
});
