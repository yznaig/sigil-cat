// Original thin stock: front/back, a continuous edge, shallow corner curl and two fitted wedges.
export function cardGeometry(T,{width,height,thickness,curl=0,ticket=false}){
 const nx=24,ny=24,positions=[],uv=[],indices=[],groups=[];
 const xAt=(u,v)=>{
  let x=(u-.5)*width;if(ticket){const cut=Math.max(0,1-Math.abs(v-.55)/.09)*width*.035;if(u===0)x+=cut;if(u===1)x-=cut;}return x;
 };
 const zAt=(u,v)=>curl*Math.pow(u,5)*Math.pow(1-v,5)+curl*.12*Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
 for(const side of [1,-1])for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
  const u=i/nx,v=j/ny;positions.push(xAt(u,v),(v-.5)*height,zAt(u,v)+side*thickness/2);uv.push(side===1?u:1-u,v);
 }
 const count=(nx+1)*(ny+1);
 for(const [face,side]of [1,-1].entries()){
  const start=indices.length;
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const a=face*count+j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(side===1)indices.push(a,b,d,a,d,c);else indices.push(a,d,b,a,c,d);}
  groups.push({start,count:indices.length-start,materialIndex:face});
 }
 const boundary=[];for(let i=0;i<=nx;i++)boundary.push(i);for(let j=1;j<=ny;j++)boundary.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)boundary.push(ny*(nx+1)+i);for(let j=ny-1;j>0;j--)boundary.push(j*(nx+1));
 const edge=indices.length;for(let i=0;i<boundary.length;i++){const a=boundary[i],b=boundary[(i+1)%boundary.length];indices.push(a,a+count,b+count,a,b+count,b);}
 groups.push({start:edge,count:indices.length-edge,materialIndex:2});
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();for(const g of groups)geometry.addGroup(g.start,g.count,g.materialIndex);
 // Two eight-corner wedges follow the curl's actual corner heights. Interior
 // curvature is below 0.0025 world units; dense render-grid vertices do not
 // belong in a narrow-phase hull on every printed sheet.
 const shapes=[];for(let section=0;section<2;section++){const points=[];for(const u of [section/2,(section+1)/2])for(const v of [0,1])for(const side of [1,-1])points.push(xAt(u,v),(v-.5)*height,zAt(u,v)+side*thickness/2);shapes.push({type:'hull',points,massFraction:.5});}

 // Ticket stock has bevelled perimeter contact, rather than two curled wedges
 // with ledges wide enough to sleep upright. The print keeps its shallow curl.
 if(ticket){
  shapes.length=0;
  for(let section=0;section<2;section++){
   const points=[],left=(section/2-.5)*width,right=((section+1)/2-.5)*width;
   for(const inset of [0,.003])for(const x of [left+inset,right-inset])for(const y of [-height/2+inset,height/2-inset])for(const side of [-1,1])points.push(x,y,side*(inset?thickness/2:.0001));
   shapes.push({type:'hull',points,massFraction:.5});
  }
 }
 const vertices=[];for(let n=0;n<positions.length;n+=3)vertices.push(new T.Vector3(...positions.slice(n,n+3)));
 return {geometry,shapes,vertices};
}
