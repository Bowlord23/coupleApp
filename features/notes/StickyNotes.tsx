import { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Button, Copy, Screen, Title } from "../../components/ui";
import { theme } from "../../constants/theme";
import type { Member, Note } from "../../types/database";
import { stickyColorFor } from "./colors";

const placements = [
  { top: 8, left: 0, transform: [{ rotate: "-5deg" }] },
  { top: 38, right: 0, transform: [{ rotate: "4deg" }] },
  { top: 174, left: 0, transform: [{ rotate: "3deg" }] },
  { top: 205, right: 0, transform: [{ rotate: "-4deg" }] },
] as const;

function Sticky({
  note,
  color,
  mine,
  style,
  onPress,
  large = false,
}: {
  note: Note;
  color: string;
  mine: boolean;
  style?: object;
  onPress?: () => void;
  large?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${mine ? "Ваша записка" : "Записка партнёра"}: ${note.text}`}
      onPress={onPress}
      style={[sticky.note, { backgroundColor: color }, large && sticky.large, style]}
    >
      <View style={sticky.tape} />
      <Text numberOfLines={large ? undefined : 4} style={sticky.text}>
        {note.text}
      </Text>
      <View style={[sticky.fold, { borderBottomColor: theme.background }]} />
    </Pressable>
  );
}

export function StickyNotes({
  notes,
  members,
  userId,
}: {
  notes: Note[];
  members: Member[];
  userId: string;
}) {
  const [open, setOpen] = useState(false);
  const recent = notes.slice(0, placements.length);
  if (!notes.length) return null;

  return (
    <>
      <View pointerEvents="box-none" style={sticky.aroundPlant}>
        {recent.map((note, index) => (
          <Sticky
            key={note.id}
            note={note}
            mine={note.author_id === userId}
            color={stickyColorFor(note.author_id, members)}
            style={placements[index]}
            onPress={() => setOpen(true)}
          />
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть все записки, ${notes.length}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [sticky.archiveButton, pressed && { opacity: 0.6 }]}
      >
        <Text style={sticky.archiveText}>Все записки · {notes.length}</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <Screen>
          <Title>Наши записки</Title>
          <Copy>Ваши слова остаются здесь и складываются в общую историю.</Copy>
          <View style={sticky.gallery}>
            {notes.map((note) => (
              <View key={note.id} style={sticky.galleryItem}>
                <Sticky
                  note={note}
                  mine={note.author_id === userId}
                  color={stickyColorFor(note.author_id, members)}
                  large
                />
                <Text style={sticky.date}>
                  {new Date(note.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            ))}
          </View>
          <Button title="Закрыть" secondary onPress={() => setOpen(false)} />
        </Screen>
      </Modal>
    </>
  );
}

const sticky = StyleSheet.create({
  aroundPlant: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  archiveButton: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    zIndex: 3,
    borderRadius: 18,
    backgroundColor: theme.pale,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  archiveText: { color: theme.accent, fontSize: 13, fontWeight: "600" },
  note: {
    position: "absolute",
    width: 98,
    minHeight: 82,
    paddingHorizontal: 11,
    paddingTop: 17,
    paddingBottom: 11,
    shadowColor: "#273129",
    shadowOpacity: 0.17,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  large: {
    position: "relative",
    width: "100%",
    minHeight: 132,
    paddingHorizontal: 14,
    paddingTop: 23,
  },
  tape: {
    position: "absolute",
    top: -5,
    alignSelf: "center",
    width: 40,
    height: 13,
    backgroundColor: "rgba(255,255,255,0.55)",
    transform: [{ rotate: "-2deg" }],
  },
  text: {
    color: "#3E413A",
    fontSize: 13,
    lineHeight: 17,
  },
  fold: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 13,
    borderBottomWidth: 13,
    borderLeftColor: "rgba(255,255,255,0.35)",
  },
  gallery: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
  galleryItem: {
    width: "47%",
    gap: 7,
  },
  date: {
    color: theme.muted,
    fontSize: 12,
    textAlign: "right",
  },
});
