import { createRoot } from "react-dom/client";
import { ArrowRight, BookOpen, Leaf, UsersRound } from "lucide-react";
import ChildExperience from "../app/child-experience";
import "../app/globals.css";
import "./public-demo.css";

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const demoHref = "/barn/demo";

function DemoLink() {
  return <a className="btn" href={demoHref}>Testa barnvyn <ArrowRight size={18} aria-hidden="true" /></a>;
}

function PublicSite() {
  const about = path === "/om";
  const landing = path === "/" || path === "/start";
  return <div className="public-site">
    <a className="skip" href="#main">Hoppa till innehållet</a>
    <header className="public-header">
      <a className="brand" href="/">höstlovet.se</a>
      <nav aria-label="Huvudmeny">
        <a href="/" aria-current={landing ? "page" : undefined}>Så funkar det</a>
        <a href="/om" aria-current={about ? "page" : undefined}>Om demon</a>
        <DemoLink />
      </nav>
    </header>
    <div className="demo-ribbon">Publik demo · inga konton, betalningar, presentkort eller SMS.</div>
    <main className="container" id="main">
      {landing ? <>
        <section className="public-hero">
          <div>
            <p className="eyebrow">För små och stora loväventyrare · 8–14 år</p>
            <h1>Mindre tjat.<br />Mer läsning,<br />rörelse och kul.</h1>
            <p>En bra bok, en ny stig eller en stund med en kompis. Upptäck hur roliga uppdrag och små belöningar kan göra plats för ett höstlov att minnas.</p>
            <DemoLink />
            <p className="small">Prova med Sams exempeluppdrag. Inget konto behövs.</p>
          </div>
          <img src="/autumn.webp" alt="Två barn på upptäcktsfärd i höstskogen" width="900" height="900" />
        </section>
        <section className="public-steps" aria-labelledby="steps-heading">
          <h2 id="steps-heading">Så är Höstlovet tänkt att fungera</h2>
          <div className="steps">
            <article className="panel"><BookOpen aria-hidden="true" /><h3>1. Välj tillsammans</h3><p>Hitta uppdrag inom läsning, rörelse och gemenskap. Anpassa efter barnets intressen och dagsform.</p></article>
            <article className="panel"><Leaf aria-hidden="true" /><h3>2. Låt barnet ta nästa steg</h3><p>I barnvyn går det att välja och starta ett uppdrag och markera det som klart. Det kan du prova redan nu.</p></article>
            <article className="panel"><UsersRound aria-hidden="true" /><h3>3. Fira det som blev gjort</h3><p>Tanken är att den vuxne godkänner och ordnar belöningen. I demon kan du simulera detta med demoverktygen – inget skickas.</p></article>
          </div>
        </section>
        <section className="panel public-callout"><h2>Nyfiken på barnets upplevelse?</h2><p>Välj en avatar, prova ett uppdrag och öppna ett belöningskuvert. Allt är exempel, utan riktiga köp eller utskick.</p><DemoLink /></section>
      </> : about ? <section className="public-info">
        <p className="eyebrow">Om den publika demon</p><h1>Prova känslan av Höstlovet.</h1>
        <p>Det här är en demonstration av idén och barnets upplevelse, inte en lanserad familjetjänst.</p>
        <h2>Det går att prova</h2><p>Sams exempeluppdrag, avatarer, klarmarkering och belöningskuvert. Under Demoverktyg kan du själv simulera godkännande och leverans eller återställa allt.</p>
        <h2>Det är inte aktiverat</h2><p>Föräldrakonton, egna barnprofiler, personliga barnlänkar, serverlagring, betalningar, kupongutfärdande och SMS. Belöningsbilderna visar exempel, inte erbjudanden som kan köpas eller lösas in.</p>
        <h2>Dina uppgifter</h2><p>Inga familjeuppgifter skickas till en databas. Demoändringar sparas tillfälligt i webbläsarfliken, om webbläsaren tillåter det. Använd påhittade uppgifter även i egna uppdragsförslag. Du kan rensa dem med Återställ demo. Webbhotellet kan behandla tekniska uppgifter om besöket, och typsnitt hämtas från Google Fonts.</p>
        <DemoLink />
      </section> : <section className="public-info">
        <p className="eyebrow">Publik demo</p><h1>Den här funktionen är inte aktiverad.</h1>
        <p>Konton, personliga barnlänkar och administration ingår inte i den publika demon. Här kan du i stället prova barnets vy med exempeldata.</p>
        <DemoLink /><p><a className="textlink" href="/">Till startsidan</a></p>
      </section>}
      <footer className="footer"><a className="brand" href="/">höstlovet.se</a><span>Ett höstlov med lite mer av det som känns bra.</span><a className="textlink" href="/om">Om demon och dina uppgifter</a></footer>
    </main>
  </div>;
}

// No authentication, backend or personal-link handling in this build.
createRoot(document.getElementById("root")!).render(
  path === demoHref ? <ChildExperience demo publicDemo /> : <PublicSite />,
);
