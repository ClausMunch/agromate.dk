// Shared confirmation above the current game/account dialog. Text is never HTML.
(() => {
 'use strict';
 const dialog=document.getElementById('confirm-dialog'),cancel=document.getElementById('confirm-cancel');
 let pending=null;
 function finish(accepted){
  if(!pending)return;
  const current=pending;pending=null;
  if(dialog.open)dialog.close();
  if(current.focus?.isConnected&&!current.focus.disabled)current.focus.focus({preventScroll:true});
  current.resolve(accepted);
 }
 function ask({title,message,accept='Continue',note='',danger=false,owner=null}){
  if(pending)return Promise.resolve(false);
  document.getElementById('confirm-heading').textContent=title;
  document.getElementById('confirm-message').textContent=message;
  const detail=document.getElementById('confirm-note');detail.textContent=note;detail.hidden=!note;
  document.getElementById('confirm-accept').textContent=accept;
  document.getElementById('confirm-kicker').textContent=danger?'A MOMENT TO BE SURE':'ONE MORE THING';
  dialog.classList.toggle('confirm-danger',danger);
  return new Promise(resolve=>{
   pending={resolve,owner,focus:document.activeElement};
   dialog.showModal();cancel.focus();
  });
 }
 cancel.addEventListener('click',()=>finish(false));
 document.getElementById('confirm-accept').addEventListener('click',()=>finish(true));
 dialog.querySelector('.dialog-close').addEventListener('click',()=>finish(false));
 dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
 dialog.addEventListener('close',()=>{if(!dialog.open)finish(false);});
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const r=dialog.getBoundingClientRect();
  if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)finish(false);
 });
 for(const owner of document.querySelectorAll('dialog'))if(owner!==dialog)owner.addEventListener('close',()=>{if(pending?.owner===owner)finish(false);});
 window.AgromateConfirm=Object.assign(ask,{cancel:()=>finish(false)});
})();
