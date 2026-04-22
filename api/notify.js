import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function sbFetch(path, opts = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { event, senderUsername } = req.body;
  if (!event) return res.status(400).json({ error: "Missing event" });

  // Build notification body
  const dateStr = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
  const body = event.mode === "specific"
    ? `${dateStr} · ${event.time} · ${event.course}`
    : `${dateStr} · ${event.timeWindowLabel}`;

  const payload = JSON.stringify({
    title: `⛳ ${senderUsername} wants to play`,
    body,
    tag: `golf-${event.id}`,
    url: "/",
  });

  // Fetch all push subscriptions EXCEPT the sender's
  const subsRes = await sbFetch(
    `push_subscriptions?username=neq.${encodeURIComponent(senderUsername)}`
  );
  if (!subsRes.ok) {
    return res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
  const subs = await subsRes.json();

  if (!subs.length) {
    return res.status(200).json({ sent: 0, total: 0, message: "No subscribers" });
  }

  // Fan out
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Clean up expired subscriptions
  const expired = results
    .map((r, i) => r.status === "rejected" && [410, 404].includes(r.reason?.statusCode) ? subs[i].endpoint : null)
    .filter(Boolean);

  if (expired.length) {
    await Promise.all(expired.map(ep =>
      sbFetch(`push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, { method: "DELETE" })
    ));
  }

  const sent = results.filter(r => r.status === "fulfilled").length;
  return res.status(200).json({ sent, total: subs.length });
}
