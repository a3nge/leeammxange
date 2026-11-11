// Fonction Supabase « notify » : envoie une notification à l'autre personne
// quand quelqu'un ajoute du contenu. À coller dans Supabase > Edge Functions > notify.
// Voir MISE-A-JOUR.md pour les étapes.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const NAMES = ["Ange", "Leeamm"];

// Texte de la notification (volontairement sans le contenu du message : plus discret sur un écran verrouillé)
function messageFor(rec, parent, recipient) {
  const who = rec.author;
  switch (rec.kind) {
    case "idea":
      return who + " a partagé une idée.";
    case "question":
      return who + " t'a posé un questionnement.";
    case "comment": {
      const what = parent && parent.kind === "question" ? "questionnement" : "idée";
      if (!parent) return who + " a ajouté un commentaire.";
      if (parent.author === recipient) return who + " a répondu à ton " + what + ".";
      return who + " a ajouté une suite à son " + what + ".";
    }
    case "photo":
      return who + " a ajouté une photo.";
    case "file":
      return who + " a partagé un fichier.";
    case "song":
      return who + " a ajouté un morceau.";
    case "moment":
      return who + " a ajouté un moment ensemble.";
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  let body;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response("bad request", { status: 400 });
  }
  const rec = body && body.record;
  if (!rec || NAMES.indexOf(rec.author) < 0) return new Response("ignored");

  const recipient = rec.author === "Ange" ? "Leeamm" : "Ange";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  );

  let parent = null;
  if (rec.kind === "comment" && rec.data && rec.data.parentId) {
    const r = await supabase.from("items").select("kind,author").eq("id", rec.data.parentId).maybeSingle();
    parent = r.data;
  }
  const text = messageFor(rec, parent, recipient);
  if (!text) return new Response("ignored");

  const subs = await supabase.from("push_subscriptions").select("endpoint, sub").eq("person", recipient);
  if (!subs.data || !subs.data.length) return new Response("no subscription");

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:nous@exemple.fr",
    Deno.env.get("VAPID_PUBLIC_KEY"),
    Deno.env.get("VAPID_PRIVATE_KEY"),
  );
  const payload = JSON.stringify({ title: "Leeamm X Ange", body: text, tag: rec.kind + "-" + rec.author });

  await Promise.all(subs.data.map(async (s) => {
    try {
      await webpush.sendNotification(s.sub, payload, { TTL: 86400 });
    } catch (e) {
      if (e && (e.statusCode === 404 || e.statusCode === 410)) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      } else {
        console.error("push", e && e.statusCode, e && e.body);
      }
    }
  }));
  return new Response("ok");
});
