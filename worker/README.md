# Foto-Auswertung einrichten (Cloudflare Worker)

Die App ist öffentlich. Darum steht der Claude-API-Schlüssel nicht in der App, sondern nur geheim in diesem kleinen Worker bei Cloudflare. Der Worker zählt die Mahlzeiten-Fotos pro Gerät und gibt die Anfrage an Claude weiter. Der kostenlose Cloudflare-Tarif reicht dafür.

## Einmalig einrichten (im Cloudflare-Dashboard)

1. **Zähler anlegen:** *Storage & Databases → Workers KV → Create instance*, Name `fitness-tracker-fotos`.
2. **Worker anlegen:** *Compute → Workers & Pages → Create → Start with Hello World*, Name `fitness-tracker-foto`, **Deploy**.
3. **Code einfügen:** *Edit code*, den gesamten Inhalt durch [`foto-worker.js`](foto-worker.js) ersetzen und auf **Deploy** klicken.
4. **Zähler verbinden:** Im Worker auf *Bindings → Add binding → KV namespace* gehen. Als Variablennamen genau `FOTO_ZAEHLER` eintragen und den Namespace `fitness-tracker-fotos` wählen.
5. **Einstellungen:** Unter *Settings → Variables and Secrets* Folgendes anlegen:

   | Name | Typ | Wert |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | **Secret** | derselbe Schlüssel wie in Tracker-Linda (`sk-ant-…`) |
   | `FOTO_LIMIT` | Text | `2` (Testphase), später `100` |
   | `GESAMT_LIMIT` | Text | `300` (Auswertungen pro Monat für alle zusammen, Schutz vor Missbrauch) |
   | `ERLAUBTE_SEITE` | Text | `https://linda-efe.github.io` |

6. Die Adresse des Workers kopieren (z. B. `https://fitness-tracker-foto.<name>.workers.dev`). In `index.html` trägst du sie bei `var WORKER_URL = "";` ein, oder du schickst sie Claude.

## Limit ändern

Nach der Testphase im Worker unter *Settings → Variables and Secrets* `FOTO_LIMIT` auf `100` setzen. Die App muss dafür nicht geändert werden, sie zeigt das neue Limit automatisch an.

## Was gezählt wird

- Jedes **neue Foto** zählt einmal. „Neu schätzen“ mit demselben Foto zählt nicht noch einmal.
- „Aus Beschreibung schätzen“ (ohne Foto) zählt nicht zum Foto-Limit, wohl aber zur Monatsgrenze `GESAMT_LIMIT`.
- Ist das Limit erreicht, zeigt die App: *„Das ist eine Testversion und du hast … Mahlzeiten-Fotos verbraucht. Melde dich beim Eduard unter Eduard.Helbling@gmail.com, wenn du das Feature weiter nutzen möchtest.“*
- Gezählt wird pro Gerät bzw. Browser. Wer die Website-Daten löscht, bekommt ein neues Kontingent. Deshalb gibt es zusätzlich die Monatsgrenze, die die Kosten insgesamt deckelt.
