# Återstående arbete inför lansering

## Vercel och egen domän

1. Anpassa bygg- och serverlagret från Vinext/Workers till en Vercel-kompatibel runtime.
2. Implementera PostgreSQL-adapter, migreringar, atomiska transaktioner och tester mot PostgreSQL.
3. Ersätt plattformsheaders med verifierad föräldrainloggning, exempelvis Google. Behåll separata barnsessioner och återkallbara engångslänkar.
4. Lägg hemligheter i servermiljön. Konfigurera returadresser, domän, TLS och produktionscookies.
5. Lägg orderhantering i en beständig bakgrundskö, oberoende av att föräldravyn är öppen.
6. Kontrollera familje- och rollisolering på separata enheter. Inför separat adminbehörighet, backup, övervakning och ekonomisk avstämning.

## Beslutad riktning för ClearOn KS

- ClearOn KS API ska skapa kupongerna.
- Produktägaren sätter upp erbjudanden och tillåtna kombinationer i KS.
- ClearOn skickar SMS. En separat skarp SMS-tjänst i appen behövs därför inte för kupongutskicken.
- Statusuppdateringar från KS ska tas emot av backend och visas som en tidslinje i admin.
- Utfärdad kupong, levererat SMS, inlöst kupong och utgången kupong är olika händelser.

KS API-dokumentation, autentisering, testmiljö, testerbjudande och händelsekontrakt saknas fortfarande.
Idempotens, annullering, statusuppslag och avstämning måste bekräftas med KS.
Vid oklart beställningsresultat får appen inte blint beställa på nytt: stäm av status
eller lämna till manuell kontroll. Verifiera callbacks enligt KS dokumentation och
hantera dubbletter, återspelning och händelser som kommer i fel ordning.

## Pengar och villkor

Nuvarande budget är en testsimulering. Skarp betalning kräver providerintegration,
verifierade betalningshändelser och fastställda villkor för avgifter, outnyttjade belopp
och återbetalningar. Visa en belöning som levererad/använd bara när rätt händelse finns.

## Aktuell källkod

Statuskedjan omfattar Assigned → Selected → Started → Claimed → Approved → Issuing → Delivered,
samt Rejected, Failed och ManualReview. Egna familjebelöningar använder ingen kupongorder.
Barnets demo lagras lokalt i sessionStorage. Verkliga testfamiljers uppgifter lagras i D1.
Uppdragsdetaljer, egna förslag och avatarer ligger i tabeller tillagda i migrering 0003.

GitHub-importen innehåller inga kunduppgifter eller hemligheter. Dokumentation av en
planerad integration innebär inte att den är implementerad.
