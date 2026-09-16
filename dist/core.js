(function (root) {
  'use strict';
  const clean = (value, max = 100) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`Enter a name between 1 and ${max} characters.`);
    return value.trim();
  };
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  function marks(earned, maximum) {
    if (typeof earned !== 'number' || typeof maximum !== 'number' || !Number.isFinite(earned) || !Number.isFinite(maximum) || maximum <= 0 || maximum > 1e6 || earned < 0 || earned > maximum) throw new Error('Marks must be numbers: available marks greater than 0 (up to 1,000,000), earned marks from 0 to the maximum.');
  }
  const percentage = (earned, maximum) => earned / maximum * 100;
  function validateResult(r) {
    clean(r.id); clean(r.name);
    if (!validDate(r.date)) throw new Error('Enter a valid assessment date.');
    marks(r.earned, r.maximum);
    if (!['Raw marks', 'UMS', 'Points'].includes(r.kind)) throw new Error('Choose a supported score type.');
    if (typeof r.notes !== 'string' || r.notes.length > 1000 || !Array.isArray(r.topics) || r.topics.length > 100) throw new Error('Invalid notes or topic breakdown.');
    const names = new Set();
    let earned = 0, maximum = 0;
    for (const t of r.topics) {
      const name = clean(t.name, 160).toLowerCase();
      if (names.has(name)) throw new Error('Use each topic only once in a result.');
      names.add(name); marks(t.earned, t.maximum); earned += t.earned; maximum += t.maximum;
    }
    if (earned > r.earned + 1e-7 || maximum > r.maximum + 1e-7 || maximum - earned > r.maximum - r.earned + 1e-7) throw new Error('Topic marks do not fit the overall result. Use non-overlapping topics on the same scale; earned, available and lost marks cannot exceed the overall totals.');
    return r;
  }
  function validateState(state) {
    if (!state || state.version !== 1 || !Array.isArray(state.subjects) || state.subjects.length > 100) throw new Error('This is not a supported Study Compass backup.');
    const ids = new Set(), names = new Set();
    for (const s of state.subjects) {
      clean(s.id); const name = clean(s.name, 80).toLowerCase();
      if (ids.has(s.id) || names.has(name)) throw new Error('Duplicate subject in backup.');
      ids.add(s.id); names.add(name);
      if (!Array.isArray(s.topics) || s.topics.length > 100 || !Array.isArray(s.results) || s.results.length > 5000) throw new Error('Invalid subject data.');
      const topics = new Set();
      for (const t of s.topics) { const key = clean(t, 160).toLowerCase(); if (topics.has(key)) throw new Error('Duplicate topic.'); topics.add(key); }
      if (s.goal !== null && (!s.goal || typeof s.goal.target !== 'number' || !Number.isFinite(s.goal.target) || s.goal.target < 1 || s.goal.target > 100 || (s.goal.date !== '' && !validDate(s.goal.date)))) throw new Error('Invalid goal.');
      const results = new Set();
      for (const r of s.results) { validateResult(r); if (results.has(r.id)) throw new Error('Duplicate result.'); results.add(r.id); }
    }
    return state;
  }
  const ordered = subject => [...subject.results].sort((a, b) => a.date.localeCompare(b.date));
  const topicNames = subject => [...new Map([...subject.topics, ...subject.results.flatMap(r => r.topics.map(t => t.name))].map(n => [n.toLowerCase(), n])).values()];
  function series(subject, topic = null) {
    return ordered(subject).flatMap(r => {
      const score = topic === null ? r : r.topics.find(t => t.name.toLowerCase() === topic.toLowerCase());
      return score ? [{date:r.date, name:r.name, kind:r.kind, value:percentage(score.earned, score.maximum), earned:score.earned, maximum:score.maximum}] : [];
    });
  }
  function priorities(subject, today) {
    const target = subject.goal?.target ?? 80;
    return topicNames(subject).map(name => {
      const points = series(subject, name), recent = points.slice(-3);
      if (!recent.length) return {name, status:'unknown', score:null, gap:null, count:0, stale:false};
      const score = percentage(recent.reduce((n,p) => n+p.earned,0), recent.reduce((n,p) => n+p.maximum,0));
      return {name, score, gap:Math.max(0,target-score), status:score < target ? 'focus' : 'maintain', count:recent.length, stale:(Date.parse(today)-Date.parse(recent.at(-1).date))/86400000 > 14};
    }).sort((a,b) => ({focus:0,unknown:1,maintain:2}[a.status]-{focus:0,unknown:1,maintain:2}[b.status]) || (b.gap??0)-(a.gap??0));
  }
  const api = {clean, validDate, marks, percentage, validateResult, validateState, ordered, topicNames, series, priorities};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudyCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
