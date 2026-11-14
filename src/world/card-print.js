// Original deterministic print stock; canvas text remains editable source, never model-generated.
const TITLE='On the Rotational Equilibrium of a Buttered Felid';
export function printStock(T,kind,side,text=''){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=kind==='paper'?960:kind==='postcard'?512:kind==='recipe'?506:346;
 const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;let seed=kind==='paper'?51:kind==='postcard'?73:kind==='recipe'?117:91;
 const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 c.fillStyle=kind==='paper'?'#eeeae0':kind==='postcard'?'#f4ecd8':kind==='recipe'?'#f7f2e4':'#efdfb9';c.fillRect(0,0,w,h);
 for(let i=0;i<18000;i++){const v=rnd();c.fillStyle=v>.5?'rgba(255,255,255,.12)':'rgba(83,58,34,.045)';c.fillRect(rnd()*w,rnd()*h,1+rnd()*2,.7+rnd());}
 const base=c.getImageData(0,0,w,h);
 const wrapped=(str,x,y,width,size,leading)=>{c.font=`${size}px Georgia`;for(const paragraph of str.split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const next=line+word+' ';if(c.measureText(next).width>width&&line){c.fillText(line.trim(),x,y);y+=leading;line=word+' ';}else line=next;}c.fillText(line.trim(),x,y);y+=leading*1.4;}return y;};
 let glyph=0;
 if(kind==='paper'){
  // The rejected paper keeps the look it had as a page element before unit 5 (e1111-58): a bad grey photocopy,
  // Times title and byline, the text as greyed-out bars, a black REJECTED stamp; dark copier edges and toner specks.
  // Same proportions as that sheet (font .017u on a .36u-wide sheet), drawn at 768 px across.
  const sheet=document.createElement('canvas');sheet.width=w;sheet.height=h;const g=sheet.getContext('2d');
  const em=w*.017/.36,pad=[w*.06,w*.08];
  g.fillStyle='#e9e7e1';g.fillRect(0,0,w,h);g.fillStyle='#111';g.textAlign='center';g.textBaseline='alphabetic';
  let y=pad[0];
  const title=size=>{g.font=`700 ${size}px "Times New Roman",Times,serif`;const words=TITLE.split(' ');let line='',lines=[];for(const word of words){const next=line?line+' '+word:word;if(g.measureText(next).width>w-2*pad[1]&&line){lines.push(line);line=word;}else line=next;}lines.push(line);return lines;};
  const ts=1.25*em;for(const line of title(ts)){y+=ts*1.1;g.fillText(line,w/2,y-ts*.22);}
  y+=ts*.3;const bs=.85*em;g.font=`italic ${bs}px "Times New Roman",Times,serif`;y+=bs*1.25;g.fillText('S. Cat, Dept. of Applied Loafing',w/2,y-bs*.25);y+=.7*em;
  g.fillStyle='rgba(34,34,34,.55)';
  for(const [width,gap]of [[1,0],[.92,0],[1,0],[.6,0],[1,1],[.96,0],[.88,0],[1,0],[.4,0]]){y+=(gap?1:.34)*em;g.fillRect(pad[1],y,(w-2*pad[1])*width,.5*em);y+=.5*em;}   // block margins collapse: .34em apart
  if(side==='front'){
   // The stamp is the paper's identifying print: at 3.9 em its letters stay 12 CSS px tall on the smaller, angled
   // board (e1111-36), on a phone too (the old sheet's 2.3 em measured 11.2 px on desktop, 7.3 on a phone).
   // Condensed as needed so the rotated stamp stays inside the sheet (height is what identifies it).
   g.save();const ss=3.9*em;g.font=`900 ${ss}px Impact,"Arial Black",sans-serif`;const bh=ss*1.2+.44*ss,rot=17*Math.PI/180,full=g.measureText('REJECTED').width+.06*ss*7;
   const k=Math.min(1,((.88*w-bh*Math.sin(rot))/Math.cos(rot)-.7*ss)/full),tw=full*k,bw=tw+.7*ss;
   g.translate(Math.max(w*.12+bw/2,w/2),h*.36+bh/2);g.rotate(-17*Math.PI/180);g.globalAlpha=.82;g.strokeStyle='#111';g.lineWidth=.22*ss;g.strokeRect(-bw/2+.11*ss,-bh/2+.11*ss,bw-.22*ss,bh-.22*ss);
   g.fillStyle='#111';g.textAlign='center';g.textBaseline='middle';if('letterSpacing' in g)g.letterSpacing=`${(.06*ss).toFixed(1)}px`;g.scale(k,1);g.fillText('REJECTED',0,ss*.05);g.restore();glyph=Math.round(ss*.72);
  }
  // copier: black at the left edge, a softer shadow at the right, toner specks
  const edge=g.createLinearGradient(0,0,w,0);edge.addColorStop(0,'rgba(0,0,0,.275)');edge.addColorStop(.05,'rgba(0,0,0,0)');edge.addColorStop(.96,'rgba(0,0,0,0)');edge.addColorStop(1,'rgba(0,0,0,.125)');
  g.fillStyle=edge;g.fillRect(0,0,w,h);
  // the copier's grain: two octaves of value noise, inked where it is low (the old sheet's feTurbulence + alpha
  // threshold), at half strength, grains about 3 px so they read at the size the card lies on the floor
  const noise=(cell,seedOff)=>{const gw=Math.ceil(w/cell)+2,gh=Math.ceil(h/cell)+2,v=new Float32Array(gw*gh);for(let i=0;i<v.length;i++)v[i]=rnd();
   return (x,y)=>{const fx=x/cell,fy=y/cell,ix=fx|0,iy=fy|0,tx=fx-ix,ty=fy-iy,a=v[iy*gw+ix],b=v[iy*gw+ix+1],c2=v[(iy+1)*gw+ix],d2=v[(iy+1)*gw+ix+1];return a+(b-a)*tx+(c2-a)*ty+(a-b-c2+d2)*tx*ty;};};
  const n1=noise(3.2),n2=noise(1.6),grain=g.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const n=n1(x,y)*.66+n2(x,y)*.34,a=Math.min(1,Math.max(0,6.2-14*(n*.7+.15)));grain.data[(y*w+x)*4+3]=a*127;}
  const gc=document.createElement('canvas');gc.width=w;gc.height=h;gc.getContext('2d').putImageData(grain,0,0);g.drawImage(gc,0,0);
  // the back is the same sheet seen through: blank, with the print faintly mirrored through the paper
  let src=sheet;
  if(side!=='front'){src=document.createElement('canvas');src.width=w;src.height=h;const b=src.getContext('2d');b.fillStyle='#e9e7e1';b.fillRect(0,0,w,h);
   b.globalAlpha=.07;b.translate(w,0);b.scale(-1,1);b.drawImage(sheet,0,0);b.setTransform(1,0,0,1,0,0);b.globalAlpha=1;b.fillStyle=edge;b.fillRect(0,0,w,h);}
  c.save();c.filter='contrast(1.35) grayscale(1)';c.drawImage(src,0,0);c.restore();
 }else if(kind==='postcard'&&side==='front'){
  const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#171337');sky.addColorStop(.65,'#492352');sky.addColorStop(1,'#a6526c');c.fillStyle=sky;c.fillRect(24,24,w-48,h-48);
  for(let i=0;i<110;i++){c.fillStyle=['#f9e2aa','#ffffff','#a1cbd4'][i%3];c.beginPath();c.arc(30+rnd()*(w-60),30+rnd()*(h-65),.6+rnd()*1.5,0,Math.PI*2);c.fill();}
  c.fillStyle='#ecd28d';c.beginPath();c.arc(625,125,52,0,Math.PI*2);c.fill();c.fillStyle='#27203f';c.beginPath();c.arc(604,110,51,0,Math.PI*2);c.fill();
  c.fillStyle='#17152e';c.beginPath();c.moveTo(24,425);for(let x=24;x<w-24;x+=16)c.lineTo(x,410+13*Math.sin(x*.016));c.lineTo(w-24,h-24);c.lineTo(24,h-24);c.fill();
  c.fillStyle='#f8e8c6';c.font='italic 53px Georgia';c.fillText('Greetings from',60,150);c.textAlign='center';c.font='900 140px sans-serif';c.lineWidth=4;c.strokeStyle='#f9e9c7';c.strokeText('THE VOID',w/2,335);c.fillStyle='#34264f';c.fillText('THE VOID',w/2,335);glyph=105;
  c.textAlign='right';c.fillStyle='#f9e9c7';c.font='italic 26px Georgia';c.fillText('nothing for miles',w-50,h-50);
 }else if(kind==='postcard'){
  c.strokeStyle='#b7a98a';c.lineWidth=2;c.beginPath();c.moveTo(w*.55,50);c.lineTo(w*.55,h-50);c.stroke();c.strokeStyle='#a75b49';c.setLineDash([8,6]);c.strokeRect(w-140,45,90,113);c.setLineDash([]);c.fillStyle='#dcc772';c.fillRect(w-134,51,78,101);c.fillStyle='#9b4b3d';c.font='bold 60px Georgia';c.fillText('B',w-117,125);
  c.fillStyle='#424b6a';wrapped('wish you were here.\nthere is nothing here.\nit is very nice.\n— the cat',48,106,w*.46,34,45);
  c.strokeStyle='#d3c5a6';for(let y=240;y<410;y+=58){c.beginPath();c.moveTo(w*.61,y);c.lineTo(w-50,y);c.stroke();}
 }else if(kind==='ticket'){
  c.strokeStyle='#a83b2b';c.fillStyle='#a83b2b';c.lineWidth=5;c.strokeRect(22,22,w-44,h-44);c.lineWidth=2;c.strokeRect(48,46,w*.63,h-92);c.setLineDash([8,8]);c.beginPath();c.moveTo(w*.74,25);c.lineTo(w*.74,h-25);c.stroke();c.setLineDash([]);
  c.textAlign='center';c.font='28px Georgia';c.fillText(side==='front'?'ADMIT ONE':'KEEP THIS STUB',w*.38,98);c.font='bold 110px Georgia';c.save();c.translate(w*.38,0);c.scale(Math.min(1,440/c.measureText('BUTTAMAN').width),1);c.fillText('BUTTAMAN',0,205);c.restore();glyph=82;c.font='italic 29px Georgia';c.fillText(side==='front'?'the encore':'one more for the road',w*.38,267);
  c.save();c.translate(w*.875,h/2);c.rotate(Math.PI/2);c.font='26px Georgia';c.fillText('No. 0001',0,0);c.restore();
 }else if(kind==='recipe'){
  // A ruled index card (kitchen lane, e1111-58): printed red RECIPE and rules, the recipe written in ink.
  const ink='#26305a',rule='rgba(84,128,186,.42)',red='#b8473b',head=h*.24;
  c.strokeStyle=rule;c.lineWidth=2;for(let y=head+52;y<h-14;y+=50){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
  c.strokeStyle=red;c.lineWidth=3;c.beginPath();c.moveTo(0,head);c.lineTo(w,head);c.stroke();
  if(side==='front'){
   c.fillStyle=red;c.font='bold 30px Georgia';if('letterSpacing' in c)c.letterSpacing='4px';c.fillText('RECIPE',34,head-56);const rw=c.measureText('RECIPE').width;if('letterSpacing' in c)c.letterSpacing='0px';
   c.fillStyle=ink;c.font='italic bold 50px Georgia';const tw=c.measureText('Cake in a box').width;c.save();c.translate(Math.max(34+rw+28,w-34-Math.min(tw,w-110-rw)),head-50);c.scale(Math.min(1,(w-96-rw)/tw),1);c.fillText('Cake in a box',0,0);c.restore();glyph=36;
   c.fillStyle=red;c.font='italic 21px Georgia';c.fillText('from the kitchen of',34,head-12);const fw=c.measureText('from the kitchen of').width;c.fillStyle=ink;c.font='italic 32px Georgia';c.fillText('the cat',34+fw+12,head-12);
   c.font='italic 37px Georgia';const items=['flour','butter','milk','an egg'],steps=['all four in the box','close the lid','a good shake','open it again'];
   items.forEach((t,k)=>{c.fillText('– '+t,40,head+44+k*50);});
   steps.forEach((t,k)=>{c.fillText((k+1)+'. '+t,300,head+44+k*50);});
   c.save();c.translate(w-34,h-30);c.rotate(-.05);c.textAlign='right';c.font='italic 26px Georgia';c.fillStyle='rgba(38,48,90,.75)';c.fillText('serves one cat',0,0);c.restore();c.textAlign='left';
  }else{c.fillStyle='rgba(38,48,90,.5)';c.font='italic 26px Georgia';c.fillText('(keep in the box)',40,head+44);}
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;texture.generateMipmaps=true;
 return {texture,canvas,glyph,base};
}
