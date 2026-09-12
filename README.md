# DBA Hypotheekdashboard

Intern hypotheekdossieroverzicht voor DBA Advies.

## Starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Authenticatie

Er is bewust **één gedeelde organisatielogin** voor heel DBA Advies (geen aparte gebruikersaccounts).

Zet in `.env` (zie `.env.example`):

```bash
AUTH_USERNAME=dba
AUTH_PASSWORD_HASH=...
SESSION_SECRET=...   # minstens 32 willekeurige tekens
```

Genereer een wachtwoord-hash:

```bash
npm run auth:hash -- "jouw-sterke-wachtwoord"
```

Plak alleen de hash in `AUTH_PASSWORD_HASH` (Vercel/env). Nooit het plaintext-wachtwoord committen.

- Niet ingelogd → redirect naar `/login`
- Inloggen → sessiecookie (HttpOnly, SameSite=Lax, Secure in productie, 10 uur)
- Uitloggen (sidebar) → sessie wissen → `/login`

## Database (Neon / PostgreSQL)

1. Kopieer `.env.example` naar `.env` en vul `DATABASE_URL` in.
2. Genereer/pas migraties toe:

```bash
npm run db:generate
npm run db:migrate
```

3. Optioneel ontwikkeldata laden:

```bash
npm run db:seed
```

De UI gebruikt in deze fase nog mockdata; de database is nog niet aangesloten op de dashboardtabel.

## Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- lucide-react (iconen)
- Drizzle ORM + Neon/PostgreSQL
- bcryptjs (gedeelde login)
