/* Session-bound cloud saves. No private farm is persisted in browser storage. */
(function(root){
'use strict';
class CloudSync {
  constructor({prepare=state=>root.AgromateProgression?root.AgromateProgression.migrate(state):state,fetch:fetcher=globalThis.fetch.bind(globalThis),onStatus=()=>{},onDetach=()=>{},onLoad=()=>{},delay=3000}={}) {
    this.prepare=prepare;this.fetch=fetcher;this.onStatus=onStatus;this.onDetach=onDetach;this.onLoad=onLoad;this.delay=delay;
    this.user=null;this.csrf='';this.loginAvailable=false;this.mode='local';this.epoch=0;this.sessionSequence=0;this.revision=null;this.status='Local farm · saved on this device';this.timer=null;this.pending=null;this.busy=false;this.conflict=false;
  }
  statusChange(text){this.status=text;this.onStatus(text);}
  async request(path,options={}){const response=await this.fetch(path,{credentials:'same-origin',cache:'no-store',...options,headers:{Accept:'application/json',...options.headers}});let data;try{data=await response.json();}catch{throw Error('Server unavailable');}if(!response.ok){const error=Error(data.message||data.error||`Request failed (${response.status})`);error.status=response.status;error.code=data.error;throw error;}return data;}
  async refresh(){const sequence=++this.sessionSequence;const epoch=this.epoch;const data=await this.request('/api/session');if(sequence!==this.sessionSequence||epoch!==this.epoch)return false;const changed=this.user&&String(this.user.id)!==String(data.user?.id);if(changed)this.detach();this.user=data.user;this.csrf=data.csrf_token;this.loginAvailable=data.login_available;this.onStatus(this.status);return true;}
  async bound(path,options={},ticket=this.epoch,id=this.user?.id){
    await this.refresh();
    if(ticket!==this.epoch||!this.user||String(this.user.id)!==String(id))return null;
    try {const data=await this.request(path,{...options,headers:{'Content-Type':'application/json','X-CSRF-TOKEN':this.csrf,'X-Account-ID':String(id),...options.headers}});if(ticket!==this.epoch)return null;if(path==='/api/save'&&String(data.account_id)!==String(id)){this.detach();throw Error('Account changed; reload session');}return data;}
    catch(error){if(ticket===this.epoch&&(error.status===401||error.status===419||error.status===403||error.code==='account_changed')){this.detach();this.user=null;await this.refresh().catch(()=>{});}throw error;}
  }
  async load(){
    if(!this.user||this.busy)return;
    const ticket=this.epoch,id=this.user.id;this.busy=true;this.onStatus(this.status);
    try {
    const data=await this.bound('/api/save',{},ticket,id);
    if(!data)return;
    if(!data.save){this.statusChange('No cloud farm yet · explicitly import your local farm');return;}
    const prepared=this.prepare(data.save.state);
    clearTimeout(this.timer);this.pending=null;this.mode='cloud';this.revision=data.save.revision;this.conflict=false;this.onLoad(prepared);this.statusChange('Cloud farm loaded · changes sync while this page stays open');
    } finally {if(ticket===this.epoch){this.busy=false;this.onStatus(this.status);}}
  }
  async importLocal(state,replace=false){
    if(!this.user||this.busy)return;
    state=this.prepare(state);
    const ticket=this.epoch,id=this.user.id;this.busy=true;this.onStatus(this.status);
    try {
    const data=await this.bound('/api/save',{},ticket,id);
    if(!data)return;
    if(data.save&&!replace){this.conflict=true;this.statusChange('Cloud farm exists · choose Load cloud or Replace cloud explicitly');return;}
    const result=await this.bound('/api/save',{method:'PUT',body:JSON.stringify({revision:data.save?.revision||0,state})},ticket,id);
    if(!result)return;
    const prepared=this.prepare(result.save.state);
    clearTimeout(this.timer);this.pending=null;this.mode='cloud';this.revision=result.save.revision;this.conflict=false;this.onLoad(prepared);this.statusChange('Saved to cloud');
    } catch(error){if(ticket===this.epoch&&error.status===409){this.conflict=true;this.statusChange('Cloud conflict · choose Load cloud or Replace cloud');}throw error;}
    finally {if(ticket===this.epoch){this.busy=false;this.onStatus(this.status);}}
  }
  changed(state){
    if(this.mode!=='cloud')return;
    this.pending=JSON.parse(JSON.stringify(state));
    if(this.conflict)return;
    this.statusChange('Cloud changes pending · keep this page open');
    if(!this.timer&&!this.busy)this.timer=setTimeout(()=>{this.timer=null;this.flush();},this.delay);
  }
  async flush(){
    if(this.busy||this.conflict||this.mode!=='cloud'||!this.pending)return;
    const ticket=this.epoch,id=this.user?.id,state=this.pending,revision=this.revision;
    this.pending=null;this.busy=true;this.statusChange('Saving to cloud…');
    try {
      const data=await this.bound('/api/save',{method:'PUT',body:JSON.stringify({revision,state})},ticket,id);
      if(!data)return;
      this.revision=data.save.revision;this.statusChange(this.pending?'Cloud changes pending · keep this page open':'Saved to cloud');
    } catch(error){
      if(ticket!==this.epoch)return;
      if(!this.pending)this.pending=state;
      if(error.status===409){this.conflict=true;this.statusChange('Cloud conflict · choose Load cloud or Replace cloud');}
      else this.statusChange('Cloud not saved · '+error.message+' · retry explicitly');
    } finally {
      if(ticket===this.epoch){this.busy=false;if(this.pending&&!this.conflict&&this.status.startsWith('Cloud changes pending'))this.timer=setTimeout(()=>{this.timer=null;this.flush();},this.delay);this.onStatus(this.status);}
    }
  }
  async logout(remove=false){
    const id=this.user?.id,csrf=this.csrf;
    this.detach();this.user=null;this.sessionSequence++;
    const ticket=this.epoch;
    try {await this.request(remove?'/api/account':'/api/logout',{method:remove?'DELETE':'POST',headers:{'Content-Type':'application/json','X-CSRF-TOKEN':csrf,'X-Account-ID':String(id)}});if(ticket===this.epoch)this.statusChange(remove?'Account deleted · local farm retained':'Signed out · local farm restored');}
    catch(error){if(ticket===this.epoch){this.statusChange('Sign out/deletion not confirmed · '+error.message);await this.refresh().catch(()=>{});}throw error;}
  }
  detach(){clearTimeout(this.timer);this.timer=null;this.epoch++;this.pending=null;this.mode='local';this.revision=null;this.busy=false;this.conflict=false;this.onDetach();this.statusChange('Local farm · cloud disconnected');}
}
root.CloudSync=CloudSync;if(typeof module!=='undefined')module.exports={CloudSync};
})(typeof window==='undefined'?globalThis:window);
