import { useApp } from "../features/auth/AppProvider";
import { isConfigured } from "../lib/supabase";
import {
  Button,
  Copy,
  ErrorMessage,
  Loading,
  Screen,
  Title,
} from "../components/ui";
import AuthScreen from "../features/auth/AuthScreen";
import CoupleScreen from "../features/couple/CoupleScreen";
import HomeScreen from "../features/plant/HomeScreen";
import { useTask } from "../hooks/useTask";
export default function Index() {
  const app = useApp();
  const task = useTask();
  if (!isConfigured)
    return (
      <Screen>
        <Title>Немного подготовки</Title>
        <Copy>
          Приложение готово к подключению Supabase. Добавьте URL и публичный
          ключ проекта в .env и перезапустите Expo. Подробные шаги — в README
          репозитория.
        </Copy>
        <Copy>
          Демонстрационных аккаунтов и выдуманной синхронизации здесь нет.
        </Copy>
      </Screen>
    );
  if (app.booting) return <Loading />;
  if (!app.session) return <AuthScreen />;
  if (!app.ready)
    return app.error ? (
      <Screen>
        <Title>Не удалось открыть пространство</Title>
        <ErrorMessage message={task.error ?? app.error} />
        <Button title="Попробовать снова" onPress={() => void app.refresh()} />
        <Button
          title="Выйти и войти заново"
          secondary
          disabled={task.busy}
          onPress={() => void task.run(app.signOut)}
        />
      </Screen>
    ) : (
      <Loading />
    );
  return app.space ? <HomeScreen /> : <CoupleScreen />;
}
