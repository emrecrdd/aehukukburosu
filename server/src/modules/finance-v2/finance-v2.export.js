import fs from 'node:fs';

const transactionLabels={receipt:'Tahsilat',expense:'Gider',refund:'İade',transfer_in:'Transfer Girişi',transfer_out:'Transfer Çıkışı',reversal:'Ters Kayıt'};
const directionLabels={in:'Giriş',out:'Çıkış'};
const statusLabels={draft:'Taslak',posted:'İşlendi',reversed:'Ters Kaydedildi',cancelled:'İptal'};

const dateTR=(value)=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Istanbul'}).format(new Date(value)):'';
const dateOnlyTR=(value)=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Europe/Istanbul'}).format(new Date(`${String(value).slice(0,10)}T12:00:00Z`)):'';
const amountNumber=(value)=>{const n=Number(value||0);return Number.isFinite(n)?n:0;};
const amountTR=(value)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}).format(amountNumber(value));

const cleanUserText=(value)=>{
  let text=String(value??'').trim();
  if(!text) return '';
  // Tek başına kalmış açılış tırnaklarını exportta göstermeyelim.
  if(text.startsWith('“')&&!text.includes('”')) text=text.slice(1).trimStart();
  if(text.startsWith('„')&&!text.includes('“')) text=text.slice(1).trimStart();
  return text;
};

const exportDescription=(value)=>{
  const text=cleanUserText(value);
  if(/^legacy finans hareketi$/i.test(text)) return 'Aktarılan finans kaydı';
  return text;
};

const exportAccountName=(value)=>{
  const text=cleanUserText(value);
  if(/^legacy geçiş hesabı(?:\s*\(.*\))?$/i.test(text)) return 'Aktarım Hesabı';
  return text.replace(/^Legacy Geçiş Hesabı/i,'Aktarım Hesabı');
};

export const ledgerExportRows=(rows=[])=>rows.map(r=>({
  reference:cleanUserText(r.reference_no),
  date:dateTR(r.transaction_date),
  type:transactionLabels[r.transaction_type]||cleanUserText(r.transaction_type),
  direction:directionLabels[r.direction]||cleanUserText(r.direction),
  amount:amountNumber(r.amount),
  currency:cleanUserText(r.currency),
  accountCode:cleanUserText(r.account_code),
  accountName:exportAccountName(r.account_name),
  status:statusLabels[r.status]||cleanUserText(r.status),
  description:exportDescription(r.description),
  externalReference:cleanUserText(r.external_reference),
}));

export async function ledgerToXlsx(rows=[]){
  const ExcelJS=(await import('exceljs')).default;
  const workbook=new ExcelJS.Workbook();
  workbook.creator='Derkenar';
  workbook.created=new Date();
  const sheet=workbook.addWorksheet('Finans Hareketleri',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns=[
    {header:'Referans No',key:'reference',width:24},{header:'Tarih',key:'date',width:19},
    {header:'İşlem Türü',key:'type',width:18},{header:'Yön',key:'direction',width:11},
    {header:'Tutar',key:'amount',width:16,style:{numFmt:'#,##0.00'}},{header:'Para Birimi',key:'currency',width:13},
    {header:'Hesap Kodu',key:'accountCode',width:18},{header:'Hesap Adı',key:'accountName',width:26},
    {header:'Durum',key:'status',width:18},{header:'Açıklama',key:'description',width:42},
    {header:'Harici Referans',key:'externalReference',width:22},
  ];
  sheet.addRows(ledgerExportRows(rows));
  const header=sheet.getRow(1);
  header.font={bold:true,color:{argb:'FFFFFFFF'}};
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1F2937'}};
  header.alignment={vertical:'middle',horizontal:'center'};
  header.height=24;
  sheet.autoFilter={from:'A1',to:'K1'};
  sheet.eachRow((row,rowNumber)=>{
    if(rowNumber>1) row.alignment={vertical:'middle',wrapText:true};
  });
  sheet.getColumn('amount').alignment={horizontal:'right',vertical:'middle'};
  return workbook.xlsx.writeBuffer();
}

const pdfFont=()=>{
  const candidates=[process.env.FINANCE_PDF_FONT_PATH,'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf','/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf'].filter(Boolean);
  return candidates.find(p=>fs.existsSync(p))||null;
};

export async function ledgerToPdf(rows=[],filters={}){
  const PDFDocument=(await import('pdfkit')).default;
  const font=pdfFont();
  if(!font){const e=new Error('PDF için Unicode font bulunamadı. Sunucuda FINANCE_PDF_FONT_PATH ile Noto Sans veya DejaVu Sans TTF yolu tanımlayın.');e.statusCode=500;throw e;}
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:32,bufferPages:true,autoFirstPage:true});
  doc.registerFont('DerkenarUnicode',font);
  doc.font('DerkenarUnicode');
  const chunks=[];
  doc.on('data',c=>chunks.push(c));
  const done=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});

  doc.fontSize(18).text('DERKENAR — Finans Hareketleri Raporu');
  const period=filters.from||filters.to
    ? `${dateOnlyTR(filters.from)||'…'} – ${dateOnlyTR(filters.to)||'…'}`
    : 'Tüm dönem';
  doc.moveDown(.3).fontSize(9).text(`Dönem: ${period}   |   Oluşturulma: ${dateTR(new Date())}`);
  doc.moveDown(.8);

  const cols=[
    ['Referans',124],['Tarih',82],['Tür',78],['Yön',42],['Tutar',68],['PB',28],['Hesap',108],['Durum',78],['Açıklama',168],
  ];
  const tableWidth=cols.reduce((s,c)=>s+c[1],0);
  const startX=doc.page.margins.left;
  let y=doc.y;

  const drawHeader=()=>{
    let x=startX;
    doc.fontSize(8);
    for(const [h,w] of cols){doc.text(h,x,y,{width:w,lineBreak:false});x+=w;}
    doc.moveTo(startX,y+13).lineTo(startX+tableWidth,y+13).stroke();
    y+=18;
  };
  const ensure=(h=24)=>{
    const maxY=doc.page.height-doc.page.margins.bottom-14;
    if(y+h>maxY){doc.addPage();y=doc.page.margins.top;drawHeader();}
  };

  drawHeader();
  for(const r of ledgerExportRows(rows)){
    const values=[r.reference,r.date,r.type,r.direction,amountTR(r.amount),r.currency,`${r.accountCode} ${r.accountName}`.trim(),r.status,r.description];
    const heights=values.map((v,i)=>{
      if(i===0) return 10;
      return doc.heightOfString(String(v||''),{width:cols[i][1]-4});
    });
    const h=Math.max(18,...heights)+5;
    ensure(h);
    let x=startX;
    values.forEach((v,i)=>{
      const options={width:cols[i][1]-4,height:h-2,ellipsis:true};
      if(i===0) options.lineBreak=false;
      doc.fontSize(i===0?6.6:7.5).text(String(v||''),x,y,options);
      x+=cols[i][1];
    });
    y+=h;
    doc.moveTo(startX,y-2).lineTo(startX+tableWidth,y-2).opacity(.12).stroke().opacity(1);
  }

  const range=doc.bufferedPageRange();
  for(let i=0;i<range.count;i++){
    doc.switchToPage(range.start+i);
    const footerY=doc.page.height-doc.page.margins.bottom-10;
    doc.fontSize(7).text(`Sayfa ${i+1} / ${range.count}`,0,footerY,{align:'center',lineBreak:false});
  }
  doc.end();
  return done;
}
