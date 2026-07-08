# 🎪 Festival Finance – unlock.family

Finanzverwaltung für das unlock.family Festival.
Mitglieder können Ausgaben und Einnahmen einreichen, der Kassenwart verwaltet alles.

---

## Tech-Stack

- **Next.js 14** (App Router) – `basePath: /finanzen`
- **PostgreSQL** + **Prisma** ORM
- **iron-session** für Authentifizierung (cookie-basiert, keine Accounts)
- **Tailwind CSS** – Dark Theme, mobile-first
- **Recharts** – Einnahmen/Ausgaben-Tortendiagramme
- **Docker + Docker Compose** für Self-Hosting

---

## 1. Lokale Entwicklung

### Voraussetzungen
- Node.js 20+
- PostgreSQL (lokal oder via Docker)

### Setup

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env
# .env bearbeiten und Passwörter/Session-Secret setzen

# 3. Datenbank-Migrationen ausführen
npx prisma migrate dev --name init

# 4. Kategorien einspielen
npm run db:seed

# 5. Dev-Server starten
npm run dev
```

Die App läuft dann unter: **http://localhost:3000/finanzen**

### Umgebungsvariablen (`.env`)

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungsstring |
| `MEMBER_PASSWORD` | Passwort für Mitglieder |
| `TREASURER_PASSWORD` | Passwort für den Kassenwart |
| `SESSION_SECRET` | Zufälliger String, mind. 32 Zeichen |
| `FESTIVAL_YEAR` | Aktuelles Festivaljahr (z. B. `2025`) |
| `NEXT_PUBLIC_BASE_PATH` | Basis-Pfad, muss `/finanzen` sein |

---

## 2. Vercel-Deployment (Testing)

### Schritt-für-Schritt

```bash
# 1. Repository auf GitHub pushen
git push origin main

# 2. Vercel-Projekt anlegen
#    → vercel.com → "New Project" → GitHub-Repo importieren

# 3. Umgebungsvariablen in Vercel setzen:
#    DATABASE_URL        → z. B. Vercel Postgres oder Railway (Free Tier)
#    MEMBER_PASSWORD     → Wunschpasswort
#    TREASURER_PASSWORD  → Wunschpasswort
#    SESSION_SECRET      → mind. 32 zufällige Zeichen
#    FESTIVAL_YEAR       → 2025
#    NEXT_PUBLIC_BASE_PATH → /finanzen

# 4. Deploy auslösen
```

### Datenbank: Vercel Postgres

Im Vercel-Dashboard: **Storage → Create Database → Postgres**
→ `DATABASE_URL` wird automatisch gesetzt.

Anschließend Migrationen ausführen:

```bash
npx prisma migrate deploy
npm run db:seed
```

### Datenbank: Railway (kostenlose Alternative)

1. [railway.app](https://railway.app) → "New Project" → PostgreSQL
2. Verbindungsstring kopieren → als `DATABASE_URL` in Vercel eintragen
3. Migrationen und Seed lokal ausführen (mit Railway-`DATABASE_URL`)

---

## 3. Self-Hosted Docker-Deployment (Produktion)

### Voraussetzungen
- Docker + Docker Compose installiert
- Nginx als Reverse Proxy

### Deployment

```bash
# 1. Repository auf den Laptop-Server klonen
git clone https://github.com/dein-org/unlock-ev-finanzen.git
cd unlock-ev-finanzen

# 2. .env anlegen
cp .env.example .env
nano .env  # Passwörter und SESSION_SECRET anpassen!

# 3. App bauen und starten
docker compose up -d --build

# Die App läuft jetzt auf Port 3000
# Migrationen und Seed werden beim Start automatisch ausgeführt
```

### Nginx Reverse Proxy

`/etc/nginx/sites-available/festival-finance`:

```nginx
server {
    listen 80;
    server_name dein-server.local;

    location /finanzen {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/festival-finance /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

Die App ist erreichbar unter: **http://dein-server.local/finanzen**

### Nützliche Docker-Befehle

```bash
# Status prüfen
docker compose ps

# Logs anzeigen
docker compose logs -f app

# Stoppen
docker compose down

# Neu bauen (nach Code-Update)
docker compose up -d --build
```

---

## 4. Migration: Von Vercel auf eigenen Laptop-Server

### Schritt 1: Datenbank-Backup auf Vercel erstellen

```bash
# Lokal ausführen (mit Vercel DATABASE_URL)
pg_dump "$VERCEL_DATABASE_URL" > backup.sql

# Oder via Vercel CLI:
vercel env pull .env.vercel
source .env.vercel
pg_dump "$DATABASE_URL" > backup.sql
```

### Schritt 2: Backup auf den Laptop-Server übertragen

```bash
scp backup.sql user@laptop-server:/home/user/backup.sql
```

### Schritt 3: Docker-Stack starten (nur die Datenbank)

```bash
# Auf dem Laptop-Server:
docker compose up -d db
# Warten bis DB bereit ist
sleep 5
```

### Schritt 4: Backup einspielen

```bash
docker compose exec -T db psql -U festivalfinance festivalfinance < backup.sql
```

### Schritt 5: App starten

```bash
docker compose up -d app
```

### Schritt 6: Umgebungsvariablen anpassen

In der `.env` auf dem Laptop-Server:
```
DATABASE_URL=postgresql://festivalfinance:festivalfinance@db:5432/festivalfinance
MEMBER_PASSWORD=... (gleich wie auf Vercel)
TREASURER_PASSWORD=...
SESSION_SECRET=... (gleich wie auf Vercel, sonst werden alle Sessions ungültig)
FESTIVAL_YEAR=2025
NEXT_PUBLIC_BASE_PATH=/finanzen
```

### Schritt 7: Verifikation

```bash
# Logs prüfen
docker compose logs app

# Datenbank-Inhalt prüfen
docker compose exec db psql -U festivalfinance -c "SELECT COUNT(*) FROM \"Expense\";"
```

---

## 5. Docker Volume sichern und wiederherstellen

### Backup des Volumes

```bash
# Volume-Backup als tar-Archiv
docker run --rm \
  -v unlock_ev_finanzen_postgres_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .
```

### Volume wiederherstellen

```bash
docker compose down

docker run --rm \
  -v unlock_ev_finanzen_postgres_data:/data \
  -v $(pwd):/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/postgres_backup_YYYYMMDD.tar.gz -C /data"

docker compose up -d
```

---

## Benutzerrollen

| Rolle | Zugang | Funktionen |
|---|---|---|
| **Mitglied** | Passwort: `MEMBER_PASSWORD` | Ausgabe/Einnahme einreichen, Übersicht anzeigen |
| **Kassenwart** | Passwort: `TREASURER_PASSWORD` | Alles + Tickets verwalten, CSV-Export, Kategorien |

---

## Seiten-Übersicht

| Pfad | Beschreibung | Zugang |
|---|---|---|
| `/finanzen/login` | Anmeldeseite | Öffentlich |
| `/finanzen/dashboard` | Finanzübersicht (Kennzahlen, Tortendiagramme) | Alle |
| `/finanzen/ausgabe-einreichen` | Ausgaben-Formular | Alle |
| `/finanzen/einnahme-einreichen` | Einnahmen-Formular | Alle |
| `/finanzen/verwaltung` | Ticket-Liste mit Filtern | Kassenwart |
| `/finanzen/verwaltung/kategorien` | Kategorien & Vorschläge | Kassenwart |
| `/finanzen/verwaltung/export?type=expenses` | CSV-Export Ausgaben | Kassenwart |
| `/finanzen/verwaltung/export?type=income` | CSV-Export Einnahmen | Kassenwart |

---

## Entwicklung

```bash
# Prisma Studio (DB-Browser)
npm run db:studio

# Prisma Migrationen generieren (nach Schema-Änderungen)
npx prisma migrate dev --name beschreibung

# Linting
npm run lint
```

---

## Kategorien: Ober-/Unterkategorien

Kategorien sind zweistufig: jede Kategorie hat entweder keine Elternkategorie
(**Oberkategorie**, z. B. „Stages“) oder zeigt auf eine Oberkategorie
(**Unterkategorie**, z. B. „Bühnenbau“ unter „Stages“). Beim Einreichen einer
Ausgabe/Einnahme werden beide Namen auf dem Eintrag gespeichert (`category` =
Unterkategorie, `categoryParent` = Oberkategorie), damit Auswertungen (z. B.
die Tortendiagramme in der Übersicht) unabhängig vom späteren Zustand der
Kategorienliste funktionieren.

### Datenbank zurücksetzen und neu befüllen

`prisma/seed.ts` (bzw. `prisma/seed-docker.js` für Docker-Deployments) löscht
beim Ausführen **alle** bestehenden Kategorien und legt die aktuelle
Ober-/Unterkategorien-Struktur neu an. Bestehende Ausgaben/Einnahmen bleiben
davon unberührt, da sie Kategorienamen als Text speichern, keine Fremdschlüssel.

```bash
# Nur Kategorien zurücksetzen und neu befüllen (lokal)
npm run db:seed

# Komplettes Zurücksetzen der Datenbank (alle Tabellen, alle Daten!)
npx prisma migrate reset
# → wendet alle Migrationen neu an und ruft anschließend automatisch
#   `npm run db:seed` auf (bestätigen mit "y")

# Im Docker-Setup läuft die Seed-Datei bei jedem Container-Start automatisch
# (siehe docker-start.sh) – ein manueller Reset genügt dort:
docker compose exec app node prisma/seed-docker.js
```

---

*unlock e.V. – Festival Finance · MIT License*
