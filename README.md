# Fitness-Tracker

Allgemeine Version des Trackers für alle. Es gibt kein Konto und keinen Server: Alle Daten bleiben nur auf dem eigenen iPhone bzw. im eigenen Browser.

Eine kleine Web-App im Handy-Look, die ohne weitere Dienste läuft.

1. **Interview:** 13 Fragen. Daraus berechnet die App deinen Kalorien- und Makroplan nach Mifflin-St Jeor mit Aktivitätsfaktor. Sie geht nie unter 1.200 kcal (Frauen) bzw. 1.500 kcal (Männer) und plant höchstens 0,75 kg Abnahme pro Woche.
2. **Plan:** Kalorien, Eiweiß, Kohlenhydrate und Fett pro Tag, die erwartete Veränderung pro Woche, das voraussichtliche Datum für dein Zielgewicht und drei persönliche Tipps.
3. **Tracker:** ein großer Kalorien-Ring für den Tag, drei Ringe für Eiweiß, Kohlenhydrate und Fett, ein Tagebuch mit allen Mahlzeiten und ein 7-Tage-Verlauf. Einträge kannst du ändern und löschen, auch für vergangene Tage. Sonntags zeigt die App einen Wochenrückblick mit genau einer Anpassung für die nächste Woche.

4. **Foto-Auswertung:** Foto aufnehmen oder kurz beschreiben, was du gegessen hast. Claude schätzt dann Portion, Kalorien und Makros, nennt seine Annahme und stellt bei Unsicherheit genau eine Rückfrage. Du prüfst die Werte und trägst sie ein.

Alles steckt in einer Datei: `index.html`.

## Foto-Auswertung einrichten

Die App nutzt dafür die Claude-Schnittstelle (API). Abgerechnet wird nach Nutzung, grob etwa 1 Cent pro Foto. Das Claude-Max-Abo enthält monatliches API-Guthaben, das du auf https://platform.claude.com einlösen kannst.

1. Auf https://platform.claude.com anmelden und das Guthaben einlösen (oder unter **Guthaben** aufladen).
2. Unter **API-Schlüssel** einen Schlüssel erstellen.
3. In der App oben rechts die Einstellungen öffnen und den Schlüssel bei **Claude-Schlüssel** einfügen.

Der Schlüssel bleibt nur im Browser des jeweiligen Geräts gespeichert. Die Foto-Auswertung ist freiwillig; ohne Schlüssel trägst du Mahlzeiten von Hand ein.

## Wo die Daten liegen

Alle Antworten und Einträge speichert die App nur im Browser des jeweiligen Geräts (`localStorage`). Nichts wird auf GitHub oder einen anderen Server übertragen. Deshalb kann jede Person dieselbe Adresse nutzen und sieht trotzdem nur ihre eigenen Daten.

- **Am iPhone:** Die Seite in Safari öffnen und über **Teilen → Zum Home-Bildschirm** ablegen. Dann startet der Tracker wie eine App.
- **Sicherung:** In den Einstellungen (oben rechts) gibt es **Sicherung speichern** und **Sicherung laden**. Damit nimmst du deine Daten auf ein neues Gerät mit oder schützt sie vor Verlust.
- **Achtung:** Wer die Website-Daten im Browser löscht oder die App vom Home-Bildschirm entfernt, verliert die Einträge, falls keine Sicherung existiert.

## Im Browser öffnen (GitHub Pages)

1. **Settings → Pages** öffnen und bei *Source* „Deploy from a branch“ wählen.
2. Branch `main` und Ordner `/ (root)` wählen, dann **Save**.
3. Die App läuft unter https://linda-efe.github.io/Fitness-Tracker/

## Unterschied zu Tracker-Linda

Tracker-Linda gleicht die Daten über ein privates GitHub-Repository zwischen Handy und PC ab. Der Fitness-Tracker verzichtet darauf und speichert nur lokal. Beide Apps laufen unabhängig voneinander, auch im selben Browser: Der Fitness-Tracker nutzt eigene Speichernamen und berührt die Daten von Tracker-Linda nicht.
