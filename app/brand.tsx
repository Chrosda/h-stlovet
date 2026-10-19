import { ArrowRight, BookOpen, Footprints, Gift } from 'lucide-react';

export function WelcomeHero({ onStart, publicDemo = false }: { onStart?: () => void; publicDemo?: boolean }) {
  return <section className="lov-welcome" aria-labelledby="welcome-title">
    <div className="lov-welcome-copy">
      <span className="eyebrow">Gör plats för lovet · 8–14 år</span>
      <h1 id="welcome-title">Mindre tjat.<br />Mer höstlov.</h1>
      <p>En bra bok. En ny stig. En stund tillsammans. Du sätter ramarna, barnet väljer nästa äventyr.</p>
      <div className="lov-welcome-actions">
        {onStart ? <button className="btn" onClick={onStart}>Skapa ert höstlov <ArrowRight size={18} aria-hidden="true" /></button> : <a className="btn" href="/barn/demo">Prova barnvyn <ArrowRight size={18} aria-hidden="true" /></a>}
        <a className="btn light" href={publicDemo ? '/om' : '/barn/demo'}>{publicDemo ? 'Om demon' : 'Prova barnvyn'}</a>
      </div>
      <span className="lov-test-note">{publicDemo ? 'Prova med Sams exempel. Inga köp eller utskick.' : 'Prova med exempel. Inga riktiga pengar dras.'}</span>
    </div>
    <div className="lov-welcome-visual">
      <img className="lov-autumn-photo" src="/autumn.webp" alt="Två barn upptäcker en stig bland höstlöven" width={640} height={480} fetchPriority="high" />
      <div className="lov-moment"><BookOpen size={25} aria-hidden="true" /><span>En lässtund.<br /><strong>En fikapaus att se fram emot.</strong></span><img src="/rewards/fika.png" alt="" width={94} height={78} /></div>
    </div>
    {!publicDemo && <div className="lov-mini-steps" aria-label="Så fungerar Höstlovet">
      <article><span className="lov-step-icon"><BookOpen size={23} aria-hidden="true" /></span><div><h2>Välj tillsammans</h2><p>Planera uppdrag som passar er.</p></div></article>
      <article><span className="lov-step-icon"><Footprints size={23} aria-hidden="true" /></span><div><h2>Låt barnet ta nästa steg</h2><p>Barnet gör uppdraget i sin takt.</p></div></article>
      <article><span className="lov-step-icon"><Gift size={23} aria-hidden="true" /></span><div><h2>Fira det som blev gjort</h2><p>Du godkänner, belöningen väntar.</p></div></article>
    </div>}
  </section>;
}

export function BrandFooter() {
  return <footer className="brand-footer">
    <div className="brand-footer-intro"><a href="/start" className="brand">höstlovet.se</a><p>Ett lov med mer av det som känns bra.</p></div>
    <nav aria-label="Information"><a href="/start">Så fungerar det</a><a href="/om">Om testversionen</a></nav>
    <div className="brand-footer-issuer"><span>Belöningar via</span><img src="/mobila-presentkort-lime.svg" alt="Mobila Presentkort" width={200} height={43} /><span>En tjänst från Clearon</span></div>
  </footer>;
}
