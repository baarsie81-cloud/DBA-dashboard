# DBA Hypotheekdashboard

Intern hypotheekdossieroverzicht voor DBA Advies.

## Starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — de app redirect naar `/in-behandeling`.

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
