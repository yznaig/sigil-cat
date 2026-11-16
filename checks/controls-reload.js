// Controls lane (playtest-4): after a reload the zoom is where the player left it (checks/controls.js set it to the most).
const q=new URLSearchParams(location.search),{ZOOM}=await import(new URL('src/ui/zoom.js',document.baseURI).href);
const zin=document.querySelector('#zoom');
check('controls reload: the zoom survives a reload (the slider and the camera)',Math.abs(stage.zoom-ZOOM.max)<1e-6&&Number(zin?.value)===Math.round(ZOOM.max*100),JSON.stringify({zoom:stage.zoom,value:zin?.value}));
