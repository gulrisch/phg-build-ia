import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { getPlanFeatures, PRO_UNLOCKS } from "./planFeatures";
import { generatePlanThumbnail } from "./generatePlanThumbnail";

const G=20,GOLD="#D4AF37",WALL_COLOR="#e2d5b0",WALL_T=14;
const API=import.meta.env.VITE_API_URL||"";
let _id=1;
const uid=()=>`e${_id++}`;
const snapV=v=>Math.round(v/G)*G;
const getToken=()=>localStorage.getItem("phg_token")||"";
const FLIB=[{type:"bed1",label:"Lit 1p",w:4*G,h:6*G,fill:"#5C4A32"},{type:"bed2",label:"Lit 2p",w:6*G,h:6*G,fill:"#5C4A32"},{type:"sofa",label:"Canap\u00e9",w:8*G,h:3*G,fill:"#2E5266"},{type:"tblr",label:"Table \u25cb",w:4*G,h:4*G,fill:"#7A6050",isRound:true},{type:"tbls",label:"Table \u25a1",w:6*G,h:3*G,fill:"#7A6050"},{type:"chr",label:"Chaise",w:2*G,h:2*G,fill:"#8A7060"},{type:"wc",label:"WC",w:2*G,h:3*G,fill:"#2E6E9E"},{type:"sink",label:"\u00c9vier",w:3*G,h:2*G,fill:"#2E6E9E"},{type:"shwr",label:"Douche",w:4*G,h:4*G,fill:"#2E6E9E"},{type:"bath",label:"Baignoire",w:4*G,h:8*G,fill:"#2E6E9E"},{type:"wrdb",label:"Armoire",w:6*G,h:2*G,fill:"#4A3728"},{type:"desk",label:"Bureau",w:6*G,h:3*G,fill:"#7A6050"},{type:"ktch",label:"Cuisine",w:8*G,h:2*G,fill:"#9A7A3A"},{type:"door",label:"Porte",w:G,h:3*G,fill:GOLD,isDoor:true},{type:"win",label:"Fen\u00eatre",w:4*G,h:G,fill:"#5AAFE0",isWin:true},{type:"strs",label:"Escalier",w:5*G,h:7*G,fill:"#555",isStairs:true},{type:"car",label:"Voiture",w:5*G,h:10*G,fill:"#3A3A3A"},{type:"pool",label:"Piscine",w:8*G,h:12*G,fill:"#1565C0",isPool:true},{type:"col",label:"Colonne",w:2*G,h:2*G,fill:"#888",isRound:true},{type:"tree",label:"Arbre",w:3*G,h:3*G,fill:"#2D6A2D",isRound:true}];
export default function PHGPlan2D({projectId,projectName="Projet",userTier="gratuit",onUpgrade}){
const features=getPlanFeatures(userTier);
const cvRef=useRef(null),wrapRef=useRef(null);
const [walls,setWalls]=useState([]),[items,setItems]=useState([]),[labels,setLabels]=useState([]),[sketches,setSketches]=useState([]),[selected,setSelected]=useState(null),[history,setHistory]=useState([]);
const [mode,setMode]=useState("precis"),[skMode,setSkMode]=useState("libre"),[tool,setTool]=useState("wall"),[showPanel,setShowPanel]=useState(true),[showGrid,setShowGrid]=useState(true),[scale,setScale]=useState(1),[pan,setPan]=useState({x:40,y:40}),[cvW,setCvW]=useState(600),[cvH,setCvH]=useState(500);
const [saveStatus,setSaveStatus]=useState("idle"),[lastSaved,setLastSaved]=useState(null),[loadStatus,setLoadStatus]=useState("idle"),[upgradeBanner,setUpgradeBanner]=useState(null);
const curWall=useRef(null),tapPts=useRef([]),skPts=useRef([]),dragInfo=useRef(null),lastPt=useRef({x:0,y:0}),saveTimer=useRef(null),S=useRef({});
useLayoutEffect(()=>{S.current={walls,items,labels,sketches,selected,mode,skMode,tool,showGrid,scale,pan,features};}); 
useEffect(()=>{if(!projectId)return;setLoadStatus("loading");fetch(`${API}/api/projects/${projectId}/plan`,{headers:{Authorization:`Bearer ${getToken()}`}}).then(r=>r.json()).then(data=>{if(data.walls)setWalls(data.walls);if(data.items)setItems(data.items);if(data.labels)setLabels(data.labels);if(data.sketches)setSketches(data.sketches);if(data.meta?.scale)setScale(data.meta.scale);if(data.meta?.pan)setPan(data.meta.pan);if(data.updated_at)setLastSaved(data.updated_at);setLoadStatus("loaded");}).catch(()=>setLoadStatus("error"));},[projectId]);
const doSave=useCallback((ws,it,lb,sk)=>{if(!projectId)return;setSaveStatus("saving");const thumbnail=generatePlanThumbnail({walls:ws,items:it,labels:lb});fetch(`${API}/api/projects/${projectId}/plan`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${getToken()}`},body:JSON.stringify({walls:ws,items:it,labels:lb,sketches:sk,meta:{scale,pan},thumbnail})}).then(r=>r.json()).then(data=>{setSaveStatus("saved");if(data.updated_at)setLastSaved(data.updated_at);setTimeout(()=>setSaveStatus("idle"),2500);}).catch(()=>{setSaveStatus("error");setTimeout(()=>setSaveStatus("idle"),4000);});},[projectId,scale,pan]);
const isFirstLoad=useRef(true);
useEffect(()=>{if(!features.autosaveDB)return;if(loadStatus!=="loaded"&&loadStatus!=="idle")return;if(isFirstLoad.current&&loadStatus==="loaded"){isFirstLoad.current=false;return;}clearTimeout(saveTimer.current);saveTimer.current=setTimeout(()=>doSave(walls,items,labels,sketches),2000);},[walls,items,labels,sketches,features.autosaveDB,doSave,loadStatus]);
const saveNow=()=>{clearTimeout(saveTimer.current);doSave(walls,items,labels,sketches);};
useEffect(()=>{const ro=new ResizeObserver(([e])=>{setCvW(Math.floor(e.contentRect.width));setCvH(Math.floor(e.contentRect.height));});if(wrapRef.current)ro.observe(wrapRef.current);return()=>ro.disconnect();},[]);
useEffect(()=>{const cv=cvRef.current;if(cv){cv.width=cvW;cv.height=cvH;}},[cvW,cvH]);
const toWorld=(cx,cy)=>{const r=cvRef.current.getBoundingClientRect();return{x:(cx-r.left-pan.x)/scale,y:(cy-r.top-pan.y)/scale};};
const toSnap=(cx,cy)=>{const{x,y}=toWorld(cx,cy);return{x:snapV(x),y:snapV(y)};};
const saveH=()=>setHistory(h=>[...h.slice(-30),{walls:[...walls],items:[...items],labels:[...labels],sketches:[...sketches]}]);
const undo=()=>setHistory(h=>{if(!h.length)return h;const p=h[h.length-1];setWalls(p.walls);setItems(p.items);setLabels(p.labels);setSketches(p.sketches);return h.slice(0,-1);});
const hitTest=(x,y)=>{for(let i=items.length-1;i>=0;i--){const it=items[i];if(x>=it.x&&x<=it.x+it.w&&y>=it.y&&y<=it.y+it.h)return{k:"item",id:it.id,i};}for(let i=walls.length-1;i>=0;i--){const wl=walls[i];const dx=wl.x2-wl.x1,dy=wl.y2-wl.y1,L=Math.sqrt(dx*dx+dy*dy);if(!L)continue;const t=Math.max(0,Math.min(1,((x-wl.x1)*dx+(y-wl.y1)*dy)/(L*L)));const px=wl.x1+t*dx-x,py=wl.y1+t*dy-y;if(Math.sqrt(px*px+py*py)<WALL_T+5)return{k:"wall",id:wl.id,i};}for(let i=labels.length-1;i>=0;i--){const lb=labels[i];if(Math.abs(x-lb.x)<60&&Math.abs(y-lb.y)<18)return{k:"label",id:lb.id,i};}return null;};
return <div style={{color:"#e8d5a3",background:"#0a0a0a",height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Georgia,serif"}}><span style={{color:"#D4AF37",fontSize:"2rem"}}>𓂀 PHG Plan 2D — En cours de chargement</span></div>;
}
