// After bird-visits.js and a reload: the time already waited is kept, so the 5-minute limit counts across visits.
cat.auto=false;const B=E.bird,was=store.get('birdcheck');
check('bird the limiter keeps the time waited across a reload',B.state==='waiting'&&B.schedule.away>=was.away&&B.schedule.due<=600000-was.away+50,JSON.stringify({was,now:B.schedule}));
