'use strict';
const C = window.StudyCore;
const $ = id => document.getElementById(id);
const KEY = 'study-compass-v1';
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n.toFixed(1)).toString();
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const dateLabel = d => new Date(d+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
let state = {version:1,subjects:[]}, selected = null, editingSubject = false, editingResult = null, confirmAction = null, storageBlocked = false;
function notify(message) { $('message').textContent = message; }
try { const saved = localStorage.getItem(KEY); if (saved) state = C.validateState(JSON.parse(saved)); }
catch { storageBlocked = true; notify('Saved data could not be read. It has not been overwritten. You can use this session and export a backup, or import a valid backup to restore saving.'); }
selected = state.subjects[0]?.id ?? null;
function current() { return state.subjects.find(s => s.id === selected); }
function commit(next, message) {
  C.validateState(next);
  let saved = false;
  if (!storageBlocked) {
    try { localStorage.setItem(KEY,JSON.stringify(next)); saved = true; }
    catch { /* Preserve the last saved state; the new state remains exportable. */ }
  }
  state = next;
  document.querySelector('.local-tag').textContent = saved ? 'Saved on this device' : 'Not saved · export a backup';
  render(); notify(saved ? message : `${message} Browser saving is unavailable; export a backup to keep these changes.`);
}
function updateSubject(action, message) { const next = structuredClone(state); const s = next.subjects.find(s => s.id === selected); if (!s) throw new Error('Choose a subject first.'); action(s); commit(next,message); }
function confirm(title, text, action) { $('confirm-title').textContent=title; $('confirm-text').textContent=text; confirmAction=action; $('confirm-dialog').showModal(); }
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => button.closest('dialog').close()));
$('confirm-action').onclick = () => { $('confirm-dialog').close(); const action=confirmAction; confirmAction=null; if(action) action(); };
function render() {
  $('subjects').innerHTML = state.subjects.map(s => `<button class="subject-button ${s.id===selected?'active':''}" data-subject="${esc(s.id)}" ${s.id===selected?'aria-current="true"':''}>${esc(s.name)}<small>${s.results.length} result${s.results.length===1?'':'s'}</small></button>`).join('');
  const s=current(); $('welcome').hidden=!!s; $('workspace').hidden=!s;
  $('export').disabled=!state.subjects.length;
  if (!s) return;
  $('subject-title').textContent=s.name;
  $('subject-meta').textContent=`${C.topicNames(s).length} topics · Your personal progress record`;
  const points=C.series(s), latest=points.at(-1), previous=points.at(-2);
  $('latest').textContent=latest ? `${fmt(latest.value)}%`:'—';
  $('latest-note').textContent=latest ? `${dateLabel(latest.date)} · ${latest.kind}`:'Record an assessment to get started';
  const change=latest && previous ? latest.value-previous.value:null;
  $('change').textContent=change===null?'—':`${change>0?'+':''}${fmt(change)}`;
  $('goal-value').textContent=s.goal ? `${fmt(s.goal.target)}%`:'Not set';
  $('goal-note').textContent=s.goal ? `${latest ? (latest.value>=s.goal.target?'Latest result meets your target':`${fmt(s.goal.target-latest.value)} points to your target`) : 'Add a result to measure the gap'}${s.goal.date ? ` · ${s.goal.date<today()?'Target date passed: ':'By '}${dateLabel(s.goal.date)}`:''}`:'Choose the result you are working towards';
  const old=$('series').value;
  $('series').innerHTML='<option value="overall">Overall result</option>'+C.topicNames(s).map(t=>`<option value="topic:${esc(t)}">${esc(t)}</option>`).join('');
  if ([...$('series').options].some(o=>o.value===old)) $('series').value=old;
  renderChart(); renderPriorities(); renderTimeline();
}
function renderChart() {
  const s=current(); if(!s) return;
  const key=$('series').value; const points=C.series(s,key==='overall'?null:key.slice(6));
  if(!points.length) { $('chart').innerHTML='<div class="chart-empty">Your next result starts the story.<br>Add an assessment with scores for this view.</div>'; return; }
  const w=Math.max(280,Math.min(900,$('chart').clientWidth || 620)),h=270,left=42,right=15,top=16,bottom=42;
  const times=points.map(p=>Date.parse(p.date)); const min=Math.min(...times),max=Math.max(...times);
  const x=i=>max===min?w/2:left+(times[i]-min)/(max-min)*(w-left-right);
  const y=value=>top+(100-value)/100*(h-top-bottom);
  const grid=[0,25,50,75,100].map(v=>`<line x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}" stroke="#e7ecf4"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end">${v}</text>`).join('');
  const path=points.map((p,i)=>`${i?'L':'M'}${x(i)},${y(p.value)}`).join(' ');
  const goal=s.goal?`<line x1="${left}" x2="${w-right}" y1="${y(s.goal.target)}" y2="${y(s.goal.target)}" stroke="#438b78" stroke-dasharray="5 5"/>`:'';
  const circles=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.value)}" r="5" fill="#294bce" stroke="white" stroke-width="2"><title>${esc(p.name)} · ${esc(p.date)} · ${fmt(p.value)}%</title></circle>`).join('');
  const labels=[...new Set([0,Math.floor((points.length-1)/2),points.length-1])].filter((i,j,a)=>j===0 || x(i)-x(a[j-1])>100).map(i=>`<text x="${x(i)}" y="${h-12}" text-anchor="${x(i)<100?'start':x(i)>w-100?'end':'middle'}">${esc(new Date(points[i].date+'T12:00:00').toLocaleDateString(undefined,{day:'numeric',month:'short'}))}</text>`).join('');
  $('chart').innerHTML=`<svg class="trend-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Assessment percentages over time. Exact values are available in the data table below.">${grid}${goal}<path d="${path}" fill="none" stroke="#294bce" stroke-width="3" stroke-linejoin="round"/>${circles}${labels}</svg><div class="chart-legend">Blue: recorded results${s.goal?' · Dashed: subject goal':''}${points.length===1?' · Add another result to see a trend':''}</div><details class="chart-data"><summary>View exact values</summary><table><thead><tr><th>Date</th><th>Assessment</th><th>Score</th></tr></thead><tbody>${points.map(p=>`<tr><td>${esc(p.date)}</td><td>${esc(p.name)}</td><td>${fmt(p.value)}%</td></tr>`).join('')}</tbody></table></details>`;
}
function renderPriorities() {
  const items=C.priorities(current(),today());
  $('priorities').innerHTML=items.length?items.map(p=>`<article class="priority"><div class="priority-title"><b>${esc(p.name)}</b><span class="badge ${p.status}">${{focus:'Focus next',maintain:'Keep practising',unknown:'No evidence yet'}[p.status]}</span></div><p>${p.score===null?'Record a topic score to get a recommendation.':`${fmt(p.score)}% across ${p.count} recent result${p.count===1?'':'s'}. ${p.status==='focus'?`${fmt(p.gap)} points below your target. Try a focused practice session, then reassess.`:'At or above your target. Keep a short review in your routine.'}${p.count===1?' Only one result: treat this as an early signal.':''}${p.stale?' Last measured over 14 days ago; check it again.':''}`}</p></article>`).join(''):'<p class="empty">Add topics or a topic breakdown to discover where to focus.</p>';
}
function renderTimeline() {
  const results=C.ordered(current()).reverse(); $('result-count').textContent=`${results.length} result${results.length===1?'':'s'}`;
  $('timeline').innerHTML=results.length?results.map(r=>`<article class="result"><div class="result-date">${esc(dateLabel(r.date))}</div><div><div class="result-name">${esc(r.name)}</div><p class="result-summary">${esc(r.kind)} · ${r.topics.length?`${r.topics.length} topic breakdown${r.topics.length===1?'':'s'}`:'No topic breakdown'}</p></div><div class="result-score">${fmt(C.percentage(r.earned,r.maximum))}%<small>${r.earned} / ${r.maximum}</small></div><details><summary>View details & manage result</summary>${r.notes?`<p>${esc(r.notes)}</p>`:''}${r.topics.length?`<table class="topic-table"><thead><tr><th>Topic</th><th>Earned</th><th>Lost</th><th>Score</th></tr></thead><tbody>${r.topics.map(t=>`<tr><td>${esc(t.name)}</td><td>${t.earned}/${t.maximum}</td><td>${fmt(t.maximum-t.earned)}</td><td>${fmt(C.percentage(t.earned,t.maximum))}%</td></tr>`).join('')}</tbody></table><p>Breakdown covers ${fmt(r.topics.reduce((n,t)=>n+t.maximum,0))} of ${r.maximum} available marks.</p>`:'<p>No topic marks recorded. Edit this result to add them.</p>'}<div class="result-actions"><button class="text-button" data-edit-result="${esc(r.id)}">Edit result</button><button class="text-button" data-delete-result="${esc(r.id)}">Delete result</button></div></details></article>`).join(''):'<p class="empty">No results yet. Record your first assessment to start your timeline.</p>';
}
$('subjects').onclick=e=>{ const button=e.target.closest('[data-subject]'); if(button){selected=button.dataset.subject; render();} };
$('series').onchange=renderChart;
window.addEventListener('resize',renderChart);
function openSubject(edit=false) {
  editingSubject=edit; const s=edit?current():null;
  $('subject-dialog-title').textContent=edit?'Manage subject':'Add a subject';
  $('subject-name').value=s?.name??''; $('subject-topics').value=s?.topics.join('\n')??'';
  $('delete-subject').hidden=!edit; $('subject-error').textContent=''; $('subject-dialog').showModal();
}
$('new-subject').onclick=()=>openSubject(); $('welcome-add').onclick=()=>openSubject(); $('edit-subject').onclick=()=>openSubject(true);
$('subject-form').onsubmit=e=>{ e.preventDefault(); try {
  const name=C.clean($('subject-name').value,80);
  if(state.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase()&&(!editingSubject||s.id!==selected))) throw new Error('That subject already exists.');
  const topics=[...new Map($('subject-topics').value.split('\n').map(s=>s.trim()).filter(Boolean).map(t=>[t.toLowerCase(),C.clean(t,160)])).values()];
  const next=structuredClone(state);
  if(editingSubject){const s=next.subjects.find(s=>s.id===selected); s.name=name;s.topics=topics;}
  else{const s={id:uid(),name,topics,goal:null,results:[]};next.subjects.push(s);C.validateState(next);selected=s.id;}
  commit(next,'Subject saved.'); $('subject-dialog').close();
}catch(err){$('subject-error').textContent=err.message;} };
$('delete-subject').onclick=()=>{ const s=current(); confirm('Delete this subject?',`This removes ${s.name} and all ${s.results.length} results from this browser. Export a backup first if you want to keep them.`,()=>{const next=structuredClone(state);next.subjects=next.subjects.filter(x=>x.id!==s.id);selected=next.subjects[0]?.id??null;commit(next,'Subject deleted.');$('subject-dialog').close();}); };
$('edit-goal').onclick=()=>{const g=current().goal;$('goal-target').value=g?.target??80;$('goal-date').value=g?.date??'';$('goal-error').textContent='';$('goal-dialog').showModal();};
$('goal-form').onsubmit=e=>{e.preventDefault();try{updateSubject(s=>{s.goal={target:Number($('goal-target').value),date:$('goal-date').value};},'Goal saved.');$('goal-dialog').close();}catch(err){$('goal-error').textContent=err.message;}};
$('remove-goal').onclick=()=>{updateSubject(s=>{s.goal=null;},'Goal removed.');$('goal-dialog').close();};
function addTopicRow(topic={name:'',earned:'',maximum:''}) {
  const row=document.createElement('div');row.className='topic-row';
  row.innerHTML=`<label>Topic<input class="topic-name" list="topic-suggestions" maxlength="160" required value="${esc(topic.name)}" placeholder="Unit / Topic"></label><label>Earned<input class="topic-earned" type="number" min="0" step="0.01" required value="${esc(topic.earned)}"></label><label>Available<input class="topic-max" type="number" min="0.01" step="0.01" required value="${esc(topic.maximum)}"></label><button type="button" aria-label="Remove this topic">×</button>`;
  row.querySelector('button').onclick=()=>row.remove();$('topic-rows').append(row);
}
function openResult(id=null) {
  editingResult=id; const r=id?current().results.find(r=>r.id===id):null;
  $('result-form').reset();$('result-dialog-title').textContent=id?'Edit result':'Record a result';
  $('result-name').value=r?.name??'';$('result-date').value=r?.date??today();$('result-date').max=today();$('result-kind').value=r?.kind??'Raw marks';$('result-earned').value=r?.earned??'';$('result-max').value=r?.maximum??'';$('result-notes').value=r?.notes??'';
  $('topic-rows').replaceChildren();(r?.topics??[]).forEach(addTopicRow);
  $('topic-suggestions').innerHTML=C.topicNames(current()).map(t=>`<option value="${esc(t)}"></option>`).join('');
  $('result-error').textContent='';$('result-dialog').showModal();
}
$('new-result').onclick=()=>openResult();$('add-topic-row').onclick=()=>addTopicRow();
$('result-form').onsubmit=e=>{e.preventDefault();try{
  const r={id:editingResult??uid(),name:C.clean($('result-name').value),date:$('result-date').value,earned:Number($('result-earned').value),maximum:Number($('result-max').value),kind:$('result-kind').value,notes:$('result-notes').value.trim(),topics:[...$('topic-rows').children].map(row=>({name:C.clean(row.querySelector('.topic-name').value,160),earned:Number(row.querySelector('.topic-earned').value),maximum:Number(row.querySelector('.topic-max').value)}))};
  if(r.date>today())throw new Error('An assessment result cannot be in the future.');
  C.validateResult(r);updateSubject(s=>{const index=s.results.findIndex(x=>x.id===r.id);if(index<0)s.results.push(r);else s.results[index]=r;},'Result saved. Your progress and priorities are up to date.');$('result-dialog').close();
}catch(err){$('result-error').textContent=err.message;}};
$('timeline').onclick=e=>{const edit=e.target.closest('[data-edit-result]'),del=e.target.closest('[data-delete-result]');if(edit)openResult(edit.dataset.editResult);if(del)confirm('Delete this result?','This result and its topic breakdown will be removed.',()=>updateSubject(s=>{s.results=s.results.filter(r=>r.id!==del.dataset.deleteResult);},'Result deleted.'));};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`study-compass-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Backup exported. Keep this file somewhere safe; it contains your results.');};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw new Error('Backup is too large (maximum 5 MB).');const next=C.validateState(JSON.parse(await file.text()));confirm('Replace data with this backup?',`This backup contains ${next.subjects.length} subjects. It will replace the results currently in this browser. Export your current data first if needed.`,()=>{storageBlocked=false;selected=next.subjects[0]?.id??null;commit(next,'Backup imported.');});}catch(err){notify(`Import failed: ${err.message} Your current data is unchanged.`);}finally{e.target.value='';}};
function demo() {
  const name='Mathematics · sample';if(state.subjects.some(s=>s.name===name)){selected=state.subjects.find(s=>s.name===name).id;render();notify('Showing sample data.');return;}
  const dateAgo=days=>{const d=new Date();d.setDate(d.getDate()-days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const topics=['P3 / Calculus / Differentiation','P4 / Calculus / Integration','Algebra'];
  const sample={id:uid(),name,topics,goal:{target:80,date:dateAgo(-45)},results:[[[12,10,15],42],[[16,12,16],28],[[18,15,17],14],[[23,16,18],0]].map(([scores,days],i)=>({id:uid(),name:['Starting point','Practice paper 1','Practice paper 2','Progress check'][i],date:dateAgo(days),earned:scores.reduce((a,b)=>a+b,0),maximum:80,kind:'Raw marks',notes:'Sample data for exploring the app. Replace this subject with your own when ready.',topics:topics.map((name,j)=>({name,earned:scores[j],maximum:[30,30,20][j]}))}))};
  const next=structuredClone(state);next.subjects.push(sample);selected=sample.id;commit(next,'Sample subject added. These are fictional results, not your own.');
}
$('demo').onclick=demo;$('welcome-demo').onclick=demo;
render();
if(storageBlocked)document.querySelector('.local-tag').textContent='Saving unavailable';
if(document.modelContext?.registerTool){
  try{Promise.resolve(document.modelContext.registerTool({name:'read_study_progress',description:'Read the selected subject, its recorded results and rule-based practice priorities. Does not change data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:input=>{if(input&&Object.keys(input).length)throw new Error('No parameters are accepted.');const s=current();return s?{subject:s.name,goal:s.goal,results:C.series(s),priorities:C.priorities(s,today())}:{subject:null};}})).catch(()=>{});}catch{/* Optional browser capability. */}
}
