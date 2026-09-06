import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type PanResponderInstance,
} from "react-native";
import { Button, Copy, Screen, Title } from "../../components/ui";
import { theme } from "../../constants/theme";
import type { Member, Note } from "../../types/database";
import { stickyColorFor } from "./colors";

const NOTE_WIDTH = 104;
const NOTE_HEIGHT = 88;
const ARCHIVE_WIDTH = 72;
const ARCHIVE_HEIGHT = 66;
const HOLD_MS = 320;
type Size = { width: number; height: number };

function PaperNote({ note, color, mine, large = false }: {
  note: Note; color: string; mine: boolean; large?: boolean;
}) {
  return (
    <View
      accessibilityLabel={`${mine ? "Ваша записка" : "Записка партнёра"}: ${note.text}`}
      style={[paper.note, { backgroundColor: color }, large && paper.large]}
    >
      <View style={paper.tape} />
      <Text numberOfLines={large ? undefined : 4} style={paper.text}>{note.text}</Text>
      <View style={paper.fold} />
    </View>
  );
}

function DraggableNote({ note, members, userId, scene, openArchive, moved, archived, held }: {
  note: Note;
  members: Member[];
  userId: string;
  scene: Size;
  openArchive: () => void;
  moved: (id: string, x: number, y: number) => Promise<boolean>;
  archived: (id: string) => Promise<boolean>;
  held: () => void;
}) {
  const maxX = Math.max(1, scene.width - NOTE_WIDTH);
  const maxY = Math.max(1, scene.height - NOTE_HEIGHT);
  const startX = Math.round(note.position_x * maxX);
  const startY = Math.round(note.position_y * maxY);
  const [offset] = useState(() => new Animated.ValueXY({ x: startX, y: startY }));
  const origin = useRef({ x: startX, y: startY });
  const active = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef = useRef(moved);
  const archivedRef = useRef(archived);
  const heldRef = useRef(held);
  const openArchiveRef = useRef(openArchive);
  const [dragging, setDragging] = useState(false);
  const [responder, setResponder] = useState<PanResponderInstance | null>(null);

  useEffect(() => { movedRef.current = moved; }, [moved]);
  useEffect(() => { archivedRef.current = archived; }, [archived]);
  useEffect(() => { heldRef.current = held; }, [held]);
  useEffect(() => { openArchiveRef.current = openArchive; }, [openArchive]);

  useEffect(() => {
    if (active.current) return;
    origin.current = { x: startX, y: startY };
    offset.setValue(origin.current);
  }, [startX, startY, offset]);

  useEffect(() => {
    const next = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        active.current = false;
        holdTimer.current = setTimeout(() => {
          active.current = true;
          setDragging(true);
          heldRef.current();
        }, HOLD_MS);
      },
      onPanResponderMove: (_event, gesture) => {
        if (!active.current) {
          if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 12 && holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
          return;
        }
        offset.setValue({
          x: Math.max(0, Math.min(maxX, origin.current.x + gesture.dx)),
          y: Math.max(0, Math.min(maxY, origin.current.y + gesture.dy)),
        });
      },
      onPanResponderRelease: async (_event, gesture) => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        if (!active.current) {
          openArchiveRef.current();
          return;
        }
        active.current = false;
        setDragging(false);
        const x = Math.max(0, Math.min(maxX, origin.current.x + gesture.dx));
        const y = Math.max(0, Math.min(maxY, origin.current.y + gesture.dy));
        const inArchive =
          x + NOTE_WIDTH / 2 >= scene.width - ARCHIVE_WIDTH - 6 &&
          y + NOTE_HEIGHT / 2 >= scene.height - ARCHIVE_HEIGHT - 6;
        if (inArchive) {
          const ok = await archivedRef.current(note.id);
          if (!ok) offset.setValue(origin.current);
          return;
        }
        const previous = origin.current;
        origin.current = { x, y };
        offset.setValue(origin.current);
        const ok = await movedRef.current(note.id, x / maxX, y / maxY);
        if (!ok) {
          origin.current = previous;
          offset.setValue(previous);
        }
      },
      onPanResponderTerminate: () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = null;
        active.current = false;
        setDragging(false);
        offset.setValue(origin.current);
      },
    });
    setResponder(next);
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, [maxX, maxY, note.id, offset, scene.height, scene.width]);

  return (
    <Animated.View
      {...responder?.panHandlers}
      style={[board.draggable, { transform: offset.getTranslateTransform() }, dragging && board.dragging]}
    >
      <PaperNote
        note={note}
        mine={note.author_id === userId}
        color={stickyColorFor(note.author_id, members)}
      />
    </Animated.View>
  );
}

export function StickyNotes({ notes, members, userId, moved, archived, held }: {
  notes: Note[];
  members: Member[];
  userId: string;
  moved: (id: string, x: number, y: number) => Promise<boolean>;
  archived: (id: string) => Promise<boolean>;
  held: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [scene, setScene] = useState<Size>({ width: 0, height: 0 });
  const activeNotes = notes.filter((note) => !note.archived_at);
  const archivedCount = notes.length - activeNotes.length;
  const layout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setScene({ width, height });
  };

  return (
    <View pointerEvents="box-none" style={board.fill} onLayout={layout}>
      {scene.width > 0 && activeNotes.map((note) => (
        <DraggableNote
          key={note.id}
          note={note}
          members={members}
          userId={userId}
          scene={scene}
          openArchive={() => setOpen(true)}
          moved={moved}
          archived={archived}
          held={held}
        />
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть архив, ${notes.length} записок`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [board.archive, pressed && { opacity: 0.65 }]}
      >
        <View style={board.lid} />
        <View style={board.box}><Text style={board.boxHeart}>♡</Text></View>
        <Text style={board.archiveLabel}>АРХИВ · {archivedCount}</Text>
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <Screen>
          <Title>Архив записок</Title>
          <Copy>
            Здесь остаются все записки. Зажмите стикер у растения и перенесите его в коробку, чтобы убрать с доски.
          </Copy>
          {!notes.length && <Copy>Пока здесь пусто.</Copy>}
          <View style={board.gallery}>
            {notes.map((note) => (
              <View key={note.id} style={board.galleryItem}>
                <PaperNote
                  note={note}
                  mine={note.author_id === userId}
                  color={stickyColorFor(note.author_id, members)}
                  large
                />
                <Text style={board.date}>
                  {new Date(note.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  {note.archived_at ? " · в архиве" : " · у растения"}
                </Text>
              </View>
            ))}
          </View>
          <Button title="Закрыть" secondary onPress={() => setOpen(false)} />
        </Screen>
      </Modal>
    </View>
  );
}

const paper = StyleSheet.create({
  note: {
    width: NOTE_WIDTH, height: NOTE_HEIGHT, paddingHorizontal: 11, paddingTop: 17,
    paddingBottom: 10, shadowColor: "#273129", shadowOpacity: 0.18, shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  large: { width: "100%", height: "auto", minHeight: 132, paddingTop: 23 },
  tape: {
    position: "absolute", top: -5, alignSelf: "center", width: 40, height: 13,
    backgroundColor: "rgba(255,255,255,0.55)", transform: [{ rotate: "-2deg" }],
  },
  text: { color: "#3E413A", fontSize: 13, lineHeight: 17 },
  fold: {
    position: "absolute", right: 0, bottom: 0, width: 13, height: 13,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
});

const board = StyleSheet.create({
  fill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 2 },
  draggable: { position: "absolute", left: 0, top: 0, zIndex: 2 },
  dragging: { zIndex: 20, opacity: 0.9 },
  archive: {
    position: "absolute", right: 4, bottom: 0, width: ARCHIVE_WIDTH, height: ARCHIVE_HEIGHT,
    alignItems: "center", justifyContent: "flex-end", zIndex: 1,
  },
  lid: {
    width: 58, height: 8, borderWidth: 2, borderColor: theme.soil, borderRadius: 2,
    transform: [{ rotate: "-6deg" }],
  },
  box: {
    width: 54, height: 38, borderWidth: 2, borderTopWidth: 1, borderColor: theme.soil,
    backgroundColor: "#E6D3B7", alignItems: "center", justifyContent: "center",
  },
  boxHeart: { color: theme.error, fontSize: 20 },
  archiveLabel: { color: theme.muted, fontSize: 9, marginTop: 2, letterSpacing: 0.4 },
  gallery: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 14 },
  galleryItem: { width: "47%", gap: 7 },
  date: { color: theme.muted, fontSize: 12, textAlign: "right" },
});
