import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { event, senderUserId } = req.body;
  if (!event) return res.status(400).json({ error: "Missing event" });

  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  const body = event.mode === "specific"
    ? `${dateStr} · ${event.time} · ${event.course}`
    : `${dateStr} · ${event.timeWindowLabel} · Open invite`;

  const payload = JSON.stringify({
    title: "⛳ New Tee Time Request",
    body,
    tag: `golf-${event.id}`,
    url: "/",
  });

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .neq("user_id", senderUserId);

  if (error) return res.status(500).json({ error: "Failed to fetch subscriptions" });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  const expired = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const status = r.reason?.statusCode;
      if (status === 410 || status === 404) expired.push(subs[i].endpoint);
    }
  });

  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  const sent = results.filter((r) => r.status === "fulfilled").length;
  return res.status(200).json({ sent, total: subs.length });
}
