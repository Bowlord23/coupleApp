import { Redirect, router } from "expo-router";
import { Text, View } from "react-native";
import { useApp } from "../features/auth/AppProvider";
import {
  Button,
  Copy,
  ErrorMessage,
  Screen,
  Title,
  styles,
} from "../components/ui";
import { theme } from "../constants/theme";
const labels: Record<string, string> = {
  planted: "Вы посадили своё семечко",
  connected: "Теперь здесь двое",
  shared: "Вы коснулись растения вместе",
  stage: "Ваше растение выросло",
};
export default function Memories() {
  const app = useApp();
  if (!app.space) return <Redirect href="/" />;
  return (
    <Screen>
      <Button
        title="К растению"
        secondary
        onPress={() => router.replace("/")}
      />
      <Title>Наши моменты</Title>
      <Copy>Маленькие события. Ваша общая история.</Copy>
      <ErrorMessage message={app.error} />
      {app.space.memories.length === 0 && (
        <Copy>Первый момент появится здесь совсем скоро.</Copy>
      )}
      {app.space.memories.map((memory) => (
        <View
          key={memory.id}
          style={{
            gap: 8,
            paddingVertical: 16,
            borderBottomColor: theme.border,
            borderBottomWidth: 1,
          }}
        >
          <Text style={styles.label}>
            {new Date(memory.created_at).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
          <Text style={{ color: theme.text, fontSize: 19 }}>
            {labels[memory.type] ?? "Момент вместе"}
          </Text>
        </View>
      ))}
      {app.space.memories.length === 100 && (
        <Copy>Показаны последние 100 моментов.</Copy>
      )}
    </Screen>
  );
}
