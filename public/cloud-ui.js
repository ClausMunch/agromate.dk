(() => {
'use strict';
const $=id=>document.getElementById(id),farm=window.AgromateFarm;
let storage;try{storage=sessionStorage;}catch{storage=null;}
const drafts=new PrivateDraft(storage);
let guest=farm.hasFarm()?farm.snapshot():null,profileIdentity=null,operation=false,scoreSequence=0;
const copy=value=>value==null?null:JSON.parse(JSON.stringify(value));
const sync=new CloudSync({
  onStatus:()=>render(),
  onDetach:()=>{drafts.clear();if(!$('title-screen').open)$('account-dialog').close();farm.replace(copy(guest));},
  onLoad:state=>{if(!$('title-screen').open)$('account-dialog').close();farm.replace(state);drafts.write(sync.user.id,sync.revision,state);render();}
});
function render(){
  if(sync.mode==='cloud'&&sync.user)drafts.write(sync.user.id,sync.revision,farm.snapshot());
  $('account-status').textContent=sync.status;
  $('signed-out-controls').hidden=Boolean(sync.user);$('signed-in-controls').hidden=!sync.user;
  $('google-login').hidden=!sync.loginAvailable;$('login-unavailable').hidden=sync.loginAvailable;
  $('saved').textContent=sync.mode==='cloud'?sync.status:($('saved').textContent.startsWith('●')?$('saved').textContent:'● Local farm on this device');
  $('title-save-status').textContent=sync.mode==='cloud'?sync.status:($('saved').textContent.includes('unavailable')?'Local saving is unavailable. Keep this page open.':'Your local farm is saved on this device.');
  if(sync.user){
    $('account-name').textContent=`Signed in as ${sync.user.public_name}.`;
    if(profileIdentity!==String(sync.user.id)){profileIdentity=String(sync.user.id);$('public-name').value=sync.user.public_name;$('leaderboard-opt-in').checked=sync.user.leaderboard_opt_in;}
  }else{profileIdentity=null;$('public-name').value='';$('leaderboard-opt-in').checked=false;}
  const disabled=operation||sync.busy;
  $('farm-reset').disabled=disabled;
  for(const id of ['cloud-load','cloud-import','cloud-replace','cloud-retry','draft-recover','account-delete','account-logout'])$(id).disabled=disabled;
  $('cloud-import').disabled=disabled||sync.mode==='cloud'||!farm.hasFarm();
  $('cloud-replace').disabled=disabled||!farm.hasFarm();
  $('cloud-retry').disabled=disabled||sync.mode!=='cloud'||!sync.pending||sync.conflict;
  $('cloud-mode').textContent=sync.mode==='cloud'?`Playing the cloud farm · revision ${sync.revision}. Local guest farm is kept separately.`:'Playing the local farm. Cloud saving is off until you choose import or load.';
  $('draft-recover').hidden=!sync.user||sync.mode==='cloud'||!drafts.read(sync.user.id);
}
async function run(action){
  if(operation)return;operation=true;render();const ticket=sync.epoch;
  try{await action();}
  catch(error){if(ticket===sync.epoch)sync.statusChange(error.status===409?'Cloud conflict · choose Load cloud or Replace cloud':`Request not completed · ${error.message}`);}
  finally{operation=false;render();}
}
async function refresh(){
  try {await sync.refresh();drafts.read(sync.user?.id);render();}
  catch{sync.statusChange('Account service unavailable · local play remains available');}
}
function announce(){const message={account_id:sync.user?.id??null,time:Date.now()};try{channel?.postMessage(message);}catch{}try{localStorage.setItem('agromate-session-event',JSON.stringify(message));}catch{}}
function changedAccount(message){if(String(message.account_id)!==String(sync.user?.id??null)){sync.detach();sync.user=null;render();}refresh();}
let channel;try{channel=new BroadcastChannel('agromate-session');channel.onmessage=e=>changedAccount(e.data);}catch{}
window.addEventListener('storage',e=>{if(e.key==='agromate-session-event'){try{changedAccount(JSON.parse(e.newValue));}catch{}}});
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
window.AgromateCloud={
  journalStatus:()=>sync.mode==='cloud'?sync.status+' · private draft stays in this tab until sign-out':null,
  record(state){
    if(sync.mode==='cloud'){
      const saved=drafts.write(sync.user.id,sync.revision,state);
      sync.changed(state);$('saved').textContent=saved?'● Private draft saved in this tab · '+sync.status:'● Private draft unavailable · '+sync.status;return true;
    }
    guest=copy(state);return false;
  }
};
function openAccount(){farm.pause();$('account-dialog').showModal();refresh();}
$('google-login').onclick=()=>{if(sync.loginAvailable)location.assign('/auth/google');};
$('account-open').onclick=openAccount;$('title-account-open').onclick=openAccount;$('account-close').onclick=()=>$('account-dialog').close();
$('cloud-load').onclick=()=>{if(confirm('Load the cloud farm? Unsynced changes to the current cloud farm will be discarded. Your local guest farm stays separate.'))run(()=>sync.load());};
$('cloud-import').onclick=()=>run(()=>sync.importLocal(farm.snapshot()));
$('cloud-replace').onclick=()=>{if(confirm('Replace the latest cloud farm with the current farm? This overwrites the one cloud slot. Any later change from another device will still cause a conflict.'))run(()=>sync.importLocal(farm.snapshot(),true));};
$('cloud-retry').onclick=()=>run(()=>sync.flush());
$('cloud-local').onclick=()=>{if(sync.mode!=='cloud'||confirm('Return to the local farm? This tab’s private cloud draft will be removed.')){sync.detach();render();}};
$('draft-recover').onclick=()=>run(async()=>{
  await sync.refresh();const draft=drafts.read(sync.user?.id);if(!draft)return;
  const prepared=window.AgromateProgression.migrate(draft.state);farm.replace(prepared);sync.mode='cloud';sync.revision=draft.revision;sync.conflict=true;sync.pending=copy(prepared);sync.statusChange('Private draft recovered · choose Replace cloud to upload or Load cloud to discard it');
});
$('profile-form').onsubmit=e=>{e.preventDefault();run(async()=>{const id=sync.user.id,ticket=sync.epoch;const data=await sync.bound('/api/profile',{method:'PATCH',body:JSON.stringify({public_name:$('public-name').value.trim(),leaderboard_opt_in:$('leaderboard-opt-in').checked})},ticket,id);if(data){await sync.refresh();profileIdentity=null;sync.statusChange('Public profile saved');}});};
$('account-logout').onclick=()=>run(async()=>{await sync.logout();announce();});
$('account-delete').onclick=()=>{if(confirm('Permanently delete your account, public profile and cloud farm? Your local guest farm will remain.'))run(async()=>{await sync.logout(true);announce();});};
$('farm-reset').onclick=()=>{if(confirm(`Reset the ${sync.mode==='cloud'?'cloud':'local'} farm? ${sync.mode==='cloud'?'The new farm will save to the current cloud slot.':'The local farm on this device will be erased.'}`)){
  farm.reset(sync.mode==='cloud');if(sync.mode==='cloud'){const state=farm.snapshot();drafts.write(sync.user.id,sync.revision,state);sync.changed(state);}else{guest=null;try{localStorage.removeItem('agromate-save');$('saved').textContent='● New local farm';}catch{$('saved').textContent='● Local reset could not be saved';}}
  $('account-dialog').close();render();
}};
async function openScoreboard(){farm.pause();$('scoreboard-dialog').showModal();$('scoreboard-entries').replaceChildren();$('scoreboard-status').textContent='Loading public farms…';const sequence=++scoreSequence;try{
  const data=await sync.request('/api/leaderboard');if(sequence!==scoreSequence)return;
  for(const entry of data.entries){const tr=document.createElement('tr');for(const text of [entry.public_name,Number(entry.score).toLocaleString()+'g']){const td=document.createElement('td');td.textContent=text;tr.append(td);}$('scoreboard-entries').append(tr);}
  $('scoreboard-status').textContent=data.entries.length?'':'No public farms yet. Participation is optional in Account & cloud.';
}catch{$('scoreboard-status').textContent='Scoreboard unavailable. Please try again later.';}}
$('scoreboard-open').onclick=openScoreboard;$('title-scoreboard-open').onclick=openScoreboard;$('scoreboard-close').onclick=()=>{scoreSequence++;$('scoreboard-dialog').close();};
refresh().then(announce);
})();
