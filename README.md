# Höstlovet.se

Källkod till testappen för föräldrar och barn 8–14 år. Importerad från appversionen
publicerad 2026-09-15, källrevision `0c94734ae2cab2a09428e77e6d79081da2c1361b`.

## Innehåll

- Föräldraöversikt, planering, familj och godkännande av uppdrag.
- Barnets egen startsida med Idag, Mitt lov och Belöningar.
- 17 aktivitetsförslag, inklusive lovträning, läger och föräldravalt museum.
- Personliga barnlänkar, serverkontrollerade behörigheter och beständig status.
- Belöningskuvert, produktbilder, familjebelöningar och tydlig barn-demo.
- Testbetalningar, transaktionsjournal, dubblettskydd och simulerade leveranser.

## GitHub-import, inte färdig Vercel-migrering

Versionen använder **Vinext, Cloudflare Workers och D1/SQLite**. Den kan inte
driftsättas oförändrad som en vanlig Next.js-app på Vercel. PostgreSQL-filen i
`db/postgres/schema.sql` är ett utkast, inte appens aktiva databas. GitHub-importen
kopplar inte automatiskt domänen till Vercel.

Alla betalningar, presentkort och SMS är mockade. Inga skarpa API-nycklar,
familjedata eller lokala databaser ingår. Ändrade miljövariabler aktiverar inte
en färdig produktionsintegration.

Föräldraidentiteten kommer idag från Sites-plattformens betrodda headers.
Exponera inte backend direkt på en ny publik värd innan detta ersatts med
verifierad serverinloggning. Barn ska inte behöva ChatGPT-konto.

## Lokal utveckling

Node.js 22.13 eller senare. Använd projektets låsta paketversioner.

```sh
npm ci
npm run dev
```

Öppna adressen som utvecklingsservern visar. `/barn/demo` använder exempeldata.
Utvecklingslägets mockinloggning är endast till för lokal utveckling.
Kopiera vid behov `.env.example` till en lokal `.env`; lägg aldrig hemligheter i Git.

```sh
npm run build
npx tsc --noEmit
node tests/flow.mjs
```

Bygget ger en Cloudflare Worker. Migreringarna finns i `drizzle/`.
Ändra inte redan tillämpade migreringar. Driftresurser och identitet måste
konfigureras separat; hostingfilen har ingen befintlig Sites-identitet.

## Viktiga filer

| Del | Filer |
| --- | --- |
| Föräldra- och barnvy | `app/parent-experience.tsx`, `app/child-experience.tsx` |
| Aktivitetsbibliotek | `lib/activities.ts`, `app/activity-library.tsx` |
| Serverflöde och mockintegrationer | `lib/server.ts`, `lib/providers.ts` |
| Databas och migreringar | `db/`, `drizzle/` |
| Bilder och PWA | `public/` |
| Arkitektur och driftgap | `docs/ARCHITECTURE.md`, `docs/LAUNCH.md` |

Se `docs/LAUNCH.md` för Vercel, egen inloggning och ClearOn KS-integrationen.
Detta repo är utvecklingsunderlag, inte en tjänst klar för riktiga pengar.
