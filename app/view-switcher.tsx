import {UserRound,Compass} from 'lucide-react';

/** Preview navigation never changes authentication or permissions. */
export default function ViewSwitcher({view}:{view:'parent'|'demo'}){
 return <aside className="view-context" aria-label="Vy och förhandsvisning">
  <div className="view-context-inner">
   <nav className="view-switcher" aria-label="Välj vy i testmiljön">
    <a href="/" aria-current={view==='parent'?'page':undefined}><UserRound size={18} aria-hidden/>Föräldravy</a>
    <a href="/barn/demo" aria-current={view==='demo'?'page':undefined}><Compass size={18} aria-hidden/>Barnvy <span>Demo</span></a>
   </nav>
   <p>{view==='parent'?'Här planerar du uppdrag, bestämmer belöningar och godkänner.':'Du provar Sams exempelvy. Din familjs uppdrag påverkas inte.'}</p>
   {view==='demo'&&<a className="preview-return" href="/">← Tillbaka till föräldravyn</a>}
  </div>
 </aside>
}
