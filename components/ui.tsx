import type { PropsWithChildren } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../constants/theme";
export function Screen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Title({ children }: PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Copy({ children }: PropsWithChildren) {
  return <Text style={styles.copy}>{children}</Text>;
}
export function Button({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (disabled || pressed) && { opacity: 0.55 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: theme.accent }]}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        accessibilityLabel={props.label}
        {...props}
        style={[styles.input, props.style]}
      />
    </View>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading({
  text = "Открываем наше пространство…",
}: {
  text?: string;
}) {
  return (
    <Screen>
      <View style={styles.center}>
        <ActivityIndicator color={theme.accent} />
        <Copy>{text}</Copy>
      </View>
    </Screen>
  );
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  screen: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 20,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  title: {
    fontSize: 34,
    lineHeight: 41,
    letterSpacing: -1.1,
    fontWeight: "500",
    color: theme.text,
  },
  copy: { fontSize: 16, lineHeight: 25, color: theme.muted },
  label: { fontSize: 13, color: theme.muted, letterSpacing: 0.4 },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 17,
    color: theme.text,
    minHeight: 54,
  },
  button: {
    backgroundColor: theme.accent,
    minHeight: 54,
    borderRadius: 28,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: theme.pale },
  buttonText: { color: theme.white, fontSize: 16, fontWeight: "600" },
  error: { color: theme.error, fontSize: 14, lineHeight: 21 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  divider: { height: 1, backgroundColor: theme.border },
});
