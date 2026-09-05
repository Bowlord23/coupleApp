import { useState } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  Screen,
  Title,
} from "../../components/ui";
import { useTask } from "../../hooks/useTask";
import { NOTE_MAX_LENGTH } from "../../constants/product";
import { supabase } from "../../lib/supabase";
import { useApp } from "../auth/AppProvider";
export function NoteSheet({
  visible,
  color,
  close,
}: {
  visible: boolean;
  color: string;
  close: () => void;
}) {
  const [text, setText] = useState("");
  const task = useTask();
  const app = useApp();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <Screen>
        <Title>Несколько тёплых слов</Title>
        <Copy>Каждая новая записка станет отдельным бумажным стикером у растения.</Copy>
        <View style={local.colorRow}>
          <View style={[local.swatch, { backgroundColor: color }]} />
          <Text style={local.colorText}>Это ваш постоянный цвет записок</Text>
        </View>
        <Field
          label="Для любимого человека"
          value={text}
          onChangeText={setText}
          maxLength={NOTE_MAX_LENGTH}
          multiline
          style={{ minHeight: 140, textAlignVertical: "top", backgroundColor: color }}
        />
        <Copy>
          {text.length} / {NOTE_MAX_LENGTH}
        </Copy>
        <ErrorMessage message={task.error} />
        <Button
          title={task.busy ? "Сохраняем…" : "Оставить записку"}
          disabled={task.busy || !text.trim() || !app.online}
          onPress={() =>
            void task.run(async () => {
              const { error } = await supabase.rpc("save_note", { body: text });
              if (error) throw error;
              await app.refresh();
              setText("");
              close();
            })
          }
        />
        <Button
          title="Закрыть"
          secondary
          disabled={task.busy}
          onPress={close}
        />
      </Screen>
    </Modal>
  );
}

const local = StyleSheet.create({
  colorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  swatch: { width: 24, height: 24, borderRadius: 4 },
  colorText: { color: "#657168", fontSize: 14 },
});
