import { useState } from "react";
import { View, Text } from "react-native";
import {
  Button,
  Copy,
  ErrorMessage,
  Field,
  Screen,
  Title,
  styles,
} from "../../components/ui";
import { Plant } from "../../components/Plant";
import { APP_NAME } from "../../constants/product";
import { supabase } from "../../lib/supabase";
import { useTask } from "../../hooks/useTask";
export default function AuthScreen() {
  const [started, setStarted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registering, setRegistering] = useState(true);
  const task = useTask();
  const submit = () =>
    task.run(async () => {
      const credentials = { email: email.trim(), password };
      const { data, error } = registering
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.session)
        throw new Error("Аккаунт создан, но Supabase не открыл сессию.");
    });
  return (
    <Screen>
      <Text style={styles.label}>{APP_NAME.toUpperCase()}</Text>
      {!started ? (
        <>
          <Plant stage={2} />
          <Title>Растите вместе.{"\n"}Даже на расстоянии.</Title>
          <Copy>
            Одно маленькое место, которое принадлежит только вам двоим.
          </Copy>
          <View style={{ flex: 1 }} />
          <Button title="Начать" onPress={() => setStarted(true)} />
        </>
      ) : (
        <>
          <Title>{registering ? "Создать аккаунт" : "С возвращением"}</Title>
          <Copy>
            {registering
              ? "Придумайте пароль, чтобы сохранить ваше маленькое пространство."
              : "Введите email и пароль, которые использовали при регистрации."}
          </Copy>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!task.busy}
          />
          <Field
            label="Пароль"
            value={password}
            onChangeText={setPassword}
            placeholder="Не меньше 8 символов"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={registering ? "new-password" : "current-password"}
            editable={!task.busy}
          />
          <ErrorMessage message={task.error} />
          <Button
            disabled={
              task.busy ||
              password.length < 8 ||
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            }
            title={
              task.busy
                ? "Подождите…"
                : registering
                  ? "Создать аккаунт"
                  : "Войти"
            }
            onPress={() => void submit()}
          />
          <Button
            title={registering ? "У меня уже есть аккаунт" : "Создать новый аккаунт"}
            secondary
            disabled={task.busy}
            onPress={() => {
              setRegistering((value) => !value);
              task.setError(null);
            }}
          />
        </>
      )}
    </Screen>
  );
}
