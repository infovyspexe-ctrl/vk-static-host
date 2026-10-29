// VK Bridge only. No local success fallback and no reward for an absent/error response.
export function createVkAds({bridge,enabled=false,lock=()=>{},event=()=>{},fault=()=>{},clock=()=>Date.now(),timeout=180000}){
 let busy=false,last=clock(),bannerShown=false,bannerWanted=false,bannerFlight=null;
 const bounded=(promise,ms)=>new Promise((resolve,reject)=>{const id=setTimeout(()=>reject(Error('VK ad timeout')),ms);Promise.resolve(promise).then(v=>{clearTimeout(id);resolve(v);},e=>{clearTimeout(id);reject(e);});});
 // VK hides the game while its ad is open. Waiting for the player to close
 // that screen is not a failed SDK request; only time in the visible game counts.
 const showNative=format=>new Promise((resolve,reject)=>{
  let timer,settled=false,hidden=false,remaining=timeout,armedAt=Date.now();
  const finish=(callback,value)=>{if(settled)return;settled=true;clearTimeout(timer);bridge.unsubscribe?.(lifecycle);callback(value);};
  const arm=()=>{clearTimeout(timer);armedAt=Date.now();timer=setTimeout(()=>finish(reject,Error('VK ad timeout')),remaining);};
  const lifecycle=event=>{if(settled)return;const type=event?.detail?.type;if(type==='VKWebAppViewHide'&&!hidden){hidden=true;remaining=Math.max(0,remaining-(Date.now()-armedAt));clearTimeout(timer);}else if(type==='VKWebAppViewRestore'&&hidden){hidden=false;arm();}};
  bridge.subscribe?.(lifecycle);arm();
  try{Promise.resolve(bridge.send('VKWebAppShowNativeAds',{ad_format:format})).then(value=>finish(resolve,value),error=>finish(reject,error));}catch(error){finish(reject,error);}
 });
 async function available(format){if(!enabled||!bridge||busy)return false;try{return (await bounded(bridge.send('VKWebAppCheckNativeAds',{ad_format:format}),5000))?.result===true;}catch{return false;}}
 async function show(format){
  if(busy||!enabled||!bridge)return false;
  busy=true;lock(true);
  let hidden=globalThis.document?.hidden===true;
  const precheckLifecycle=event=>{if(event?.detail?.type==='VKWebAppViewHide')hidden=true;else if(event?.detail?.type==='VKWebAppViewRestore')hidden=false;};
  bridge.subscribe?.(precheckLifecycle);
  try{
   if((await bounded(bridge.send('VKWebAppCheckNativeAds',{ad_format:format}),1500))?.result!==true)return false;
   if(hidden||globalThis.document?.hidden===true)return false;
   let result;try{result=await showNative(format);}catch(error){if(error.message==='VK ad timeout')fault();return false;}
   if(result?.result!==true)return false;
   last=clock();event(format==='reward'?'reward_ad_shown':'interstitial_ad_shown');return true;
  }catch{return false;}finally{bridge.unsubscribe?.(precheckLifecycle);busy=false;lock(false);}
 }
 async function banner(visible){
  if(!enabled||!bridge)return;
  bannerWanted=!!visible;
  if(bannerFlight)return bannerFlight;
  bannerFlight=(async()=>{while(bannerShown!==bannerWanted){const target=bannerWanted;let expired=false;try{const pending=bridge.send(target?'VKWebAppShowBannerAd':'VKWebAppHideBannerAd',target?{banner_location:'bottom',layout_type:'resize',height_type:'compact'}:{});Promise.resolve(pending).then(()=>{if(target&&expired)void bridge.send('VKWebAppHideBannerAd',{}).catch(()=>{});},()=>{});const r=await bounded(pending,5000);if(target&&r?.result===false){bannerWanted=false;return;}bannerShown=target;}catch{expired=true;bannerWanted=bannerShown;return;}}})();
  try{await bannerFlight;}finally{bannerFlight=null;}
 }
 return {available,showReward:()=>show('reward'),transition:async()=>clock()-last>=120000?show('interstitial'):false,banner,get busy(){return busy;}};
}
