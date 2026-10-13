/* Offline vector PDF tiling. Coordinates and physical dimensions use PDF points. */
(function(root){
const P=root.PDFLib||(typeof require==='function'?require('./vendor/pdf-lib.min.js'):null);
const {PDFDocument,PDFName,StandardFonts,rgb,degrees,PrintScaling}=P;
const PAPER={tabloid:[792,1224],letter:[612,792],a3:[841.8898,1190.5512],a4:[595.2756,841.8898]};
function inspectPage(page,index){const box=page.getCropBox();const raw=page.node.get(PDFName.of('UserUnit'));const unit=raw&&typeof raw.asNumber==='function'?raw.asNumber():1;const rotation=((page.getRotation().angle%360)+360)%360;if(![0,90,180,270].includes(rotation))throw Error('第 '+(index+1)+' 页的旋转角度不是90度的倍数。');return {index,box,unit,rotation,width:(rotation%180?box.height:box.width)*unit,height:(rotation%180?box.width:box.height)*unit};}
function optionValues(options={}){return {paper:options.paper||'tabloid',orientation:options.orientation||'auto',margin:Number(options.margin??.5)*72,overlap:Number(options.overlap??.4)*72,marks:options.marks!==false,map:options.map===true};}
function layout(dim,pw,ph,o){const pad=o.marks?10:0,footer=14;const cw=pw-2*o.margin-2*pad,ch=ph-2*o.margin-2*pad-footer;if(cw<=o.overlap+24||ch<=o.overlap+24)throw Error('安全边距或粘合重叠太大，纸张没有足够的可打印区域。');const cols=Math.max(1,Math.ceil((dim.width-o.overlap-1e-7)/(cw-o.overlap))),rows=Math.max(1,Math.ceil((dim.height-o.overlap-1e-7)/(ch-o.overlap)));return {...dim,pw,ph,cw,ch,cols,rows,count:cols*rows,originX:o.margin+pad,originY:o.margin+pad+footer,stepX:cw-o.overlap,stepY:ch-o.overlap,margin:o.margin,overlap:o.overlap,pad};}
function planPages(dims,options={}){const o=optionValues(options);if(!PAPER[o.paper])throw Error('未知纸张尺寸');if(!Number.isFinite(o.margin)||o.margin<9||!Number.isFinite(o.overlap)||o.overlap<0)throw Error('安全边距至少0.125英寸，粘合重叠不能为负数。');let result=dims.map(dim=>{const [w,h]=PAPER[o.paper];if(o.orientation==='portrait')return layout(dim,w,h,o);if(o.orientation==='landscape')return layout(dim,h,w,o);const a=layout(dim,w,h,o),b=layout(dim,h,w,o);return a.count<=b.count?a:b;});if(result.reduce((a,p)=>a+p.count,0)>500)throw Error('当前设置超过500张纸，请先选择部分原稿页面或更大纸张。');return result;}
async function inspect(bytes){const doc=await PDFDocument.load(bytes);return doc.getPages().map(inspectPage);}
async function generate(bytes,options={},progress=()=>{}){
const source=await PDFDocument.load(bytes),dims=source.getPages().map(inspectPage),o=optionValues(options),plans=planPages(dims,options),out=await PDFDocument.create(),font=await out.embedFont(StandardFonts.Helvetica),bold=await out.embedFont(StandardFonts.HelveticaBold);out.setTitle('Poster tiled for '+o.paper);out.setSubject('Print at actual size 100%, single-sided. Overlap '+(o.overlap/72)+' inches.');out.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
const total=plans.reduce((n,p)=>n+p.count,0);let done=0;
function line(pg,x1,y1,x2,y2,dash=false){pg.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:.45,color:rgb(.25,.25,.25),...(dash?{dashArray:[2,2]}:{})});}
function tick(pg,x,y,axis){if(axis==='x'){line(pg,x,y,x,y+6)}else line(pg,x,y,x+6,y);}
function cross(pg,x,y){line(pg,x-3,y,x+3,y);line(pg,x,y-3,x,y+3)}
for(const plan of plans){const page=source.getPage(plan.index),box=plan.box;const srcEmbed=page.node.Contents()?await out.embedPage(page,{left:box.x,bottom:box.y,right:box.x+box.width,top:box.y+box.height}):null;const normalized=out.addPage([plan.width,plan.height]);const w=box.width*plan.unit,h=box.height*plan.unit;const pos=plan.rotation===90?{x:0,y:w}:plan.rotation===180?{x:w,y:h}:plan.rotation===270?{x:h,y:0}:{x:0,y:0};normalized.drawRectangle({x:0,y:0,width:plan.width,height:plan.height,color:rgb(1,1,1)});if(srcEmbed)normalized.drawPage(srcEmbed,{...pos,width:w,height:h,rotate:degrees(-plan.rotation)});const full=await out.embedPage(normalized,{left:0,bottom:0,right:plan.width,top:plan.height});out.removePage(out.getPages().indexOf(normalized));
if(o.map){const guide=out.addPage([plan.pw,plan.ph]);guide.drawText('ASSEMBLY MAP - SOURCE '+(plan.index+1),{x:40,y:plan.ph-65,size:18,font:bold});guide.drawText('Print artwork sheets at Actual size / 100%, single-sided.',{x:40,y:plan.ph-92,size:11,font});guide.drawText('Trim left/top at the ticks; retain right/bottom overlap underneath.',{x:40,y:plan.ph-112,size:10,font});const sc=Math.min((plan.pw-80)/plan.width,(plan.ph-220)/plan.height);guide.drawPage(full,{x:40,y:60,width:plan.width*sc,height:plan.height*sc});for(let r=0;r<plan.rows;r++)for(let c=0;c<plan.cols;c++){const x=40+c*plan.stepX*sc,y=60+plan.height*sc-r*plan.stepY*sc;guide.drawRectangle({x,y:y-Math.min(plan.ch,plan.height-r*plan.stepY)*sc,width:Math.min(plan.cw,plan.width-c*plan.stepX)*sc,height:Math.min(plan.ch,plan.height-r*plan.stepY)*sc,borderColor:rgb(.1,.4,.8),borderWidth:.7});guide.drawText('R'+(r+1)+' C'+(c+1),{x:x+4,y:y-14,size:9,font:bold,color:rgb(.1,.3,.7)});}}
for(let r=0;r<plan.rows;r++)for(let c=0;c<plan.cols;c++){
 const x0=c*plan.stepX,top=plan.height-r*plan.stepY,wTile=Math.min(plan.cw,plan.width-x0),hTile=Math.min(plan.ch,top),y0=top-hTile,pg=out.addPage([plan.pw,plan.ph]);const tile=await out.embedPage(normalized,{left:x0,bottom:y0,right:x0+wTile,top});const x=plan.originX,y=plan.originY+plan.ch-hTile;pg.drawPage(tile,{x,y,width:wTile,height:hTile});
 const trimLeft=c>0?o.overlap/2:0,trimTop=r>0?o.overlap/2:0,left=x+trimLeft,topEdge=y+hTile-trimTop;
 if(o.marks){
 // Marks stay in the reserved gutter, never across final artwork.
 for(const xx of [left,x+wTile]){tick(pg,xx,plan.originY-8,'x');tick(pg,xx,plan.originY+plan.ch+2,'x')}
 for(const yy of [y,topEdge]){tick(pg,plan.originX-8,yy,'y');tick(pg,plan.originX+plan.cw+2,yy,'y')}
 // Matching crosses lie only in overlap areas that will be cut off or covered.
 if(o.overlap>0){if(c>0)for(const yy of [y+hTile*.28,y+hTile*.72])cross(pg,x+o.overlap/4,yy);if(c<plan.cols-1)for(const yy of [y+hTile*.28,y+hTile*.72])cross(pg,x+plan.stepX+o.overlap/4,yy);if(r>0)for(const xx of [x+wTile*.28,x+wTile*.72])cross(pg,xx,y+hTile-o.overlap/4);if(r<plan.rows-1)for(const xx of [x+wTile*.28,x+wTile*.72])cross(pg,xx,plan.originY+o.overlap-o.overlap/4);}
 }
 pg.drawText('SOURCE '+(plan.index+1)+' | R'+(r+1)+' C'+(c+1)+' / '+plan.rows+'x'+plan.cols+' | 100% | SINGLE SIDED',{x:o.margin+10,y:o.margin+3,size:8,font:bold});pg.drawText('Overlap '+(o.overlap/72).toFixed(2)+' in | Trim left/top ticks; glue right/bottom underneath',{x:o.margin+10,y:plan.ph-o.margin-8,size:7,font});done++;progress(done,total);if(done%3===0)await new Promise(resolve=>setTimeout(resolve,0));
 }
}
return {bytes:await out.save(),plans,artworkPages:total,pageCount:out.getPageCount()};
}
const api={inspect,generate,planPages,inspectPage,PAPER};if(typeof module!=='undefined')module.exports=api;root.PDFTiler=api;
})(typeof window!=='undefined'?window:globalThis);
