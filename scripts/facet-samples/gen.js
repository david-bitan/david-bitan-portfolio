global.window = {}; require('./data.js');
const d = window.FACET_DATA.build(new Date(2026, 9, 31));
const up = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const SUB = new Set(['Streamio','Sonora Music','Fibra Box','Orbis Mobile','Club Forme Lisière','Nuage Plus','Volta Énergie','Assurance Ilot']);
const out = d.tx.map((t) => {
  const [y, m, dd] = t.d.split('-'); let lab;
  if (t.c === 'income') lab = t.note === 'salary' ? 'VIR SEPA SALAIRE ATELIER NORREL' : t.note === 'bonus' ? 'VIR SEPA PRIME ATELIER NORREL' : 'VIR RECU REMBOURSEMENT MAISON BRISK';
  else if (t.note === 'rent') lab = 'PRLV SEPA RESIDENCE CALVANE LOYER';
  else if (SUB.has(t.m)) lab = 'PRLV SEPA ' + up(t.m);
  else if (t.m === 'Pass Métro Urbain') lab = 'PRLV PASS METRO URBAIN';
  else lab = `CARTE X4821 ${dd}/${m} ${up(t.m)}`;
  return { d: t.d, lab, a: t.a, c: t.c, m: t.m };
}).reverse();
require('fs').writeFileSync(__dirname + '/tx.json', JSON.stringify(out));
console.log(out.length, out[0], out[out.length-1].d);
