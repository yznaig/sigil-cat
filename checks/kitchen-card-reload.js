// After kitchen-card.js and a reload: one recipe card, still pinned; it does not fall again.
cat.auto=false;await keepsakes.get('recipe')?.worldTask;const C=E.box.recipe;
check('card survives a reload pinned',keepsakes.get('recipe')?.worldEntry?.support?.id==='pinboard'&&C.state.card);
C.checkCard();await sleep(300);check('card falls only once',[...keepsakes.live.keys()].filter(id=>id==='recipe').length===1);
