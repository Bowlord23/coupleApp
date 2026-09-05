import { useState } from "react";
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  Screen,
  Title,
  styles,
} from "../../components/ui";
import { Alert, View } from "react-native";
import { useApp } from "../auth/AppProvider";
import { supabase } from "../../lib/supabase";
import { useTask } from "../../hooks/useTask";
import { isValidInvite, normalizeInvite } from "../plant/rules";
export default function CoupleScreen() {
  const app = useApp();
  const task = useTask();
  const [name, setName] = useState(
    app.profile?.display_name === "Партнёр"
      ? ""
      : (app.profile?.display_name ?? ""),
  );
  const [code, setCode] = useState("");
  async function connect(join: boolean) {
    await task.run(async () => {
      const profile = await supabase.rpc("update_profile", {
        new_name: name.trim(),
        enable_haptics: true,
      });
      if (profile.error) throw profile.error;
      const result = join
        ? await supabase.rpc("join_couple", { code: normalizeInvite(code) })
        : await supabase.rpc("create_couple", {});
      if (result.error) throw result.error;
      if (!result.data) throw new Error("INVALID_INVITE");
      await app.refresh();
    });
  }
  return (
    <Screen>
      <Title>Место для двоих</Title>
      <Copy>
        Создайте пространство и пригласите любимого человека. Или присоединитесь
        по его коду.
      </Copy>
      <Field
        label="Как вас называть?"
        value={name}
        onChangeText={setName}
        maxLength={40}
      />
      <ErrorMessage message={task.error ?? app.error} />
      <Button
        title="Создать наше пространство"
        disabled={task.busy || !name.trim() || !app.online}
        onPress={() => void connect(false)}
      />
      <View style={styles.divider} />
      <Field
        label="Код приглашения"
        value={code}
        onChangeText={setCode}
        maxLength={8}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button
        title="Присоединиться к партнёру"
        secondary
        disabled={
          task.busy || !name.trim() || !isValidInvite(code) || !app.online
        }
        onPress={() => void connect(true)}
      />
      <Button
        title="Выйти из аккаунта"
        secondary
        disabled={task.busy}
        onPress={() => void task.run(app.signOut)}
      />
      <Button
        title="Удалить аккаунт"
        secondary
        disabled={task.busy || !app.online}
        onPress={() =>
          Alert.alert(
            "Удалить аккаунт?",
            "Ваш аккаунт будет удалён без возможности восстановления.",
            [
              { text: "Отмена", style: "cancel" },
              {
                text: "Удалить",
                style: "destructive",
                onPress: () =>
                  void task.run(async () => {
                    const { error } = await supabase.rpc(
                      "delete_own_account",
                      {},
                    );
                    if (error) throw error;
                    await app.signOut();
                  }),
              },
            ],
          )
        }
      />
    </Screen>
  );
}
