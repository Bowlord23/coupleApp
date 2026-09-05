import { useState } from "react";
import { Modal } from "react-native";
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
  close,
}: {
  visible: boolean;
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
        <Copy>Одна записка у вашего растения. Новая заменит предыдущую.</Copy>
        <Field
          label="Для любимого человека"
          value={text}
          onChangeText={setText}
          maxLength={NOTE_MAX_LENGTH}
          multiline
          style={{ minHeight: 140, textAlignVertical: "top" }}
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
