// Prototype logic (vanilla JS), mounted by App.jsx once the markup is in the DOM.
export function initPrototype() {
const PLANS = {
  v401k: {
    name:'Family Health of Five 401(k) Plan', planId:'401K-08812', avail:48762.35, vested:46811.86, participant:'Family Health of Five Ltd.',
    // Holdings priced at the 10/15/2026 close. units = balance / NAV
    investments:[
      {name:'Vanguard Target Retirement 2050 Fund', ticker:'VFIFX', cusip:'92202E607', balance:21438.90, units:366.9787},
      {name:'Vanguard 500 Index Admiral', ticker:'VFIAX', cusip:'922908710', balance:12846.15, units:20.9784},
      {name:'PIMCO Total Return Instl', ticker:'PTTRX', cusip:'693390700', balance:6215.40, units:701.5124, rule:{type:'fee', pct:2, msg:'Short-term redemption fee: 2.00% on shares bought in the last 90 days.'}},
      {name:'Vanguard Federal Money Market', ticker:'VMFXX', cusip:'922906300', balance:4812.75, units:4812.7500},
      {name:'Fidelity Contrafund', ticker:'FCNTX', cusip:'316071109', balance:3449.15, units:156.0701},
    ],
    // Money types. Employer match is 80% vested (4 of 5 years of service)
    sources:[
      {name:'Employee pre-tax deferral', balance:29257.41},
      {name:'Roth deferral', balance:7314.35},
      {name:'Employer match', balance:9752.47},
      {name:'Rollover', balance:2438.12},
    ]
  }
};
// Plan fund lineup — what money can be moved into
const LINEUP = [
  {name:'Vanguard Target Retirement 2050 Fund', ticker:'VFIFX', cusip:'92202E607', cls:'Target date'},
  {name:'Vanguard 500 Index Admiral', ticker:'VFIAX', cusip:'922908710', cls:'Equity'},
  {name:'PIMCO Total Return Instl', ticker:'PTTRX', cusip:'693390700', cls:'Fixed income'},
  {name:'Vanguard Federal Money Market', ticker:'VMFXX', cusip:'922906300', cls:'Money market'},
  {name:'Fidelity Contrafund', ticker:'FCNTX', cusip:'316071109', cls:'Equity', rule:{type:'fee', msg:'Closes to new money on 12/31/2026. Existing holdings can stay.'}},
  {name:'Vanguard Total Intl Stock Index Admiral', ticker:'VTIAX', cusip:'921909818', cls:'International equity', rule:{type:'block', msg:'Round-trip limit: Kevin moved out of this fund on 09/22/2026. Transfers in are blocked until 10/22/2026.'}},
  {name:'American Funds Growth Fund of America R6', ticker:'RGAGX', cusip:'399874825', cls:'Equity'},
  {name:'Vanguard Total Bond Market Index Admiral', ticker:'VBTLX', cusip:'921937603', cls:'Fixed income'},
  {name:'Vanguard Mid-Cap Index Admiral', ticker:'VIMAX', cusip:'922908645', cls:'Equity'},
  {name:'Vanguard Target Retirement 2040 Fund', ticker:'VFORX', cusip:'92202E805', cls:'Target date'},
  {name:'Vanguard Target Retirement 2060 Fund', ticker:'VTTSX', cusip:'92202E862', cls:'Target date'},
  {name:'T. Rowe Price Blue Chip Growth I', ticker:'TBCIX', cusip:'77954Q403', cls:'Equity'},
];
const L = Object.fromEntries(LINEUP.map(f=>[f.ticker,f]));
const S = {plan:'', method:'investment', by:'percentage', saved:{}, view:'edit', edit:null, q:''};
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const m$ = n => '$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const mU = n => n.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});

function tip(t){ return `<span class="tip" tabindex="0" role="note" aria-label="${esc(t)}" data-tip="${esc(t)}">i</span>`; }
function seg(name, current, opts, dis){
  return `<div class="seg ${dis?'dis':''}" role="group">${opts.map(([v,l])=>`<button type="button" data-${name}="${v}" aria-pressed="${current===v}" ${dis?'disabled':''}>${l}</button>`).join('')}</div>`;
}

function render(){
  const p = PLANS[S.plan];
  $('#avail').textContent = p ? m$(p.avail) : '';
  $('#vested').textContent = p ? m$(p.vested) : '';
  $('#participant').textContent = p ? p.participant : '';
  $('#planSel').disabled = S.view!=='edit';
  $('#cancelBtn').hidden = S.view!=='edit';
  document.querySelector('.planbar').hidden = S.view==='summary';
  $('#backEditBtn').hidden = S.view!=='summary';
  $('#submitBtn').hidden = S.view==='done';
  $('#pTitle').textContent = S.view==='summary'?'Transfer Summary':S.view==='done'?'Transfer Request':'New Transfer Request';
  $('#submitBtn').textContent = S.view==='summary'?'Submit':'Next';
  $('#submitBtn').disabled = !Object.keys(S.saved).some(k=>k.startsWith(S.method+':'));
  renderSteps(); saveDraft();
  if(!p){ $('#work').innerHTML='<div class="hintbox">Select a plan to see the investments you can transfer.</div>'; return; }
  if(S.view!=='edit'){ $('#work').innerHTML = renderSummary(p);
    if(S.submitted){ $('#submitBtn').disabled=true; $('#submitBtn').textContent='Submitted'; $('#backEditBtn').hidden=true; document.querySelectorAll('[data-sedit]').forEach(b=>b.hidden=true); } if(S.view==='summary' && S.needAck && !S.ack) $('#submitBtn').disabled=true; return; }

  const isInv = true; // table always lists investments, whatever the method
  const rows = p.investments;
  // Projected balances after the saved transfers: money out of each source fund, money into each target
  const flow={}; rows.forEach((r,i)=>{ const sv=S.saved[key(i)]; if(!sv) return; const o=outOf(r,sv); flow[r.ticker]=(flow[r.ticker]||0)-o;
    if(isSrc()) srcRows(r).forEach((sr,j)=>{ const d=valueDollars(sr,(sv.srcVals||[])[j]); ((sv.srcT||[])[j]||[]).forEach(t=>flow[t.ticker]=(flow[t.ticker]||0)+d*(+t.pct)/100); });
    else sv.targets.forEach(t=>flow[t.ticker]=(flow[t.ticker]||0)+o*(+t.pct)/100); });
  const proj=r=>{ const d=r2(flow[r.ticker]||0); return {d, bal:r2(r.balance+d), units: r.units? (r.balance+d)/(r.balance/r.units) : 0}; };
  $('#work').innerHTML = `
    <div class="modes ${savedCount()?'is-locked':''}">
      <div><span class="lbl">Transfer by</span>${seg('by',S.by,[['percentage','Percentage'],['unit','Units'],['amount','Amount']])}</div>
      <div><span class="lbl">Source wise transfer</span>
        <label class="sw"><input type="checkbox" role="switch" aria-label="Source wise transfer" id="srcMode" ${isSrc()?'checked':''}><span class="sw-t" aria-hidden="true"></span></label></div>
    </div>
    
    <div class="count"><b>${String(rows.length).padStart(2,'0')}/${String(rows.length).padStart(2,'0')}</b> investments</div>
    <div class="tw"><table>
      <thead><tr><th>Investment name</th><th class="act-col">Action</th><th>Transfer to</th></tr></thead>
      <tbody>${rows.map((r,i)=>{ const sv=S.saved[key(i)]; const out=sv?outOf(r,sv):0;
        const lbl = sv ? (S.by==='percentage'? (+sv.value).toFixed(2)+'%' : S.by==='unit'? mU(+sv.value)+' units' : m$(+sv.value)) : '';
        return `<tr class="${sv?'has':''}">
        <td>${(()=>{ const pj=proj(r), bal=pj.d?pj.bal:r.balance, un=pj.d?pj.units:r.units; return `<div class="nm1">${esc(r.name)}${sv?`<span class="sellb">Sell</span>`:''}</div>
          <div class="inv-kv"><span>Account balance <b class="num">${m$(bal)}</b></span><span>Available units <b class="num">${mU(un)}</b></span></div>`; })()}</td>
        <td class="act-col"><button type="button" class="btn sm" data-edit="${i}" ${S.by?'':'disabled title="Select Transfer by first"'}>Edit</button></td>
        <td class="mvcell">${sv? (isSrc()? movedSummarySrc(r,i,sv,out) : movedSummary(r,i,sv,out)) : '<span class="sub">—</span>'}</td>
      </tr>`}).join('')}</tbody>
    </table></div>`;
}

const DRAFT_KEY='transfer-v4-draft:724010103';
function renderSteps(){ if(!$('#steps')) return;
  const st=[['Plan & settings', S.plan?'done':'cur'],
    ['Transfers', S.view!=='edit'?'done':S.plan?'cur':''],
    ['Review', S.view==='done'?'done':S.view==='summary'?'cur':''],
    ['Authorize & submit', S.view==='done'?'done':'']];
  $('#steps').innerHTML=`<h3>Transfer request</h3><ol>${st.map(([t,c],n)=>`<li class="${c?'is-'+c:''}" ${c==='cur'?'aria-current="step"':''}><span class="dot">${c==='done'?'✓':n+1}</span><div><div class="sn">Step ${n+1}</div><div class="st">${t}</div>${c==='done'?'<span class="chip">Completed</span>':''}</div></li>`).join('')}</ol>`;
}
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} $('#draftNote').textContent=''; }
function saveDraft(){
  if(S.view==='done'||S.submitted){ clearDraft(); return; }
  if(!S.plan || !Object.keys(S.saved).length){ $('#draftNote').textContent=''; return; }
  const t=new Date(); S.draftAt=t.getTime();
  try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({plan:S.plan,method:S.method,by:S.by,saved:S.saved,t:S.draftAt})); }catch(e){ return; }
  $('#draftNote').textContent='✓ Draft saved '+t.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
}
function offerResume(){
  let d=null; try{ d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null'); }catch(e){}
  if(!d || !d.plan || !Object.keys(d.saved||{}).length) return;
  const n=Object.keys(d.saved).length, at=new Date(d.t).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  $('#resume').innerHTML=`<div class="alert" role="region" aria-label="Unsubmitted draft"><span class="ai">!</span><div>You have an unsubmitted transfer for Kevin Thomas from <b>${at}</b> (${n} transfer${n>1?'s':''}).</div><div class="acts"><button class="link" type="button" data-resume>Resume</button><button class="link" type="button" data-discard>Discard</button></div></div>`;
  $('#resume').onclick=e=>{ const b=e.target.closest('button'); if(!b) return;
    if(b.hasAttribute('data-resume')){ Object.assign(S,{plan:d.plan,method:d.method,by:d.by,saved:d.saved,view:'edit'}); $('#planSel').value=d.plan; toast('Draft restored'); }
    else { clearDraft(); toast('Draft discarded'); }
    $('#resume').innerHTML=''; render(); };
}
/* Read-only slide-over: every investment this row moves into, as a table */
function openAll(i){
  const p=PLANS[S.plan], r=p.investments[i], sv=S.saved[key(i)]; if(!sv) return; const out=outOf(r,sv), prev=document.activeElement;
  const n=isSrc()? (sv.srcT||[]).reduce((a,t)=>a+t.length,0) : sv.targets.length;
  const host=document.createElement('div'); host.id='allHost';
  host.innerHTML=`<div class="scrim" data-aclose></div><aside class="drawer alld" role="dialog" aria-modal="true" aria-labelledby="aT">
    <div class="dh"><div style="flex:1"><h2 id="aT">Transfer details</h2></div>
      <div class="dh-acts"><button class="btn" type="button" data-aclose>Cancel</button><button class="btn pri" type="button" data-aedit>Edit</button></div></div>
    <div class="db"><table class="alltbl"><tbody>${isSrc()? movedBySource(r,i,sv) : movedByInv(r,i,sv,out)}</tbody></table></div></aside>`;
  document.body.appendChild(host);
  const close=()=>{ host.remove(); document.removeEventListener('keydown',esc_); prev&&prev.focus&&prev.focus(); };
  const esc_=e=>{ if(e.key==='Escape' && !modalOpen){ e.stopPropagation(); close(); } };
  document.addEventListener('keydown',esc_);
  host.addEventListener('click',e=>{ if(e.target.closest('[data-aclose]')) close(); else if(e.target.closest('[data-aedit]')){ close(); openDrawer(i); } });
  host.querySelector('[data-aedit]').focus();
}
/* Scalable summary: same 3-line shape whether it is 1 fund or 20, 1 source or 5.
   1) headline totals  2) one proportional bar  3) the top funds + "+N more" into the detail slide-over */
const SEG=['--s1','--s2','--s3','--s4','--s5','--s6'];
// Illustrative CUSIP and price for plan-lineup funds (prototype data)
function hsh(t){ let h=7; for(const c of t) h=(h*31+c.charCodeAt(0))%100000; return h; }
function fPid(){ const p=PLANS[S.plan]; return p.planId||String(100000+hsh(S.plan)%900000); }
function fMeta(f){ const p=PLANS[S.plan], h=p.investments.find(v=>v.ticker===f.ticker);
  return `<span class="fm">Balance: <b class="num">${m$(h?h.balance:0)}</b></span><span class="fm">Units: <b class="num">${mU(h&&h.units?h.units:0)}</b></span>`; }
function fHold(f){ const h=PLANS[S.plan].investments.find(v=>v.ticker===f.ticker); return h&&h.balance>0? `<div class="ic-hold">Currently holds ${m$(h.balance)}</div>` : ''; }
function fCusip(t){ const x=PLANS[S.plan].investments.find(v=>v.ticker===t)||L[t]; return x&&x.cusip? x.cusip : (String(hsh(t)).padStart(5,'0')+'T'+t.slice(0,3)).toUpperCase(); }
function fNav(t){ const x=PLANS[S.plan].investments.find(v=>v.ticker===t); return x&&x.units? x.balance/x.units : 10+hsh(t)%240; }
function movedSummary(r,i,sv,out){
  const acc={}; let nsrc=0;
  if(isSrc()) srcRows(r).forEach((sr,j)=>{ const d=valueDollars(sr,(sv.srcVals||[])[j]), ts=(sv.srcT||[])[j]||[]; if(!ts.length||!(d>0)) return; nsrc++; ts.forEach(t=>acc[t.ticker]=(acc[t.ticker]||0)+d*(+t.pct)/100); });
  else sv.targets.forEach(t=>acc[t.ticker]=(acc[t.ticker]||0)+out*(+t.pct)/100);
  const list=Object.entries(acc).map(([tk,d])=>({f:L[tk],d})).sort((a,b)=>b.d-a.d), tot=list.reduce((a,x)=>a+x.d,0)||1, n=list.length, TOP=2;
  const col=k=>`var(${SEG[Math.min(k,SEG.length-1)]})`;
  return `<div class="mc">
    <div class="mc-h"><span class="mc-k num"><b>${m$(out)}</b><span>${(out/r.balance*100).toFixed(2)}%</span><span>${mU(out/(r.balance/r.units))} units</span></span> transfer to ${n} investment${n>1?'s':''}</div>
    <div class="mc-row">${list.slice(0,TOP).map(x=>`<span class="mc-chip" title="${esc(x.f.name)} · ${m$(x.d)}"><span class="mc-n">${esc(x.f.name)}</span><span class="mc-p num">${S.by==='amount'?m$(x.d):S.by==='unit'?mU(x.d/fNav(x.f.ticker))+' units':(x.d/tot*100).toFixed(0)+'%'}</span></span>`).join('')}
      ${n>TOP?`<span class="mc-chip mc-more">+${n-TOP}</span>`:''}
      <button type="button" class="ms-more" data-all="${i}">View details</button></div>
  </div>`;
}
/* Source mode: one line per source so it's clear which source moves into which investments */
function movedSummarySrc(r,i,sv,out){
  const groups=srcRows(r).map((sr,j)=>({sr,j,d:valueDollars(sr,(sv.srcVals||[])[j]),ts:(sv.srcT||[])[j]||[]})).filter(g=>g.ts.length&&g.d>0);
  const n=new Set(groups.flatMap(g=>g.ts.map(t=>t.ticker))).size, TOP=2;
  return `<div class="mc">
    <div class="mc-h"><span class="mc-k num"><b>${m$(out)}</b><span>${groups.length} source${groups.length>1?'s':''}</span><span>${mU(out/(r.balance/r.units))} units</span></span> transfer to ${n} investment${n>1?'s':''}</div>
    <div class="mc-row">${groups.slice(0,TOP).map(g=>`<span class="mc-chip src" title="${esc(g.sr.name)} · ${m$(g.d)} into ${g.ts.length} investment${g.ts.length>1?'s':''}"><span class="mc-n">${esc(g.sr.name)}</span><span class="mc-p num">${lblV(+(sv.srcVals||[])[g.j]||0)}</span></span>`).join('')}
      ${groups.length>TOP?`<span class="mc-chip mc-more">+${groups.length-TOP}</span>`:''}
      <button type="button" class="ms-more" data-all="${i}">View details</button></div>
  </div>`;
}
/* Compact summary under a row: what is sold → chips for what it buys; extra ones collapse into "+N more" */
const CHIP_MAX=3;
function movedChips(r,i,sv,out){
  const groups = isSrc()
    ? srcRows(r).map((sr,j)=>({j,label:sr.name, d:valueDollars(sr,(sv.srcVals||[])[j]), ts:(sv.srcT||[])[j]||[]})).filter(g=>g.ts.length&&g.d>0)
    : [{label:r.name, d:out, ts:sv.targets}];
  return `<div class="mv">${groups.map(g=>`<div class="mv-row">
      ${isSrc()?`<span class="mv-src">${esc(g.label)} <b class="num">${m$(g.d)}</b></span>`:''}
      ${isSrc()?'<span class="mv-arrow" aria-label="moves into">&rarr;</span>':''}
      <span class="mv-chips">${g.ts.slice(0,CHIP_MAX).map(t=>{const f=L[t.ticker];return `<span class="mv-chip" title="${esc(f.name)}"><span class="mv-cn">${esc(f.name)}</span><span class="mv-cm num">${f.ticker} · ${lblV((+t.pct)*(isSrc()?(+(sv.srcVals||[])[g.j]||0):(+sv.value||0))/100)} · <b>${m$(g.d*(+t.pct)/100)}</b></span></span>`}).join('')}
      ${g.ts.length>CHIP_MAX?`<button type="button" class="mv-chip more" data-all="${i}" aria-label="Show all ${g.ts.length} investments">+${g.ts.length-CHIP_MAX} more</button>`:''}</span></div>`).join('')}</div>`;
}
/* Investment mode: the investment on the left, what it moves into on the right */
function movedByInv(r,i,sv,out){ const ts=sv.targets; let ZB=0;
  return `<tr class="moved"><td colspan="2"><div class="tw mini"><table><thead><tr><th>Sell Investment</th><th>Buy investment(s)</th><th class="r">Allocation</th><th class="r">Amount</th><th class="r"></th></tr></thead><tbody>
  ${ts.map((t,n)=>{const f=L[t.ticker];return `<tr class="${n===0?'grp':''} ${(ZB++)%2?'zb':''}">${n===0?`<td rowspan="${ts.length}" class="srccell"><div class="sc-n">${esc(r.name)}</div><div class="sc-a"><b class="num">${m$(out)}</b></div></td>`:''}
    <td><div class="nm1">${esc(f.name)}</div></td><td class="r num">${lblV((+t.pct)*(+sv.value||0)/100)}</td><td class="r num">${m$(out*(+t.pct)/100)}</td>
    <td class="r"><button class="iconbtn" type="button" data-mrm="${i}:${t.ticker}" aria-label="Remove ${esc(f.name)}" title="Remove">${ICON_TRASH}</button></td></tr>`}).join('')}
  <tr class="total"><td colspan="3">Total</td><td class="r num">${m$(out)}</td><td></td></tr>
  </tbody></table></div></td></tr>`;
}
/* Source mode: show added investments grouped under the source they came from */
function movedBySource(r,i,sv){ let ZB=0;
  const rows=srcRows(r).map((sr,j)=>({sr,j,ts:(sv.srcT||[])[j]||[],d:valueDollars(sr,(sv.srcVals||[])[j])})).filter(x=>x.ts.length&&x.d>0);
  return `<tr class="moved"><td colspan="2"><div class="tw mini"><table><thead><tr><th>Sell investment</th><th>Buy investment(s)</th><th class="r">Allocation</th><th class="r">Amount</th><th class="r"></th></tr></thead><tbody>
  ${rows.map(x=>x.ts.map((t,n)=>{const f=L[t.ticker];return `<tr class="${n===0?'grp':''} ${(ZB++)%2?'zb':''}">${n===0?`<td rowspan="${x.ts.length}" class="srccell"><div class="sc-n">${esc(x.sr.name)}</div><div class="sc-inv" title="${esc(r.name)}">${esc(r.name)}</div><div class="sc-a"><b class="num">${m$(x.d)}</b></div></td>`:''}
    <td><div class="nm1">${esc(f.name)}</div><div class="nm-src">${esc(x.sr.name)}</div></td><td class="r num">${lblV((+t.pct)*(+(sv.srcVals||[])[x.j]||0)/100)}</td><td class="r num">${m$(x.d*(+t.pct)/100)}</td>
    <td class="r"><button class="iconbtn" type="button" data-mrm="${i}:${t.ticker}:${x.j}" aria-label="Remove ${esc(f.name)}" title="Remove">${ICON_TRASH}</button></td></tr>`}).join('')).join('')}
  <tr class="total"><td colspan="3">Total</td><td class="r num">${m$(rows.reduce((a,x)=>a+x.d,0))}</td><td></td></tr>
  </tbody></table></div></td></tr>`;
}
// After removing an investment, keep the others in the same proportions, totalling 100%
function renorm(a){ if(!a.length) return; const sum=a.reduce((x,t)=>x+(+t.pct||0),0); let acc=0;
  const vals=a.map(t=>+t.pct||0); if(Math.max(...vals)-Math.min(...vals)<=0.02){ // was an even split: keep it even
    const b=Math.floor(10000/a.length)/100; a.forEach((t,n)=>t.pct=(n===a.length-1? r2(100-b*(a.length-1)) : b).toFixed(2)); return; }
  a.forEach((t,n)=>{ if(n<a.length-1){ const v=sum>0? Math.round((+t.pct||0)/sum*10000)/100 : Math.floor(10000/a.length)/100; t.pct=v.toFixed(2); acc+=v; } else t.pct=r2(100-acc).toFixed(2); }); }
function summaryBuyRows(r,sv,out){ let ZB=0;
  if(!isSrc()) return sv.targets.map(t=>{const f=L[t.ticker];return `<tr><td><div class="nm1">${esc(f.name)}</div></td><td>${f.cls}</td><td class="r num">${lblV((+t.pct)*(+sv.value||0)/100)}</td><td class="r num nm1">${m$(out*(+t.pct)/100)}</td></tr>`}).join('');
  return srcRows(r).map((sr,j)=>({sr,j,ts:(sv.srcT||[])[j]||[],d:valueDollars(sr,(sv.srcVals||[])[j])})).filter(x=>x.ts.length&&x.d>0)
    .map(x=>x.ts.map((t,n)=>{const f=L[t.ticker];return `<tr class="${n===0?'grp':''} ${(ZB++)%2?'zb':''}">${n===0?`<td rowspan="${x.ts.length}" class="srccell"><div class="sc-n">${esc(x.sr.name)}</div><div class="sc-inv" title="${esc(r.name)}">${esc(r.name)}</div><div class="sc-a"><b class="num">${m$(x.d)}</b></div></td>`:''}<td><div class="nm1">${esc(f.name)}</div><div class="nm-src">${esc(x.sr.name)}</div></td><td class="r num">${lblV((+t.pct)*(+(sv.srcVals||[])[x.j]||0)/100)}</td><td class="r num nm1">${m$(x.d*(+t.pct)/100)}</td></tr>`}).join('')).join('');
}
function reaggregate(r,sv){ const acc={}; let tot=0;
  srcRows(r).forEach((sr,j)=>{ const ts=sv.srcT[j]||[], d=valueDollars(sr,sv.srcVals[j]); if(!ts.length||!(d>0)) return; tot+=d; ts.forEach(x=>acc[x.ticker]=(acc[x.ticker]||0)+d*(+x.pct)/100); });
  sv.targets=Object.entries(acc).map(([ticker,d])=>({ticker,pct:(d/tot*100).toFixed(2)})); }

/* ---------- modal + toast ---------- */
let modalOpen=false;
function modal({title, body, ok='Continue', cancel='Keep editing', danger=false, icon='!', gate=null, onOk, onCancel}){
  const prev=document.activeElement, host=document.createElement('div'); host.className='mscrim'; modalOpen=true;
  host.innerHTML=`<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mT" aria-describedby="mB">
    <div class="mh"><div class="mi ${danger?'warn':''}">${icon}</div><h3 id="mT">${title}</h3></div>
    <div class="mb" id="mB">${body}</div>
    <div class="mf"><button class="btn" type="button" data-m="no">${cancel}</button><button class="btn pri ${danger?'danger':''}" type="button" data-m="ok">${ok}</button></div></div>`;
  document.body.appendChild(host);
  const okB=host.querySelector('[data-m="ok"]');
  const check=()=>{ if(gate) okB.disabled=!gate(host); }; check();
  host.addEventListener('input',check); host.addEventListener('change',check);
  const close=fire=>{ host.remove(); modalOpen=false; prev&&prev.focus&&prev.focus(); fire&&fire(); };
  host.addEventListener('click',e=>{ const m=e.target.closest('[data-m]'); if(e.target===host) close(onCancel); else if(m) close(m.dataset.m==='ok'? ()=>onOk(host) : onCancel); });
  host.addEventListener('keydown',e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(onCancel); } });
  (gate? host.querySelector('input,select') : okB).focus();
}
let toastT;
function okAlert(msg){ document.querySelectorAll('.okalert').forEach(x=>x.remove());
  const a=document.createElement('div'); a.className='okalert'; a.setAttribute('role','status');
  a.innerHTML=`<span class="oa-i" aria-hidden="true">&#10003;</span><span>${msg}</span><button type="button" aria-label="Dismiss">&times;</button>`;
  a.querySelector('button').onclick=()=>a.remove(); document.body.appendChild(a); }
function toast(msg, undo){
  document.querySelectorAll('.toast').forEach(t=>t.remove()); clearTimeout(toastT);
  const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status');
  t.innerHTML=`<span>${msg}</span>${undo?'<button type="button">Undo</button>':''}`;
  document.body.appendChild(t);
  if(undo) t.querySelector('button').onclick=()=>{ t.remove(); undo(); };
  toastT=setTimeout(()=>t.remove(), 6000);
}
const savedCount=()=>Object.keys(S.saved).filter(k=>k.startsWith(S.method+':')).length;
function guard(label, apply, revert){
  const n=savedCount(); if(!n){ apply(); render(); return; }
  const inv=Object.keys(S.saved).reduce((a,k)=>a+(S.saved[k].targets||[]).length,0);
  modal({title:'Change transfer settings?', danger:true, ok:'Okay', cancel:'Cancel',
    body:`<div>Changing these settings will clear the transfers you have set up. Do you wish to continue?</div>`,
    onOk:()=>{ S.saved={}; apply(); render(); toast(`${n} saved transfer${n>1?'s':''} cleared`); }, onCancel:revert});
}

/* ---------- Screen 4: summary ---------- */
function renderSummary(p){
  const isInv=true, rows=p.investments;
  const items=rows.map((r,i)=>({r,i,sv:S.saved[key(i)]})).filter(x=>x.sv);
  let grand=0;
  let bought=0;
  const cards=items.map(({r,i,sv})=>{const out=outOf(r,sv); grand+=out; bought+=sv.targets.reduce((a,t)=>a+out*(+t.pct)/100,0);
    // aggregate buys (source mode can hit the same fund from several sources)
    const acc={}; if(isSrc()) srcRows(r).forEach((sr,j)=>{ const d=valueDollars(sr,(sv.srcVals||[])[j]); ((sv.srcT||[])[j]||[]).forEach(t=>acc[t.ticker]=(acc[t.ticker]||0)+d*(+t.pct)/100); });
    else sv.targets.forEach(t=>acc[t.ticker]=(acc[t.ticker]||0)+out*(+t.pct)/100);
    const buys=Object.entries(acc).map(([tk,d])=>({f:L[tk],d}));
    const kv=(l,v)=>`<div class="ss-kv"><span>${l}</span><b>${v}</b></div>`;
    const nav=r.balance/r.units, srcs=isSrc()? srcRows(r).map((sr,j)=>({n:sr.name,b:sr.balance,d:valueDollars(sr,(sv.srcVals||[])[j]),has:((sv.srcT||[])[j]||[]).length})).filter(x=>x.has&&x.d>0) : [];
    return `<section class="rv">
      <div class="rv-sell">
        <span class="rv-tag">Sell</span>
        <div class="rv-n">${esc(r.name)}</div>
        <div class="rv-amt num">${m$(out)}</div>
        <dl class="rv-dl"><div><dt>CUSIP</dt><dd>${r.cusip}</dd></div><div><dt>Type</dt><dd>${L[r.ticker]?.cls||'—'}</dd></div>
          ${isSrc()?`<div class="rv-srcs"><dt>From sources</dt>${srcs.map(x=>`<dd class="rv-sd"><div class="rv-sn">${esc(x.n)}</div><div class="rv-sk"><span>Selling percentage</span><b class="num">${(x.b?x.d/x.b*100:0).toFixed(2)}%</b></div><div class="rv-sk"><span>Selling amount</span><b class="num">${m$(x.d)}</b></div></dd>`).join('')}</div>`:''}</dl>
        <span class="rv-arrow" aria-hidden="true">&rarr;</span>
      </div>
      <div class="rv-buy">
        <div class="rv-bh"><h3>Buy investments</h3><span class="sub"><b>${String(buys.length).padStart(2,'0')}</b> investments</span></div>
        ${(()=>{ const head='<thead><tr><th>Investment name</th><th>CUSIP</th><th>Type</th><th class="r">Units</th><th class="r">Buy %</th><th class="r">Buy amount</th></tr></thead>';
          const row=(f,d,base)=>`<tr><td><div class="nm1" title="${esc(f.name)}">${esc(f.name)}</div></td><td>${fCusip(f.ticker)}</td><td title="${f.cls}">${f.cls}</td><td class="r num">${mU(d/fNav(f.ticker))}</td><td class="r num">${(d/base*100).toFixed(2)}%</td><td class="r num"><b>${m$(d)}</b></td></tr>`;
          const tbl=(rows,tot)=>`<div class="tw"><table class="rv-tbl">${head}<tbody>${rows}<tr class="total"><td colspan="4">Total buying</td><td class="r num">100.00%</td><td class="r num">${m$(tot)}</td></tr></tbody></table></div>`;
          if(!isSrc()) return tbl(buys.map(x=>row(x.f,x.d,out)).join(''), buys.reduce((a,x)=>a+x.d,0));
          return srcRows(r).map((sr,j)=>({sr,d:valueDollars(sr,(sv.srcVals||[])[j]),ts:(sv.srcT||[])[j]||[],v:+(sv.srcVals||[])[j]||0})).filter(g=>g.ts.length&&g.d>0)
            .map(g=>`<div class="rv-sblk"><div class="rv-sh"><span class="rv-gn">${esc(g.sr.name)}</span><span class="rv-gm num">${m$(g.d)} · ${lblV(g.v)} of source · ${g.ts.length} investment${g.ts.length>1?'s':''}</span></div>
              ${tbl(g.ts.map(t=>row(L[t.ticker], g.d*(+t.pct)/100, g.d)).join(''), g.d)}</div>`).join(''); })()}
      </div></section>`}).join('');
  S.grand=grand;
  const match=Math.abs(grand-bought)<0.01;
  const warns=[]; items.forEach(({r,sv})=>{ if(r.rule) warns.push(`<b>${esc(r.name)}</b>: ${esc(r.rule.msg)}${r.rule.pct?` Up to <b class="num">${m$(outOf(r,sv)*r.rule.pct/100)}</b> may be deducted.`:''}`);
    sv.targets.forEach(t=>{ const f=L[t.ticker]; if(f.rule) warns.push(`<b>${esc(f.name)}</b>: ${esc(f.rule.msg)}`); }); });
  S.needAck=false;
  if(S.view==='done') return `<div class="done"><div class="ring">✓</div><h2>Transfer request submitted</h2>
    <div class="ticket">
      <div><div class="lbl">Confirmation number</div><div class="nm1 num">${S.conf}</div></div>
      <div><div class="lbl">Status</div><span class="status">● Pending trade</span></div>
      <div><div class="lbl">Expected trade date</div><div class="nm1">Today's market close (4:00 PM ET)</div></div>
      <div><div class="lbl">Participant</div><div class="nm1">Kevin Thomas · ID 724010103</div></div>
      <div><div class="lbl">Total</div><div class="nm1 num">${m$(grand)}</div></div>
    </div>
    <div class="sub">Final amounts are set at the trade price and may differ from these estimates.</div>
    <div class="acts2"><button class="btn sm pri" type="button" data-tm>View in Transaction Maintenance</button><button class="btn sm" type="button" data-restart>Start a new request</button></div></div>`;
  return `
    ${cards}`;
}
$('#submitBtn').addEventListener('click',()=>{
  if(S.view==='edit'){ S.view='summary'; render(); window.scrollTo({top:0}); return; }
  if(S.view!=='summary') return;
  if(S.submitted) return; S.submitted=true; clearDraft(); render(); window.scrollTo({top:0}); okAlert('Transfer request submitted successfully');
});
$('#backEditBtn').addEventListener('click',()=>{ S.view='edit'; render(); });
$('#work').addEventListener('change',e=>{ if(e.target.id==='ackChk'){ S.ack=e.target.checked; $('#submitBtn').disabled=!S.ack; } });

/* ---------- Screen 3: edit drawer ---------- */
const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>';
const ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>';
const r2 = n => Math.round(n*100)/100;
const key = i => S.method+':'+i;
// Sources inside one investment — split pro-rata by the plan's source balances
function srcRows(r){ const src=PLANS[S.plan].sources, tot=src.reduce((a,x)=>a+x.balance,0);
  return src.map(x=>({name:x.name, balance:r2(r.balance*x.balance/tot), units:r.units*x.balance/tot})); }
const isSrc = () => S.method==='source';
function outOf(r,rec){ return isSrc() ? srcRows(r).reduce((a,sr,j)=>a+valueDollars(sr,(rec.srcVals||[])[j]),0) : valueDollars(r,rec.value); }
function recLabel(rec){ if(isSrc()){ const n=(rec.srcVals||[]).filter(v=>+v>0).length; return `From ${n} source${n===1?'':'s'}`; }
  return S.by==='percentage'?(+rec.value).toFixed(2)+'%':S.by==='unit'?mU(+rec.value)+' units':m$(+rec.value); }
function curRow(){ const p=PLANS[S.plan]; return p.investments[S.edit.i]; }
function valueDollars(r,v){ v=+v||0; return S.by==='percentage'? r.balance*v/100 : S.by==='unit'? (r.units? r.balance/r.units*v : 0) : v; }
function valueMax(r){ return S.by==='percentage'?100 : S.by==='unit'? (r.units||0) : r.balance; }

let lastFocus=null;
function openDrawer(i){
  const sv=S.saved[key(i)];
  S.edit={srcOn: PLANS[S.plan].sources.map((_,j)=>!!(sv&&sv.srcT&&sv.srcT[j]&&sv.srcT[j].length)), i, value: sv?sv.value:'', srcVals: sv&&sv.srcVals? sv.srcVals.slice() : PLANS[S.plan].sources.map(()=>''), srcT: sv&&sv.srcT? sv.srcT.map(a=>a.map(t=>({...t}))) : PLANS[S.plan].sources.map(()=>[]), srcDone: sv&&sv.srcVals? sv.srcVals.map(v=>+v>0) : PLANS[S.plan].sources.map(()=>false), active:-1, targets: sv? sv.targets.map(t=>({...t})) : []};
  S.q=''; S.mq=''; lastFocus=document.activeElement;
  const r=curRow(), isInv=true;
  const suf = S.by==='percentage'?'%':S.by==='unit'?'units':'';
  const host=document.createElement('div'); host.id='drawerHost';
  host.innerHTML=`<div class="scrim" data-close></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="dTitle">
    <div class="dh"><div style="flex:1"><h2 id="dTitle">Investment Transfer</h2></div><div class="dh-acts"><span class="save-why" id="saveWhy" role="status"></span><button class="btn" type="button" data-close>Cancel</button><button class="btn pri" type="button" id="saveBtn">Save transfer</button></div></div>
    <div class="db">
      <div class="cols3">
        <section class="pane pane-l pane-c1">
          <div class="stk-a"><div class="pane-h"><div><h3>1. Transfer from</h3></div></div><div id="left"></div></div></section>
        <section class="pane pane-c2" id="pane2"><div class="stk-b"><div class="pane-h"><h3>2. Choose buy investment(s)</h3></div>
          <label class="search">${ICON_SEARCH}<input id="fq" placeholder="Search by name or ticker" aria-label="Search investments"></label>
          <div class="pane-sub"><span class="count" id="availCount"></span></div>
          <div class="cardlist" id="fundList"></div></div></section>
        <section class="pane" id="pane3"><div class="pane-h"><h3>3. Set allocation</h3></div>
          <label class="search">${ICON_SEARCH}<input id="mq" placeholder="Search added investments" aria-label="Search added investments"></label>
          <div class="pane-sub"><span class="count" id="addedCount"></span><span id="rmAllSlot"></span></div>
          <div class="cardlist" id="addedList"></div>
          <div id="addedFoot"></div></section>
        <div id="srcMsg" hidden></div><div id="tvMsg" hidden></div><div id="cards" hidden></div>
      </div>
    </div>
  </aside>`;
  snap=null;
  document.body.appendChild(host);
  if(isSrc()){ const first=S.edit.srcT.findIndex(a=>a.length); if(first>=0) setActive(first); else { renderRight(); updateDrawer(); } }
  else pickInv();
  S.edit.orig=JSON.stringify([S.edit.value,S.edit.srcVals,S.edit.srcT,S.edit.targets]);
  const f=$('#tvInp')||document.querySelector('[data-src]')||document.querySelector('[data-card]'); f&&f.focus(); renderSteps();
}
function closeDrawer(){ const h=$('#drawerHost'); if(h) h.remove(); S.edit=null; S.balOk=false; renderSteps(); if(S.returnTo){ S.view=S.returnTo; S.returnTo=null; S.ack=false; render(); } lastFocus&&lastFocus.focus&&lastFocus.focus(); }

function showRight(){}

function renderCards(){ renderLeft(); }
function updateProgress(){ const e=S.edit; if(!isSrc()) return;
  document.querySelectorAll('[data-prog]').forEach(el=>{ const j=+el.dataset.prog, n=e.srcT[j].length, v=+e.srcVals[j]||0; el.textContent = n&&v>0? `${lblV(v)} into ${n} investment${n>1?'s':''}` : ''; el.classList.toggle('none',!(n&&v>0)); }); }
function renderLeft(){ const e=S.edit, r=curRow(), suf=S.by==='percentage'?'%':S.by==='unit'?'units':'';
  const inp=(id,attr,val,err,dis,j)=>`<div class="lf-in2"><div class="inp small ${dis?'is-dis':''}" id="${id}">${S.by==='amount'?'<span class="af pre">$</span>':''}<input ${attr} inputmode="decimal" placeholder="${S.by==='unit'?'0.0000':'0.00'}" autocomplete="off" value="${esc(val)}" aria-label="Transfer ${S.by}" ${dis?'disabled':''}>${suf?`<span class="af">${suf}</span>`:''}</div><button type="button" class="link maxl" data-max ${j!=null?`data-maxj="${j}"`:''} ${dis?'disabled':''}>Max</button><div class="cellerr" id="${err}" role="alert"></div></div>`;
  const kv=(b,u)=>`<span class="lf-kv2 num">${m$(b)} · ${mU(u)} units</span>`;
  if(!isSrc()){ $('#left').innerHTML=`<div class="lf-c on"><div class="lf-top"><span class="lf-n2">${esc(r.name)}</span>${kv(r.balance,r.units)}</div>${inp('tvBox','id="tvInp"',e.value,'tvErr')}</div>`; return; }
  $('#left').innerHTML=`<div class="lf-grp"><div class="lf-inv"><span class="lf-n2">${esc(r.name)}</span>${kv(r.balance,r.units)}</div><div class="lf-srcs" role="group" aria-label="Sources in ${esc(r.name)}">`+srcRows(r).map((sr,j)=>{ const on=e.active===j, ck=e.srcOn[j]; return `<div class="lf-c ${on?'on':''} ${ck?'chk':''}">
      <div class="lf-top"><input type="checkbox" class="lf-cb" data-srcchk="${j}" ${ck?'checked':''} aria-label="Include ${esc(sr.name)}">
        <button type="button" class="lf-nb" data-card="${j}" ${ck?'':'disabled'}>${esc(sr.name)}</button>${kv(sr.balance,sr.units)}</div>
      ${inp('srcBox'+j,`data-src="${j}"`,e.srcVals[j],'srcErr'+j,!ck,j)}<span class="lf-prog" data-prog="${j}"></span></div>`; }).join('')+`</div></div>`;
  updateProgress();
}
function activateSrc(j){ const E=S.edit; if(!E||E.active===j||!E.srcOn[j]) return; E.active=j; E.targets=E.srcT[j];
  document.querySelectorAll('#left .lf-c').forEach((c,k)=>c.classList.toggle('on',k===j)); renderList(); updateDrawer(); }
document.addEventListener('focusin',ev=>{ const t=ev.target; if(S.edit&&t.dataset&&t.dataset.src!=null) activateSrc(+t.dataset.src); });
document.addEventListener('pointerdown',ev=>{ const c=ev.target.closest&&ev.target.closest('#left .lf-c.chk'); if(S.edit&&c){ const ip=c.querySelector('[data-src]'); if(ip) activateSrc(+ip.dataset.src); } });
function pickInv(){ const e=S.edit; e.picked=true; renderLeft(); renderList(); updateDrawer(); $('#tvInp')?.focus(); }
function renderRight(){ renderLeft(); renderList(); }
function renderList(){
  const mq=(S.mq||'').trim().toLowerCase(), mOk=t=>{ const f=L[t.ticker]; return !mq||(f.name+' '+f.ticker).toLowerCase().includes(mq); };
  const e=S.edit, src=isSrc(), j=e.active, ts=(src&&j<0)? [] : e.targets, cur=curRow(), on=hasVal();
  const q=S.q.trim().toLowerCase(), chosen=new Set(ts.map(t=>t.ticker));
  const avail=LINEUP.filter(f=>f.ticker!==cur.ticker && !(f.rule&&f.rule.type==='block') && !chosen.has(f.ticker) && (!q||(f.name+' '+f.ticker).toLowerCase().includes(q)));
  const why = src&&j<0? 'Choose a source first' : `Enter the transfer ${S.by==='unit'?'units':S.by==='amount'?'amount':'%'} first`;
  $('#availCount').innerHTML=`<b>${avail.length}</b> investment${avail.length===1?'':'s'}`;
  $('#fundList').innerHTML = avail.map(f=>{ const blk=f.rule&&f.rule.type==='block', dis=blk||!on; return `<div class="fc2 ${dis?'off':''}">
      <div class="fc2-t"><div class="fc2-n" title="${esc(f.name)}">${esc(f.name)}</div><div class="fc2-c">${f.cls}</div></div>
      <button type="button" class="fc2-add" data-add="${f.ticker}" ${dis?`disabled title="${blk?'Not available':why}"`:''} aria-label="Add ${esc(f.name)}">+ Add</button></div>`; }).join('') || `<div class="empty">No investments match "${esc(S.q)}".</div>`;
  if(src){ const groups=srcRows(cur).map((sr,k)=>({sr,k,ts:e.srcT[k]})).filter(g=>e.srcOn[g.k]&&(g.k===j||g.ts.length)), tot=groups.reduce((a,g)=>a+g.ts.length,0);
    $('#addedCount').innerHTML = '';
    $('#rmAllSlot').innerHTML = '';
    $('#addedList').innerHTML = groups.length? groups.map(g=>{ const on=g.k===j, V=+e.srcVals[g.k]||0, d=valueDollars(g.sr,V);
      return `<div class="mi-g ${on?'on':''}"><div class="mi-gh"><button type="button" class="mi-gl" data-card="${g.k}" ${on?'aria-current="true"':''}><span class="mi-gn">${esc(g.sr.name)}</span> <span class="mi-gv"><b>${g.ts.length}</b> added</span></button>${g.ts.length?`<button type="button" class="fc-act rm" data-rmall data-rmj="${g.k}">&times; Remove all</button>`:''}</div>
        ${g.ts.length? (g.ts.filter(mOk).length? '' : `<div class="mi-empty">No match for "${esc(S.mq)}".</div>`)+g.ts.filter(mOk).map(t=>{ const f=L[t.ticker], k2=`${g.k}:${t.ticker}`; return on? `<div class="icd pk3"><div class="ic-h"><span>Type: <b>${f.cls}</b></span><button class="ic-add ic-rm" type="button" data-srm="${k2}" aria-label="Remove ${esc(f.name)}">Remove</button></div><div class="ic-nr"><div class="ic-n" title="${esc(f.name)}">${esc(f.name)}</div><div class="ic-in"><div class="inp small"><input data-salloc="${k2}" inputmode="decimal" placeholder="${S.by==='unit'?'0.0000':'0.00'}" value="${disp(t.pct,V)}" aria-label="Allocation for ${esc(f.name)}"><span class="af">${AF()}</span></div></div></div>${fHold(f)}<div class="ic-m"><span class="fm">Amount: <b class="num" data-sest="${k2}"></b></span><span class="fm">Est. units: <b class="num" data-eu></b></span></div></div>`
          : `<div class="icd pk3 ro" data-card="${g.k}"><div class="ic-h"><span>Type: <b>${f.cls}</b></span><span class="ic-add ic-rm" aria-hidden="true" style="visibility:hidden">Remove</span></div><div class="ic-nr"><div class="ic-n" title="${esc(f.name)}">${esc(f.name)}</div><div class="ic-in"><div class="inp small"><input disabled value="${disp(t.pct,V)}" aria-label="Allocation for ${esc(f.name)}"><span class="af">${AF()}</span></div></div></div>${fHold(f)}<div class="ic-m"><span class="fm">Amount: <b class="num">${m$(d*(+t.pct)/100)}</b></span><span class="fm">Est. units: <b class="num">${mU(d*(+t.pct)/100/fNav(t.ticker))}</b></span></div></div>`; }).join('')
          : `<div class="mi-empty">Add investments for this source from column 2.</div>`}${on&&g.ts.length?`<div class="allocerr inl" id="sAlMsg${g.k}" role="alert"></div>`:''}</div>`; }).join('')
      : `<div class="hintbox">Check a source and enter an amount. The investments you add will be grouped here by source.</div>`;
    $('#addedFoot').innerHTML = ts.length? `<div class="af-tot"><span>Total<b class="num" id="sTot" hidden></b><b class="num" id="ofV" hidden></b></span><span><b class="num" id="estTot"></b></span></div>
      ` : '';
    return; }
  $('#addedCount').innerHTML = ts.length? `<b>${ts.length}</b> added` : '';
  $('#rmAllSlot').innerHTML = ts.length? '<button type="button" class="fc-act rm" data-rmall>&times; Remove all</button>' : '';
  $('#addedList').innerHTML = ts.length? (ts.filter(mOk).length?'':`<div class="empty">No match for "${esc(S.mq)}".</div>`)+ts.filter(mOk).map(t=>{ const f=L[t.ticker], k=src?`${j}:${t.ticker}`:t.ticker; return `<div class="icd pk3"><div class="ic-h"><span>Type: <b>${f.cls}</b></span><button class="ic-add ic-rm" type="button" ${src?`data-srm="${k}"`:`data-rm="${k}"`} aria-label="Remove ${esc(f.name)}">Remove</button></div><div class="ic-nr"><div class="ic-n" title="${esc(f.name)}">${esc(f.name)}</div><div class="ic-in"><div class="inp small"><input ${src?`data-salloc="${k}"`:`data-alloc="${k}"`} inputmode="decimal" placeholder="${S.by==='unit'?'0.0000':'0.00'}" value="${disp(t.pct,vOfEdit(j))}" aria-label="Allocation for ${esc(f.name)}"><span class="af">${AF()}</span></div></div></div>${fHold(f)}<div class="ic-m"><span class="fm">Amount: <b class="num" ${src?`data-sest="${k}"`:`data-est="${k}"`}></b></span><span class="fm">Est. units: <b class="num" data-eu></b></span></div></div>`; }).join('')+`<div class="allocerr inl" ${src?`id="sAlMsg${j}"`:'id="allocMsg"'} role="alert"></div>`
    : `<div class="hintbox">Selected investments will appear here. Enter the allocation for each.</div>`;
  $('#addedFoot').innerHTML = ts.length? `<div class="af-tot"><span>Total<b class="num" id="${src?'sTot':'allocTot'}" hidden></b><b class="num" id="ofV" hidden></b></span><span><b class="num" id="estTot"></b></span></div>
      ` : '';
}
function renderSrc(){ renderRight(); }
function renderRep(){ renderList(); }
function renderFunds(){ renderList(); }
let snap=null;
function setActive(j){ const e=S.edit;
  e.active=j; snap = j>=0? {v:e.srcVals[j], t:e.srcT[j].map(x=>({...x}))} : null;

  e.targets = j>=0? e.srcT[j] : []; renderSrc(); renderFunds(); updateDrawer();
  if(j>=0){ const inp=document.querySelector(`[data-src="${j}"]`); inp&&inp.focus(); } }
// Allocation is entered in the same unit as the transfer value (%, units or $) and must add up to it
const STEP=()=>S.by==='unit'?0.0001:0.01;
function fmtV(n){ return S.by==='unit'? (Math.round(n*10000)/10000).toFixed(4) : (Math.round(n*100)/100).toFixed(2); }
function lblV(n){ return S.by==='amount'? m$(n) : S.by==='unit'? mU(n)+' units' : fmtV(n)+'%'; }
function disp(pct,V){ return pct===''||pct==null? '' : fmtV((+pct)*V/100); }
function okAlloc(sm,V){ return Math.abs(sm-100)<0.005 || Math.abs((sm-100)*V/100) < STEP()/2; }
const AF=()=>S.by==='unit'?'units':S.by==='amount'?'$':'%';
function vOfEdit(j){ return isSrc()? (+S.edit.srcVals[j]||0) : (+S.edit.value||0); }
function hasVal(){ const e=S.edit, r=curRow(); if(isSrc()){ if(e.active<0) return false; const v=+e.srcVals[e.active]||0; return v>0 && v<=valueMax(srcRows(r)[e.active])+1e-9; } const v=+e.value||0; return v>0 && v<=valueMax(r)+1e-9; }
function splitEven(){ const t=S.edit.targets,n=t.length; if(!n) return; const V=vOfEdit(S.edit.active), st=STEP();
  if(!(V>0)){ const b=Math.floor(10000/n)/100; t.forEach((x,i)=>x.pct=(i===n-1? r2(100-b*(n-1)) : b).toFixed(2)); return; }
  const k=Math.round(V/st), base=Math.floor(k/n); t.forEach((x,i)=>{ const units=(i===n-1? k-base*(n-1) : base)*st; x.pct=String(units/V*100); }); }
function updateDrawer(){
  const e=S.edit, r=curRow();
  if(!isSrc() && !e.picked){ $('#saveBtn').disabled=true; return; }
  let v=+e.value||0, out=valueDollars(r,e.value), over=false, noUnits=false;
  if(isSrc()){
    var srcOk=true, orphan=false, inS=0, outS=0; const srs=srcRows(r); let anyOver=false, used=0; out=0; v=0;
    srs.forEach((sr,j)=>{ const x=+e.srcVals[j]||0, o=x>valueMax(sr)+1e-9, d=valueDollars(sr,e.srcVals[j]), ts=e.srcT[j];
      $('#srcBox'+j)?.classList.toggle('err',o); if(o) anyOver=true;
      const se=$('#srcErr'+j); if(se) se.textContent = o? `Max ${lblV(valueMax(sr))}` : '';
      ts.forEach(t=>{const c=document.querySelector(`[data-sest="${j}:${t.ticker}"]`); if(c){ c.textContent=m$(d*(+t.pct||0)/100); const u=c.closest('.ic-m')?.querySelector('[data-eu]'); if(u) u.textContent=mU(d*(+t.pct||0)/100/fNav(t.ticker)); } const ip=document.querySelector(`[data-salloc="${j}:${t.ticker}"]`); if(ip && ip!==document.activeElement) ip.value=disp(t.pct,x);});
      if(x>0) outS+=d;
      if(!ts.length){ if(x>0) orphan=true; return; } used++; out+=d; v+=x;
      const sm=r2(ts.reduce((a,t)=>a+(+t.pct||0),0)); inS+=d*sm/100;
      { const bad=x>0 && !okAlloc(sm,x), am=$('#sAlMsg'+j);
        ts.forEach(t=>{ const ip=document.querySelector(`[data-salloc="${j}:${t.ticker}"]`); if(ip) ip.parentElement.classList.toggle('err',bad); });
        if(j===e.active){ const st=$('#sTot'); if(st){ st.textContent=lblV(sm*x/100); st.classList.toggle('bad-t',bad); st.classList.toggle('ok-t',!bad); } const est=$('#estTot'); if(est) est.textContent=m$(d*sm/100); }
        if(am) am.innerHTML = !bad? '' : (sm>100? `Over by ${lblV((sm-100)*x/100)}. Allocations must add up to ${lblV(x)}.` : `${lblV((100-sm)*x/100)} left to allocate. Allocations must add up to ${lblV(x)}.`)+' <button class="link fixlink" type="button" data-even>Split evenly</button>'; } if(!(x>0) || !okAlloc(sm,x)) srcOk=false;
      const al=$('#sAl'+j); if(al){ const ok=Math.abs(sm-100)<0.005, ov=sm>100;
        al.className='alloc-line'+(ok?' ok':ov?' over':'');
        al.innerHTML=`<span class="bar"><i style="width:${Math.min(sm,100)}%"></i></span><span class="num">Allocated <b>${sm.toFixed(2)}%</b> of 100% · ${ok?'<span class="ok-t">Fully allocated</span>':ov?`<span class="bad-t">${(sm-100).toFixed(2)}% over</span>`:`${m$(d*(100-sm)/100)} left to place`}</span>`; } });
    over=anyOver; if(!used) srcOk=false;
    $('#srcMsg').innerHTML = anyOver? ''
      : !used? '<div class="hint">Select a source, enter the transfer value, then add investments from the list.</div>'
      : '';
  } else {
  const max=valueMax(r);
  noUnits = S.by==='unit' && r.units==null;
  over = v>max+1e-9;
  $('#tvBox').classList.toggle('err', over||noUnits);
  $('#tvErr').textContent = noUnits ? 'Units not available. Choose Percentage or Amount.' : over ? `Max ${lblV(max)}` : '';
  $('#tvMsg').innerHTML = (noUnits||over) ? '' : `<div class="hint">${v? '≈ <b class="num">'+m$(out)+'</b> will be moved' : 'Enter how much to move out'}</div>`;
  }
  let sum=0;
  if(!isSrc() && e.targets.length){
    sum=r2(e.targets.reduce((a,t)=>a+(+t.pct||0),0));
    e.targets.forEach(t=>{const c=document.querySelector(`[data-est="${t.ticker}"]`); if(c){ c.textContent=m$(out*(+t.pct||0)/100); const u=c.closest('.ic-m')?.querySelector('[data-eu]'); if(u) u.textContent=mU(out*(+t.pct||0)/100/fNav(t.ticker)); }});
    const V=+e.value||0, ok=okAlloc(sum,V);
    e.targets.forEach(t=>{const ip=document.querySelector(`[data-alloc="${t.ticker}"]`); if(ip){ if(ip!==document.activeElement) ip.value=disp(t.pct,V); ip.parentElement.classList.toggle('err',!ok && V>0); }});
    $('#allocTot').innerHTML=`<span class="${ok?'ok-t':'bad-t'}">${lblV(sum*V/100)}</span>`;
    $('#estTot').textContent=m$(out*sum/100);
    $('#allocMsg').innerHTML= ok?'' : `<div>${sum>100?`Over by ${lblV((sum-100)*V/100)}.`:`${lblV((100-sum)*V/100)} left to allocate.`} Allocations must add up to ${lblV(V)}. <button class="link fixlink" type="button" data-even>Split evenly</button></div>`;
  }
  const why = isSrc()
    ? (over? 'A source is over its available amount' : orphan? 'Add funds for every source with a transfer value' : !v? 'Add investments to at least one source' : !srcOk? 'Allocations must add up to each source\'s transfer value' : '')
    : (noUnits? 'Choose Percentage or Amount' : over? 'Transfer value is more than available' : !v? 'Enter a transfer value' : !e.targets.length? 'Add at least one investment' : !okAlloc(sum,+e.value||0)? `Allocations must add up to ${lblV(+e.value||0)}` : '');
  $('#saveBtn').disabled = !!why; $('#saveWhy').textContent = '';
  // R-1 live balance: what is sold vs what is bought
  const mOut = isSrc()? outS : (over||noUnits? 0 : out), mIn = isSrc()? inS : (over||noUnits? 0 : out*sum/100), rem=r2(mOut-mIn);
  const ok = mOut>0 && !why, bad = !!why && mOut>0;
  if(S.balOk!==ok){ S.balOk=ok; renderSteps(); }
  updateProgress(); { const ov=$('#ofV'); if(ov) ov.textContent=lblV(vOfEdit(e.active)); }
  const b=$('#bal'); if(b) b.className='bal';
  if(b) b.innerHTML=`<div class="bi"><div class="lbl">Investment name</div><div class="v nm">${esc(r.name)}</div></div><div><div class="lbl">Account balance</div><div class="v num">${m$(r.balance)}</div></div><div><div class="lbl">Available units</div><div class="v num">${r.units!=null?mU(r.units):'—'}</div></div>`;
}

document.addEventListener('click', e => {
  if(!S.edit) return;
  const t=e.target.closest('[data-close],[data-add],[data-rm],[data-even],[data-srm],[data-rmall],[data-max],[data-setact],[data-focusv],[data-card],[data-ssave],[data-scancel],[data-sclear],[data-sinvrm],#saveBtn'); if(!t) return;
  if(t.hasAttribute('data-max')){ const E=S.edit, r=curRow(), src=isSrc(); if(src&&t.dataset.maxj!=null) activateSrc(+t.dataset.maxj); const ip=src? document.querySelector(`[data-src="${E.active}"]`) : $('#tvInp'); if(!ip) return;
    const mx=valueMax(src? srcRows(r)[E.active] : r); ip.value = S.by==='unit'? (Math.floor(mx*10000)/10000).toFixed(4) : (Math.floor(mx*100)/100).toFixed(2); ip.dispatchEvent(new Event('input',{bubbles:true})); ip.focus(); return; }
  if(t.hasAttribute('data-rmall')){ const E=S.edit; if(t.dataset.rmj!=null){ E.srcT[+t.dataset.rmj].length=0; renderList(); updateProgress(); updateDrawer(); return; } E.targets.length=0; if(isSrc()) E.srcVals[E.active]=E.srcVals[E.active]; renderList(); updateDrawer(); return; }
  if(t.dataset.card!=null){ if(isSrc()){ activateSrc(+t.dataset.card); document.querySelector(`[data-src="${t.dataset.card}"]`)?.focus(); } else if(!S.edit.picked) pickInv(); return; }
  if(t.dataset.setact!=null){ if(S.edit.active!==+t.dataset.setact) setActive(+t.dataset.setact); else document.querySelector(`[data-src="${t.dataset.setact}"]`)?.focus(); return; }
  if(t.hasAttribute('data-focusv')){ $('#tvInp')?.focus(); return; }
  if(t.dataset.ssave!=null){ const j=+t.dataset.ssave; S.edit.srcDone[j]=true; snap=null; setActive(-1); return; }
  if(t.dataset.sinvrm){ const [js,tk]=t.dataset.sinvrm.split(':'), j=+js, E=S.edit, a=E.srcT[j];
    a.splice(a.findIndex(x=>x.ticker===tk),1);
    if(!a.length) E.srcVals[j]=''; else renorm(a);
    renderSrc(); renderFunds(); updateDrawer(); return; }
  if(t.dataset.scancel!=null){ setActive(-1); return; }
  if(t.dataset.sclear!=null){ const j=+t.dataset.sclear; S.edit.srcVals[j]=''; S.edit.srcT[j]=[]; S.edit.srcDone[j]=false; renderSrc(); renderFunds(); updateDrawer(); return; }
  if(t.dataset.srm){ const [j,tk]=t.dataset.srm.split(':'); const a=S.edit.srcT[+j]; a.splice(a.findIndex(x=>x.ticker===tk),1); renorm(a); renderSrc(); renderFunds(); updateDrawer(); return; }
  if(t.hasAttribute('data-close')) return tryClose();
  if(t.dataset.add){ const ts=S.edit.targets; ts.push({ticker:t.dataset.add,pct:''}); splitEven(); if(isSrc()) renderSrc(); else renderRep(); renderFunds(); updateDrawer(); return; }
  if(t.dataset.rm){ S.edit.targets=S.edit.targets.filter(x=>x.ticker!==t.dataset.rm); renorm(S.edit.targets); renderRep(); renderFunds(); updateDrawer(); return; }
  if(t.hasAttribute('data-even')){ splitEven(); renderRep(); updateDrawer(); return; }
  if(t.id==='saveBtn'){ const E=S.edit; let targets=E.targets.map(x=>({...x}));
    if(isSrc()){ const r=curRow(), srs=srcRows(r), acc={}; let tot=0;
      srs.forEach((sr,j)=>{ const d=valueDollars(sr,E.srcVals[j]); if(!E.srcT[j].length||!(+E.srcVals[j]>0)) { E.srcVals[j]=''; E.srcT[j]=[]; return; } tot+=d; E.srcT[j].forEach(x=>acc[x.ticker]=(acc[x.ticker]||0)+d*(+x.pct)/100); });
      targets=Object.entries(acc).map(([ticker,d])=>({ticker,pct:(d/tot*100).toFixed(2)})); }
    S.saved[key(E.i)]={value:E.value, srcVals:E.srcVals.slice(), srcT:E.srcT.map(a=>a.map(x=>({...x}))), targets}; closeDrawer(); render(); }
});
// Percentage can't go above 100: keep the previous value instead
function capPct(v,prev){ if(S.by!=='percentage') return v; return (+v>100 || /\.\d{3,}/.test(v))? (prev||'') : v; }
document.addEventListener('input', e => {
  if(!S.edit) return;
  const t=e.target, clean=v=>v.replace(/[^0-9.]/g,'');
  if(t.dataset.src!=null){ const j=+t.dataset.src; S.edit.srcVals[j]=capPct(clean(t.value),S.edit.srcVals[j]); t.value=S.edit.srcVals[j]; updateDrawer(); renderFunds(); }
  else if(t.id==='tvInp'){ S.edit.value=capPct(clean(t.value),S.edit.value); t.value=S.edit.value; updateDrawer(); renderFunds(); }
  else if(t.dataset.salloc){ const [j,tk]=t.dataset.salloc.split(':'); const x=S.edit.srcT[+j].find(z=>z.ticker===tk); const raw=clean(t.value), V=vOfEdit(+j); t.value=raw; x.pct= raw===''?'' : V>0? String(+raw/V*100) : ''; updateDrawer(); }
  else if(t.dataset.alloc){ const x=S.edit.targets.find(z=>z.ticker===t.dataset.alloc), raw=clean(t.value), V=vOfEdit(); t.value=raw; x.pct= raw===''?'' : V>0? String(+raw/V*100) : ''; updateDrawer(); }
  else if(t.id==='fq'){ S.q=t.value; renderFunds(); }
  else if(t.id==='mq'){ S.mq=t.value; renderList(); updateDrawer(); }
});
document.addEventListener('change', e => {
  if(S.edit && e.target.dataset && e.target.dataset.srcchk!=null){ const j=+e.target.dataset.srcchk, E=S.edit;
    E.srcOn[j]=e.target.checked;
    if(e.target.checked){ setActive(j); }
    else { E.srcVals[j]=''; E.srcT[j]=[]; if(E.active===j){ const nx=E.srcOn.findIndex(Boolean); setActive(nx); } else { renderRight(); updateDrawer(); } }
    return; }
  const t=e.target; if(!S.edit || t.dataset.srcon==null) return;
  setActive(+t.dataset.srcon);
});
function tryClose(){
  const E=S.edit; if(!E) return;
  const now=JSON.stringify([E.value,E.srcVals,E.srcT,E.targets]);
  if(now===E.orig){ closeDrawer(); return; }
  modal({title:'Discard your changes?', danger:true, ok:'Discard changes',
    body:`<div>Changes to <b>${esc(curRow().name)}</b> haven't been saved. Close without saving?</div>`, onOk:closeDrawer});
}
document.addEventListener('keydown', e => { if(S.edit && !modalOpen && e.key==='Escape') tryClose(); });

$('#planSel').addEventListener('change', e => { const v=e.target.value, old=S.plan; guard('plan', ()=>{ S.plan=v; }, ()=>{ e.target.value=old; }); });
$('#cancelBtn').addEventListener('click', () => {
  const reset=()=>{ Object.assign(S,{plan:'',method:'investment',by:'percentage',saved:{},view:'edit',ack:false,submitted:false}); $('#planSel').value=''; clearDraft(); render(); };
  if(!savedCount()){ reset(); return; }
  const n=savedCount();
  modal({title:'Discard this transfer request?', danger:true, ok:'Discard request', cancel:'Keep request',
    body:`<div>All <b>${n} saved transfer${n>1?'s':''}</b> for Kevin Thomas will be lost. This can't be undone.</div>`, onOk:reset});
});
$('#work').addEventListener('change', e => {
  if(e.target.id!=='srcMode') return; const want=e.target.checked?'source':'investment'; e.target.checked=isSrc();
  guard('transfer method', ()=>{ S.method=want; });
});
$('#work').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  if(b.dataset.method){ if(b.dataset.method!==S.method) guard('transfer method', ()=>{ S.method=b.dataset.method; }); }
  else if(b.dataset.by){ if(b.dataset.by!==S.by) guard('“Transfer by” setting', ()=>{ S.by=b.dataset.by; }); }
  else if(b.hasAttribute('data-restart')){ Object.assign(S,{plan:'',method:'investment',by:'percentage',saved:{},view:'edit',ack:false,submitted:false}); $('#planSel').value=''; render(); }
  else if(b.dataset.edit){ openDrawer(+b.dataset.edit); }
  else if(b.dataset.all){ openAll(+b.dataset.all); }
  else if(b.dataset.acc){ S.open=S.open||{}; const k=+b.dataset.acc; S.open[k]=!S.open[k]; render(); }
  else if(b.dataset.sedit){ S.returnTo='summary'; S.view='edit'; render(); openDrawer(+b.dataset.sedit); }
  else if(b.hasAttribute('data-tm')){ toast('In CORE this opens the request in Transaction Maintenance.'); }
  else if(b.hasAttribute('data-unlock')){ const n=savedCount(); modal({title:'Change transfer settings?', danger:true, ok:'Okay', cancel:'Cancel',
    body:`<div>Changing these settings will clear the transfers you have set up. Do you wish to continue?</div>`,
    onOk:()=>{ S.saved={}; render(); toast(`${n} saved transfer${n>1?'s':''} cleared`); }}); }
  else if(b.dataset.mrm){ const [is,tk,js]=b.dataset.mrm.split(':'), i=+is, k=key(i), sv=S.saved[k], r=PLANS[S.plan].investments[i];
    const before=JSON.parse(JSON.stringify(sv)); toast(`Removed ${esc(L[tk].name)}. The rest still adds up to the transfer value.`, ()=>{ S.saved[k]=before; render(); });
    const drop=a=>{ const x=a.findIndex(z=>z.ticker===tk); if(x>=0) a.splice(x,1); renorm(a); };
    if(js!=null && sv.srcT){ const j=+js; drop(sv.srcT[j]); if(!sv.srcT[j].length) sv.srcVals[j]=''; reaggregate(r,sv); }
    else drop(sv.targets);
    if(!sv.targets.length) delete S.saved[k];
    render(); }
});
// R-5: keep keyboard focus inside the open modal or drawer
document.addEventListener('keydown', e => {
  if(e.key!=='Tab') return;
  const box = modalOpen? document.querySelector('.modal') : S.edit? document.querySelector('.drawer') : null; if(!box) return;
  const f=[...box.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x=>!x.disabled && x.offsetParent!==null);
  if(!f.length) return; const a=f[0], z=f[f.length-1], cur=document.activeElement;
  if(!box.contains(cur)){ e.preventDefault(); a.focus(); }
  else if(e.shiftKey && cur===a){ e.preventDefault(); z.focus(); }
  else if(!e.shiftKey && cur===z){ e.preventDefault(); a.focus(); }
});
// resume-draft warning removed
render();
}
