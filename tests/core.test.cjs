const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../dist/core.js');
const result = (changes={}) => ({id:'r1',name:'Quiz',date:'2026-09-16',earned:35,maximum:50,kind:'Raw marks',notes:'',topics:[],...changes});
const subject = results => ({id:'s1',name:'Maths',topics:['Calculus','Algebra'],goal:{target:80,date:''},results});
test('zero is valid; invalid marks and impossible dates are rejected',()=>{
  assert.equal(C.validateResult(result({earned:0})).earned,0);
  for(const change of [{maximum:0},{earned:-1},{earned:51},{earned:NaN},{earned:'35'},{date:'2026-02-30'}])assert.throws(()=>C.validateResult(result(change)));
});
test('complete and partial breakdowns fit earned, available and lost totals',()=>{
  C.validateResult(result({topics:[{name:'Calculus',earned:20,maximum:30}]}));
  C.validateResult(result({topics:[{name:'Calculus',earned:20,maximum:30},{name:'Algebra',earned:15,maximum:20}]}));
  for(const topics of [[{name:'C',earned:36,maximum:40}],[{name:'C',earned:0,maximum:30}],[{name:'C',earned:10,maximum:20},{name:'c',earned:10,maximum:20}]])assert.throws(()=>C.validateResult(result({topics})));
});
test('series uses real date order and leaves unknown topic scores out',()=>{
  const s=subject([result({date:'2026-09-16'}),result({id:'r2',date:'2026-08-01',topics:[{name:'Calculus',earned:0,maximum:10}]})]);
  assert.equal(C.series(s)[0].date,'2026-08-01');assert.equal(C.series(s,'Calculus').length,1);assert.equal(C.series(s,'Calculus')[0].value,0);
});
test('priorities pool latest three scores; distinguish unknown and maintenance',()=>{
  const s=subject([10,20,25,30].map((n,i)=>result({id:`r${i}`,date:`2026-09-0${i+1}`,earned:n+15,maximum:50,topics:[{name:'Calculus',earned:n,maximum:30},{name:'Algebra',earned:15,maximum:20}]})));
  const ranked=C.priorities(s,'2026-09-30');assert.equal(ranked[0].name,'Algebra');assert.equal(ranked[0].status,'focus');assert.equal(ranked[1].status,'maintain');assert.equal(ranked[1].count,3);assert.ok(ranked[1].stale);assert.ok(Math.abs(ranked[1].score-83.3333)<.001);
  assert.equal(C.priorities(subject([]),'2026-09-16')[0].status,'unknown');
});
test('JSON round-trip and malformed imports',()=>{
  const state={version:1,subjects:[subject([result()])]};assert.deepEqual(C.validateState(JSON.parse(JSON.stringify(state))),state);
  for(const bad of [{version:2,subjects:[]},{version:1,subjects:[subject([result(),result()])]},{version:1,subjects:[{...subject([]),goal:{target:101,date:''}}]}])assert.throws(()=>C.validateState(bad));
});
