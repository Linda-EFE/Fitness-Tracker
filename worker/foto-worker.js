/*
 * Foto-Auswertung für den Fitness-Tracker (Cloudflare Worker).
 *
 * Der Claude-API-Schlüssel liegt nur hier als geheime Variable, nie in der App.
 * Der Worker zählt pro Gerät, wie viele Mahlzeiten-Fotos ausgewertet wurden,
 * und lehnt weitere Fotos ab, sobald FOTO_LIMIT erreicht ist.
 *
 * Einstellungen im Cloudflare-Dashboard (Worker → Settings → Variables and Secrets):
 *   ANTHROPIC_API_KEY  (Secret)  derselbe Schlüssel wie in Tracker-Linda
 *   FOTO_LIMIT         (Text)    Fotos pro Gerät, zum Testen 2, später 100
 *   GESAMT_LIMIT       (Text)    Sicherheitsgrenze: Auswertungen pro Monat für alle zusammen (Standard 300)
 *   ERLAUBTE_SEITE     (Text)    https://linda-efe.github.io
 * Bindings: KV-Namespace mit dem Variablennamen FOTO_ZAEHLER
 */

const MEAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "annahme", "kcal", "eiweiss_g", "kohlenhydrate_g", "fett_g", "rueckfrage"],
  properties: {
    name: { type: "string", description: "Kurzer Name der Mahlzeit auf Deutsch" },
    annahme: { type: "string", description: "Ein Satz: welche Portion und Zubereitung du annimmst" },
    kcal: { type: "number" }, eiweiss_g: { type: "number" }, kohlenhydrate_g: { type: "number" }, fett_g: { type: "number" },
    rueckfrage: { type: "string", description: "Genau eine kurze Rückfrage, wenn du wirklich unsicher bist, sonst leerer String" }
  }
};

function cors(env, req) {
  const erlaubt = (env.ERLAUBTE_SEITE || "https://linda-efe.github.io").split(",").map(s => s.trim());
  const origin = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": erlaubt.includes(origin) ? origin : erlaubt[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function antwort(env, req, status, daten) {
  return new Response(JSON.stringify(daten), { status, headers: { "content-type": "application/json; charset=utf-8", ...cors(env, req) } });
}
function zahl(v, std) { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : std; }
function gueltigeId(s) { return typeof s === "string" && /^[A-Za-z0-9-]{8,64}$/.test(s); }
function txt(s, max) { return typeof s === "string" ? s.slice(0, max) : ""; }

async function lesen(env, geraet) {
  const roh = await env.FOTO_ZAEHLER.get("geraet:" + geraet);
  try { const d = JSON.parse(roh); if (d && typeof d.n === "number") return { n: d.n, ids: Array.isArray(d.ids) ? d.ids : [] }; } catch (e) {}
  return { n: 0, ids: [] };
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, req) });
    const limit = zahl(env.FOTO_LIMIT, 2);
    const url = new URL(req.url);

    // Stand abfragen: GET ?geraet=<id>
    if (req.method === "GET") {
      const geraet = url.searchParams.get("geraet");
      if (!gueltigeId(geraet)) return antwort(env, req, 400, { fehler: "Ungültige Anfrage." });
      const z = await lesen(env, geraet);
      return antwort(env, req, 200, { verbraucht: z.n, limit });
    }
    if (req.method !== "POST") return antwort(env, req, 405, { fehler: "Nicht erlaubt." });

    let b;
    try { b = await req.json(); } catch (e) { return antwort(env, req, 400, { fehler: "Ungültige Anfrage." }); }
    if (!b || !gueltigeId(b.geraet)) return antwort(env, req, 400, { fehler: "Ungültige Anfrage." });

    const mitFoto = !!(b.bild && typeof b.bild.data === "string");
    if (mitFoto && (!gueltigeId(b.fotoId) || b.bild.type !== "image/jpeg" || b.bild.data.length > 2500000)) {
      return antwort(env, req, 400, { fehler: "Das Foto ist zu groß oder ungültig." });
    }
    const name = txt(b.name, 200), hinweise = txt(b.hinweise, 1000);
    if (!mitFoto && !name && !hinweise) return antwort(env, req, 400, { fehler: "Beschreib kurz, was du gegessen hast, oder mach ein Foto." });

    // Zähler pro Gerät: jedes neue Foto zählt einmal, "Neu schätzen" mit demselben Foto ist frei.
    const z = await lesen(env, b.geraet);
    const neuesFoto = mitFoto && !z.ids.includes(b.fotoId);
    if (neuesFoto && z.n >= limit) return antwort(env, req, 403, { limitErreicht: true, verbraucht: z.n, limit });

    // Sicherheitsgrenze für alle Geräte zusammen pro Monat
    const monat = "gesamt:" + new Date().toISOString().slice(0, 7);
    const gesamt = zahl(await env.FOTO_ZAEHLER.get(monat), 0);
    if (gesamt >= zahl(env.GESAMT_LIMIT, 300)) return antwort(env, req, 503, { fehler: "Die Foto-Auswertung ist für diesen Monat ausgeschöpft. Trag die Werte bitte von Hand ein.", verbraucht: z.n, limit });

    const ernaehrung = txt(b.ernaehrung, 60) || "keine Angabe", meidet = txt(b.meidet, 300);
    const system = "Du bist ein Ernährungscoach und schätzt Mahlzeiten für ein Kalorientagebuch. " +
      "Schätze die Portion realistisch und gib Kalorien, Eiweiß, Kohlenhydrate und Fett für die gesamte gezeigte bzw. beschriebene Portion an. " +
      "Antworte auf Deutsch. Die Person ernährt sich: " + ernaehrung + (meidet ? "; isst nicht: " + meidet : "") + ". " +
      "Stell nur dann genau eine kurze Rückfrage, wenn eine Angabe die Schätzung stark verändern würde (z. B. Portionsgröße nicht erkennbar); gib trotzdem deine beste Schätzung ab. " +
      "Ist auf dem Bild kein Essen zu sehen, setze alle Werte auf 0 und frag nach.";
    const content = [];
    if (mitFoto) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.bild.data } });
    const teile = [mitFoto ? "Schätze die Mahlzeit auf dem Foto." : "Schätze diese Mahlzeit."];
    if (name) teile.push("Name: " + name);
    if (hinweise) teile.push("Hinweise von mir: " + hinweise);
    content.push({ type: "text", text: teile.join("\n") });

    let r, body;
    try {
      r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2026-10-21",
          "anthropic-beta": "server-side-fallback-2026-07-01"
        },
        body: JSON.stringify({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          fallbacks: "default",
          system,
          output_config: { format: { type: "json_schema", schema: MEAL_SCHEMA } },
          messages: [{ role: "user", content }]
        })
      });
      body = await r.json().catch(() => null);
    } catch (e) {
      return antwort(env, req, 502, { fehler: "Claude ist gerade nicht erreichbar. Versuch es in ein paar Minuten noch einmal.", verbraucht: z.n, limit });
    }

    await env.FOTO_ZAEHLER.put(monat, String(gesamt + 1), { expirationTtl: 60 * 60 * 24 * 40 });
    if (!r.ok) {
      const msg = body && body.error && body.error.message || "";
      let fehler = "Die Auswertung hat nicht geklappt (Fehler " + r.status + ").";
      if (r.status === 401 || (r.status === 400 && /credit|balance/i.test(msg))) fehler = "Die Foto-Auswertung ist gerade nicht verfügbar. Trag die Werte bitte von Hand ein.";
      else if (r.status === 429) fehler = "Zu viele Anfragen in kurzer Zeit. Warte eine Minute und versuch es noch einmal.";
      else if (r.status >= 500) fehler = "Claude ist gerade überlastet. Versuch es in ein paar Minuten noch einmal.";
      return antwort(env, req, 502, { fehler, verbraucht: z.n, limit });
    }
    if (body.stop_reason === "refusal") return antwort(env, req, 200, { abgelehnt: true, verbraucht: z.n, limit });

    if (neuesFoto) {
      z.n += 1; z.ids = z.ids.concat(b.fotoId).slice(-5);
      await env.FOTO_ZAEHLER.put("geraet:" + b.geraet, JSON.stringify(z));
    }
    const text = (body.content || []).filter(x => x.type === "text").map(x => x.text).join("");
    let ergebnis = null;
    try { ergebnis = JSON.parse(text); } catch (e) {}
    return antwort(env, req, 200, { ergebnis, verbraucht: z.n, limit });
  }
};
