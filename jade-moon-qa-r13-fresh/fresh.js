(()=>{
 const values=new Map(),memory=new Map(),listeners=new Set();let failRead=true,writes=0;
 Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size}}});
 window.vkBridge={subscribe:f=>listeners.add(f),unsubscribe:f=>listeners.delete(f),send:async(method,args={})=>{
 if(method==='VKWebAppInit'){await new Promise(r=>setTimeout(r,1200));return {result:true}};
 if(method==='VKWebAppStorageGet'){if(failRead)throw Error('Injected initial cloud read failure');return {keys:args.keys.map(key=>({key,value:values.get(key)||''}))}};
 if(method==='VKWebAppStorageSet'){writes++;values.set(args.key,args.value);return {result:true}};
 if(/NativeAds|BannerAd/.test(method))return {result:false};return {result:true};}};
 document.addEventListener('DOMContentLoaded',()=>{const b=document.createElement('button');b.id='qa-read-recover';b.textContent='QA: recover read';b.style='position:fixed;bottom:0;left:0;z-index:30000;font:12px sans-serif';b.onclick=()=>{failRead=false;b.textContent='QA: isolated fresh save';};document.body.append(b);const p=document.createElement('pre');p.id='qa-fresh-status';p.style='position:fixed;bottom:20px;left:0;z-index:30000;background:white;color:black;font:10px sans-serif;margin:0';document.body.append(p);setInterval(()=>p.textContent=JSON.stringify({scope:'injected Bridge + memory storage',realCloudWrites:0,simulatedWrites:writes,readFailure:failRead}),500);});
})();