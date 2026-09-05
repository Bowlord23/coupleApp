export function friendlyError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const messages: Record<string, string> = {
    COOLDOWN: "Растение уже получило вашу заботу. Попробуйте чуть позже.",
    INVALID_INVITE: "Код не найден или приглашение уже использовано.",
    OWN_INVITE: "Это ваше приглашение. Отправьте его партнёру.",
    ALREADY_MEMBER: "Вы уже состоите в паре. Обновите экран.",
    FORBIDDEN: "Это пространство больше недоступно. Обновите экран.",
    INVALID_NAME: "Введите имя длиной от 1 до 40 символов.",
    INVALID_NOTE: "Записка должна содержать от 1 до 180 символов.",
    RATE_LIMIT: "Слишком много попыток. Подождите минуту.",
  };
  for (const [code, text] of Object.entries(messages))
    if (message.includes(code)) return text;
  if (/expired|invalid.*token|otp/i.test(message))
    return "Код неверный или устарел. Запросите новое письмо.";
  if (/rate|too many/i.test(message))
    return "Подождите немного перед следующей попыткой.";
  return "Не удалось связаться с нашим пространством. Проверьте интернет и попробуйте снова.";
}
