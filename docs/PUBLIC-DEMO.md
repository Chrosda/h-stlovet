# Publik demo på Vercel

Denna första publicering visar startsidan, `/om` och barnets befintliga demo på
`/barn/demo`. Ingen databas, autentisering, betalning, kupong eller SMS ansluts.
Barnvyn använder alltid exempeldata och lagrar ändringar i sessionStorage om det
är tillgängligt. Skriv inga personuppgifter i uppdragsförslag.

## Bygg och kontrollera

Använd Node 22.13+ (eller Node 24) och kör från repositoryts rot:

```sh
npm ci --include=dev --include=optional
npm run check:demo
npm run build:demo
npm run preview:demo
```

Vercel använder `vercel.json`: framework `null`, byggkommando
`npm run build:demo`, output `dist-demo`. Root Directory ska vara repositoryts
rot. Filens bygginställningar ersätter motsvarande dashboard-inställningar.
Ingen DNS-ändring behövs. Granska PR-preview före merge till `main`.

## Säker avgränsning

- `demo/main.tsx` importerar bara klientkomponenter. Den fullständiga Workers-
  appen och dess API-routes ingår inte. En byggkontroll avvisar servermoduler.
- `dist-demo` innehåller bara klientpaketet och filer från `public`.
  Bygget stoppar om serverfiler, SQL, källkartor eller databasartefakter hittas.
- Inga generella SPA-rewrites: `/api/*` och okända filer ska ge 404 på Vercel,
  inte startsidans HTML. `/barn`, `/admin` och de gamla inloggningsadresserna
  visar i stället information om att funktionen inte är aktiverad.
- Personliga barnlänkar löses inte in. Demon gör inga API-anrop.
- Originalets `npm run build`, Workers-konfiguration och backendkod behålls
  för fortsatt arbete; de används inte av denna Vercel-publicering.
- Inga nya beroenden behövs. Befintlig npm-lockfil är oförändrad.

## Acceptanskontroll av PR-preview

1. Öppna `/`, `/start`, `/om` och `/barn/demo` direkt och ladda om.
2. I barnvyn: välj uppdrag → starta → Jag är klar → bekräfta. Kontrollera
   status under Mitt lov. Prova avatar, demoverktyg, belöning och återställning.
3. Ladda om: demoändringar finns kvar i fliken när sessionStorage tillåts.
   Blockerad lagring får inte krascha demon.
4. Kontrollera att inga `/api/`-anrop sker i nätverkspanelen.
5. `/api/state`, `/api/action`, `/server/index.js` och en obefintlig adress
   ska ge 404. `/barn#exempeltoken` ska inte anropa något API.
6. Kontrollera mobilbredd och tangentbordsnavigation. Inga kontoknappar eller
   betalningsflöden ska vara tillgängliga, och demoläget ska vara tydligt.

Lokal Vite-preview använder SPA-fallback. Verifiera därför HTTP-status för
okända adresser på Vercel-preview, inte enbart med `vite preview`.

Fullständig familjetjänst kräver separat arbete enligt `LAUNCH.md`, inklusive
databasadapter och verifierad inloggning. Denna demo löser inte den migreringen.
