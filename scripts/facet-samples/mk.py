import json, datetime
from openpyxl import Workbook
from openpyxl.styles import Font
tx=json.load(open('tx.json'))
OUT='../../public/demo/facet/samples/'  # run from scripts/facet-samples, after: node gen.js
BANKCAT={'home':'Logement','groceries':'Alimentation','dining':'Restaurants & bars','transport':'Transports','subscriptions':'Abonnements & téléphonie','leisure':'Loisirs & sorties','health':'Santé','shopping':'Shopping','income':'Revenus'}
fr=lambda a: ('%.2f'%a).replace('.',',')
# 1. CSV export, French bank, 13 months, with the bank's own categories
L=['Banque Aubépine;Export des opérations','Compte courant;FR76 •••• •••• •••• 4821','Titulaire;Camille Martin','Période;01/10/2025 au 31/10/2026','','Date;Libellé;Montant (EUR);Catégorie']
for t in reversed(tx):
  y,m,d=t['d'].split('-'); L.append(f"{d}/{m}/{y};{t['lab']};{fr(t['a'])};{BANKCAT[t['c']]}")
open(OUT+'banque-aubepine-export.csv','w',encoding='utf-8-sig',newline='').write('\r\n'.join(L)+'\r\n')
# 2. Excel budget sheet, English, 6 months, no categories, real date cells
wb=Workbook(); ws=wb.active; ws.title='Transactions'
ws.append(['My account, May to October 2026']); ws['A1'].font=Font(bold=True,size=13); ws.append([])
ws.append(['Date','Description','Amount']); 
for c in 'ABC': ws[c+'3'].font=Font(bold=True)
for t in tx:
  if t['d']<'2026-05-01': continue
  ws.append([datetime.date.fromisoformat(t['d']), t['lab'].replace('CARTE X4821','CARD').replace('PRLV SEPA','DIRECT DEBIT').replace('PRLV','DIRECT DEBIT').replace('VIR SEPA SALAIRE','TRANSFER IN SALARY').replace('VIR SEPA PRIME','TRANSFER IN BONUS').replace('VIR RECU REMBOURSEMENT','REFUND'), t['a']])
  ws.cell(ws.max_row,1).number_format='DD/MM/YYYY'; ws.cell(ws.max_row,3).number_format='#,##0.00'
ws.column_dimensions['A'].width=12; ws.column_dimensions['B'].width=48; ws.column_dimensions['C'].width=12
wb.save(OUT+'my-budget-2026.xlsx')
# 3. PDF statement, 3 months, debit and credit columns
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
c=canvas.Canvas(OUT+'releve-aout-octobre-2026.pdf',pagesize=A4); W,H=A4
rows=[t for t in tx if '2026-08-01'<=t['d']<='2026-10-31']
bal=1840.25; start=bal
def head(page):
  c.setFont('Helvetica-Bold',14); c.drawString(40,H-50,'Banque Aubépine')
  c.setFont('Helvetica',9); c.drawString(40,H-66,'Relevé de compte courant · Camille Martin · FR76 •••• •••• •••• 4821')
  c.drawString(40,H-79,'Période du 01/08/2026 au 31/10/2026'); c.drawRightString(W-40,H-50,f'Page {page}')
  c.setFont('Helvetica-Bold',9); y=H-108
  c.drawString(40,y,'Date'); c.drawString(100,y,'Opération'); c.drawRightString(W-130,y,'Débit'); c.drawRightString(W-40,y,'Crédit')
  c.line(40,y-5,W-40,y-5); return y-20
page=1; y=head(page); c.setFont('Helvetica',9)
c.drawString(100,y,'SOLDE AU 01/08/2026'); c.drawRightString(W-40,y,fr(start)); y-=15
for t in rows:
  if y<70:
    c.showPage(); page+=1; y=head(page); c.setFont('Helvetica',9)
  yy,m,d=t['d'].split('-'); c.drawString(40,y,f'{d}/{m}'); c.drawString(100,y,t['lab'])
  if t['a']<0: c.drawRightString(W-130,y,fr(-t['a']))
  else: c.drawRightString(W-40,y,fr(t['a']))
  bal+=t['a']; y-=15
c.setFont('Helvetica-Bold',9); c.drawString(100,y-4,'SOLDE AU 31/10/2026'); c.drawRightString(W-40,y-4,fr(bal))
c.save(); print(len(rows), round(bal,2), page)
