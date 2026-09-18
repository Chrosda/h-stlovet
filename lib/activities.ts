export const activityGroups = ['Läs & upptäck', 'Ut & rör på dig', 'Lovträning & läger', 'Kompisar & egna initiativ'] as const;
export type Activity = { id: string; group: number; title: string; instructions: string; duration: string; museum?: boolean };
export const activities: Activity[] = [
  {id:'read',group:0,title:'Läs på ditt sätt',duration:'20 minuter',instructions:'Välj en bok, serietidning eller ljudbok. Läs eller lyssna i 20 minuter.'},
  {id:'learn',group:0,title:'Lär mig något',duration:'I din takt',instructions:'Välj något du är nyfiken på. Ta reda på tre saker och berätta för din vuxen.'},
  {id:'museum',group:0,title:'Upptäck ett museum',duration:'Ett besök',museum:true,instructions:'Välj något på museet som fångar ditt intresse. Berätta efteråt vad som var spännande, konstigt eller oväntat.'},
  {id:'culture',group:0,title:'Kultur på ditt sätt',duration:'En utflykt',instructions:'Välj tillsammans med din vuxen: ett bibliotek, en utställning, ett museum eller en lovföreställning. Berätta efteråt om något du fastnade för.'},
  {id:'route',group:1,title:'Upptäck en ny väg',duration:'30 minuter',instructions:'Ta en promenad i 30 minuter på en väg du och din vuxen har kommit överens om.'},
  {id:'leaves',group:1,title:'Lövrundan',duration:'Ungefär 3 km',instructions:'Ta en promenad på ungefär 3 km. Bestäm med din vuxen var du går och vem du går med.'},
  {id:'forest',group:1,title:'Ut i skogen',duration:'I din takt',instructions:'Ta en skogspromenad och hitta tre hösttecken. Bestäm med din vuxen var ni går.'},
  {id:'camp',group:2,title:'Dagens lägerpass',duration:'Ett pass',instructions:'Var med på dagens träning eller lägeraktivitet. Anpassa efter hur du mår och vad ledaren säger.'},
  {id:'training',group:2,title:'Dagens träning',duration:'Ett pass',instructions:'Var med på dagens träning. Det är deltagandet som räknas, inte resultatet. Prata med din vuxen om du behöver vila.'},
  {id:'new-sport',group:2,title:'Testa något nytt',duration:'Ett prova-på-pass',instructions:'Prova en aktivitet på lovet som du är nyfiken på – kanske dans, klättring eller en ny sport. Bestäm aktiviteten med din vuxen.'},
  {id:'ready',group:2,title:'Redo för träning',duration:'Inför passet',instructions:'Packa det du behöver och fyll vattenflaskan inför dagens aktivitet.'},
  {id:'teammate',group:2,title:'En schysst lagkompis',duration:'Under dagens aktivitet',instructions:'Bjud in någon i gemenskapen eller peppa en kompis under dagens aktivitet.'},
  {id:'teach',group:2,title:'Lär din vuxen',duration:'Efter träningen',instructions:'Visa eller berätta om något du har lärt dig på träningen eller lägret.'},
  {id:'snack',group:3,title:'Fixa mellanmålet',duration:'I din takt',instructions:'Välj ett mellanmål och gör i ordning det. Bestäm med din vuxen vad du får använda.'},
  {id:'friends',group:3,title:'Dra ihop ett häng',duration:'En stund tillsammans',instructions:'Föreslå en aktivitet med en kompis. Stäm av planen med din vuxen.'},
  {id:'games',group:3,title:'Spelhänget',duration:'En spelstund',instructions:'Bjud över en kompis och spela något tillsammans. Bestäm tid och plats med din vuxen.'},
  {id:'idea',group:3,title:'Din egen idé',duration:'Ni bestämmer',instructions:'Vad vill du göra? Föreslå ett uppdrag för din vuxen. Kom överens om vad du ska göra och om belöningen innan du börjar.'},
];
