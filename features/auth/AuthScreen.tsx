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
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const task = useTask();
  const send = () =>
    task.run(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setSent(true);
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
          <Title>{sent ? "Письмо для вас" : "Добро пожаловать"}</Title>
          <Copy>
            {sent
              ? "Введите код из письма. Он подходит и для первого входа, и для возвращения."
              : "Ваш email — чтобы сохранить наше маленькое пространство."}
          </Copy>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!sent && !task.busy}
          />
          {sent && (
            <Field
              label="Код из письма"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              maxLength={10}
            />
          )}
          <ErrorMessage message={task.error} />
          <Button
            disabled={
              task.busy ||
              (sent
                ? !/^\d{6,10}$/.test(code)
                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
            }
            title={
              task.busy
                ? "Подождите…"
                : sent
                  ? "Войти в пространство"
                  : "Получить код"
            }
            onPress={() => {
              if (!sent) {
                void send();
                return;
              }
              void task.run(async () => {
                const { error } = await supabase.auth.verifyOtp({
                  email: email.trim(),
                  token: code,
                  type: "email",
                });
                if (error) throw error;
              });
            }}
          />
          {sent && (
            <>
              <Button
                title="Отправить код ещё раз"
                secondary
                disabled={task.busy}
                onPress={() => void send()}
              />
              <Button
                title="Изменить email"
                secondary
                onPress={() => {
                  setSent(false);
                  setCode("");
                  task.setError(null);
                }}
              />
            </>
          )}
        </>
      )}
    </Screen>
  );
}
