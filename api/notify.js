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

async function pushToUsers(usernames, payload) {
  if (!usernames.length) return { sent: 0, total: 0 };
  const inList = usernames.map(u => `"${u}"`).join(",");
  const subsRes = await sbFetch(`push_subscriptions?username=in.(${encodeURIComponent(inList)})`);
  if (!subsRes.ok) return { sent: 0, total: 0 };
  const subs = await subsRes.json();
  if (!subs.length) return { sent: 0, total: 0 };
  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      )
    )
  );
  const expired = results
    .map((r, i) => r.status === "rejected" && [410, 404].includes(r.reason?.statusCode) ? subs[i].endpoint : null)
    .filter(Boolean);
  if (expired.length) {
    await Promise.all(expired.map(ep =>
      sbFetch(`push_subscriptions?endpoint=eq.${encodeURIComponent(ep)}`, { method: "DELETE" })
    ));
  }
  return { sent: results.filter(r => r.status === "fulfilled").length, total: subs.length };
}

async function getAllOtherUsernames(excludeUsername) {
  const subsRes = await sbFetch(`push_subscriptions?username=neq.${encodeURIComponent(excludeUsername)}&select=username`);
  if (!subsRes.ok) return [];
  const rows = await subsRes.json();
  return [...new Set(rows.map(r => r.username))];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, event, senderUsername, rsvp } = req.body;

  // New tee time posted
  if (type === "new_request" || !type) {
    if (!event) return res.status(400).json({ error: "Missing event" });
    const dateStr = new Date(event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const body = event.mode === "specific"
      ? `${dateStr} · ${event.time} · ${event.course}`
      : `${dateStr} · ${event.timeWindowLabel}`;
    const others = await getAllOtherUsernames(senderUsername);
    const result = await pushToUsers(others, {
      title: `⛳ ${senderUsername} wants to play`,
      body,
      tag: `golf-request-${event.id}`,
      url: "/",
    });
    return res.status(200).json(result);
  }

  // Someone RSVP'd yes — notify requester + all existing players
  if (type === "rsvp_yes") {
    if (!rsvp) return res.status(400).json({ error: "Missing rsvp data" });
    const { joinerUsername, requesterUsername, spotsLeft, allPlayerUsernames } = rsvp;
    const body = spotsLeft > 0
      ? `${joinerUsername} is in! Still need ${spotsLeft} more.`
      : `${joinerUsername} is in! Group is full 🎉`;
    // Notify requester that someone joined
    await pushToUsers([requesterUsername], {
      title: "🙌 Someone joined your tee time",
      body,
      tag: `golf-rsvp-${Date.now()}`,
      url: "/",
    });
    // Notify all other existing players about the update
    const otherPlayers = (allPlayerUsernames || []).filter(u => u !== joinerUsername && u !== requesterUsername);
    if (otherPlayers.length) {
      await pushToUsers(otherPlayers, {
        title: "⛳ Tee time update",
        body: spotsLeft > 0 ? `${joinerUsername} joined · ${spotsLeft} spot${spotsLeft > 1 ? "s" : ""} left` : "Group is full! 🎉",
        tag: `golf-rsvp-update-${Date.now()}`,
        url: "/",
      });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "Unknown type" });
}
