(function(root){'use strict';
class PrivateDraft {
  constructor(storage){this.storage=storage;this.key='agromate-private-draft';}
  write(id,revision,state){try{this.storage.setItem(this.key,JSON.stringify({account_id:String(id),revision,state}));return true;}catch{return false;}}
  clear(){try{this.storage.removeItem(this.key);}catch{}}
  read(id){try{const draft=JSON.parse(this.storage.getItem(this.key));if(!draft)return null;if(id==null||draft.account_id!==String(id)||!Number.isInteger(draft.revision)||!draft.state){this.clear();return null;}return draft;}catch{this.clear();return null;}}
}
root.PrivateDraft=PrivateDraft;if(typeof module!=='undefined')module.exports={PrivateDraft};
})(typeof window==='undefined'?globalThis:window);
