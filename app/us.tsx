import { useState } from "react";
import { Alert, Switch, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useApp } from "../features/auth/AppProvider";
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  Screen,
  Title,
  styles,
} from "../components/ui";
import { useTask } from "../hooks/useTask";
import { supabase } from "../lib/supabase";
import { daysTogether } from "../features/plant/rules";
import { theme } from "../constants/theme";
export default function Us() {
  const app = useApp();
  const task = useTask();
  const [name, setName] = useState(app.profile?.display_name ?? "");
  const [plantName, setPlantName] = useState(app.space?.plant.name ?? "");
  const [haptics, setHaptics] = useState(app.profile?.haptics ?? true);
  if (!app.space) return <Redirect href="/" />;
  function confirm(kind: "leave" | "delete") {
    Alert.alert(
      kind === "leave" ? "Покинуть пространство?" : "Удалить аккаунт?",
      kind === "leave"
        ? "Вы потеряете доступ к этому растению и истории. Партнёр сохранит пространство. Вернуться по старому коду нельзя."
        : "Ваш аккаунт и личные данные будут удалены. Общее растение и моменты останутся у партнёра. Это действие нельзя отменить.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: kind === "leave" ? "Покинуть" : "Удалить",
          style: "destructive",
          onPress: () =>
            void task.run(async () => {
              const { error } = await supabase.rpc(
                kind === "leave" ? "leave_couple" : "delete_own_account",
                {},
              );
              if (error) throw error;
              if (kind === "delete") await app.signOut();
              else await app.refresh();
              router.replace("/");
            }),
        },
      ],
    );
  }
  return (
    <Screen>
      <Button
        title="К растению"
        secondary
        onPress={() => router.replace("/")}
      />
      <Title>Мы</Title>
      <Copy>
        {app.space.members.map((m) => m.display_name).join(" и ")}
        {"\n"}
        {daysTogether(app.space.couple.created_at)} дней растём вместе{"\n"}С{" "}
        {new Date(app.space.couple.created_at).toLocaleDateString("ru-RU")}
      </Copy>
      <Field
        label="Ваше имя"
        value={name}
        onChangeText={setName}
        maxLength={40}
      />
      <Field
        label="Имя растения"
        value={plantName}
        onChangeText={setPlantName}
        maxLength={40}
      />
      <View style={styles.row}>
        <Copy>Тактильный отклик</Copy>
        <Switch
          accessibilityLabel="Тактильный отклик"
          value={haptics}
          onValueChange={setHaptics}
          trackColor={{ true: theme.accent }}
        />
      </View>
      <ErrorMessage message={task.error} />
      <Button
        title="Сохранить"
        disabled={task.busy || !app.online || !name.trim() || !plantName.trim()}
        onPress={() =>
          void task.run(async () => {
            const p = await supabase.rpc("update_profile", {
              new_name: name,
              enable_haptics: haptics,
            });
            if (p.error) throw p.error;
            const n = await supabase.rpc("rename_plant", {
              new_name: plantName,
            });
            if (n.error) throw n.error;
            await app.refresh();
            router.replace("/");
          })
        }
      />
      <Copy>
        Push-уведомления пока не включены. Когда вы оба в приложении, касания
        приходят в реальном времени.
      </Copy>
      <View style={styles.divider} />
      <Button
        title="Выйти из аккаунта"
        secondary
        disabled={task.busy}
        onPress={() =>
          void task.run(async () => {
            await app.signOut();
            router.replace("/");
          })
        }
      />
      <Button
        title="Разъединить пару"
        secondary
        disabled={task.busy || !app.online}
        onPress={() => confirm("leave")}
      />
      <Button
        title="Удалить аккаунт"
        secondary
        disabled={task.busy || !app.online}
        onPress={() => confirm("delete")}
      />
    </Screen>
  );
}
