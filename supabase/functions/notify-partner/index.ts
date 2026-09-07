import { withSupabase } from "npm:@supabase/server";

export default {
  fetch: withSupabase({ auth: "user" }, async (request, context) => {
    if (request.method !== "POST")
      return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });

    try {
      const body = await request.json();
      if (typeof body?.request_id !== "string")
        throw new Error("INVALID_REQUEST");

      const { data: recipientId, error: pokeError } = await context.supabase.rpc(
        "poke_partner",
        { request_id: body.request_id },
      );
      if (pokeError) throw pokeError;

      const senderId = context.userClaims?.sub;
      try {
        const [{ data: tokens, error: tokenError }, { data: sender }] =
          await Promise.all([
            context.supabaseAdmin
              .from("push_tokens")
              .select("token")
              .eq("user_id", recipientId),
            context.supabaseAdmin
              .from("couple_members")
              .select("display_name")
              .eq("user_id", senderId)
              .maybeSingle(),
          ]);
        if (tokenError) throw tokenError;
        if (!tokens?.length)
          return Response.json({ sent: true, delivered: 0, reason: "NO_PUSH_TOKEN" });

        const messages = tokens.map(({ token }) => ({
          to: token,
          title: "OurPlant",
          body:
            (sender?.display_name ?? "Ваш партнёр") +
            " отправил(а) вам сердечко 💛",
          sound: "default",
          priority: "high",
          channelId: "attention",
          data: { url: "/" },
        }));
        const pushResponse = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages),
          signal: AbortSignal.timeout(7000),
        });
        const result = await pushResponse.json();
        if (!pushResponse.ok) throw new Error("PUSH_FAILED");

        const tickets = Array.isArray(result?.data) ? result.data : [result?.data];
        const invalidTokens = tokens
          .filter((_, index) => tickets[index]?.details?.error === "DeviceNotRegistered")
          .map(({ token }) => token);
        if (invalidTokens.length)
          await context.supabaseAdmin.from("push_tokens").delete().in("token", invalidTokens);
        const delivered = tickets.filter((ticket) => ticket?.status === "ok").length;
        return Response.json({ sent: true, delivered, tickets });
      } catch (pushError) {
        console.error("Push delivery failed", pushError);
        return Response.json({ sent: true, delivered: 0, reason: "PUSH_UNAVAILABLE" });
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "UNKNOWN_ERROR";
      return Response.json({ error: message }, { status: 400 });
    }
  }),
};
