/* Cache hanya di memori tab ini. Tidak menyimpan data hunian ke localStorage. */
(function(g){
 'use strict';
 function create(A,{now=()=>Date.now(),ttl=60000,maxPages=20}={}){
  let actor='',epoch=0,revision=null,meta=null,locations=null,pages=new Map(),pending=new Map();
  const identity=()=>[A.profile?.id,A.profile?.peran,A.profile?.aktif,A.profile?.akses_mess].join('|');
  function clear(){epoch++;pages.clear();pending.clear();revision=null;meta=null;locations=null;}
  function sync(){const next=identity();if(actor!==next){actor=next;clear();}return actor;}
  function valid(who,seq){return who===sync()&&seq===epoch;}
  function acceptRevision(value){if(value==null)return false;const changed=revision!==null&&revision!==value;if(changed){pages.clear();locations=null;}revision=value;return changed;}
  const clone=v=>JSON.parse(JSON.stringify(v));
  function normalize(args){return {p_jenis:args.p_jenis,p_kata:String(args.p_kata||'').trim().replace(/\s+/g,' '),p_lokasi:args.p_lokasi||'',p_blok:args.p_blok||'',p_kamar:args.p_kamar||'',p_halaman:args.p_halaman||0};}
  async function search(input,{fresh=false}={}){
   sync();if(!A.profile?.aktif)throw new Error('Silakan masuk kembali.');
   const args=normalize(input),key=JSON.stringify(args),who=actor,seq=epoch;
   if(fresh){pages.clear();locations=null;}
   const cached=pages.get(key);
   if(!fresh&&cached&&now()-cached.at<ttl){pages.delete(key);pages.set(key,cached);return {...clone(cached.value),cache:true,revisionChanged:false};}
   let result;
   try{result=await A.rpc('cari_data_mess',args);}catch(error){if(valid(who,seq))clear();throw error;}
   if(!valid(who,seq))return null;
   if(result.ukuran_halaman!==10||!Array.isArray(result.data)||!Number.isInteger(result.versi))throw new Error('Jalankan SQL pembaruan 20 pada proyek Supabase yang digunakan, lalu muat ulang.');
   if(revision!==null&&result.versi<revision)throw new Error('Data mess baru diperbarui. Ulangi pencarian.');
   const changed=acceptRevision(result.versi);
   meta={at:now(),value:{versi:result.versi,diperbarui_pada:result.diperbarui_pada}};
   // Simpan halaman yang benar jika server membatasi nomor halaman terakhir.
   const actualKey=JSON.stringify({...args,p_halaman:result.halaman});
   pages.set(actualKey,{at:now(),value:clone(result)});
   while(pages.size>maxPages)pages.delete(pages.keys().next().value);
   return {...result,cache:false,revisionChanged:changed};
  }
  async function metadata({fresh=false}={}){
   await A.ready;sync();if(!A.profile?.aktif)return null;
   if(!fresh&&meta&&now()-meta.at<ttl)return clone(meta.value);
   const who=actor,seq=epoch,key='metadata';if(!fresh&&pending.has(key))return pending.get(key);
   const request=(async()=>{const value=await A.one('pengaturan_mess',1,'versi,diperbarui_pada');if(!valid(who,seq))return null;if(revision!==null&&value.versi<revision)return meta?clone(meta.value):null;const changed=acceptRevision(value.versi);meta={at:now(),value};return {...value,revisionChanged:changed};})();
   pending.set(key,request);try{return await request;}finally{if(pending.get(key)===request)pending.delete(key);}
  }
  async function options(){
   await A.ready;sync();if(!A.profile?.aktif)return null;
   if(locations)return clone(locations);if(pending.has('options'))return pending.get('options');
   const who=actor,seq=epoch,rev=revision;
   const request=(async()=>{const value=await A.rpc('opsi_lokasi_mess',{});if(!valid(who,seq)||revision!==rev)return null;locations=value;return clone(value);})();
   pending.set('options',request);try{return await request;}finally{if(pending.get('options')===request)pending.delete('options');}
  }
  return Object.freeze({search,metadata,options,clear:()=>{actor=identity();clear();},identity,sync});
 }
 g.MessStore=Object.freeze({create});
})(window);
