(function(){
  'use strict';
  const $=id=>document.getElementById(id),A=window.Akses;
  const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',filter:'<path d="M3 5h18M6 12h12M10 19h4"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',camera:'<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/>'};
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML='<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+icons[el.dataset.icon]+'</svg>';});
  let view='search',requestNumber=0,busy=false,logPage=0,logs=[],logMore=false,logRequest=0,accountId=A.profile?.id||null;
  const state={search:null,filter:null},store=window.MessStore.create(A);
  let accountKey=store.identity();
  const time=v=>v?new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jayapura',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))+' WIT':'Belum ada pembaruan';
  function error(text){$('lookup-error').textContent=text;$('lookup-error').hidden=!text;}
  function empty(title,description){return '<div class="empty-state"><strong>'+e(title)+'</strong><p>'+e(description)+'</p></div>';}
  const columns=[['nik','NIK'],['nama','Nama'],['departemen','Departemen'],['jabatan','Jabatan'],['lokasi_hunian','Hunian'],['blok','Blok'],['nomor_kamar','Kamar'],['tanggal_masuk_hunian','Tanggal Masuk Hunian']];
  function table(rows){return '<div class="data-table-scroll"><table class="data-table"><thead><tr>'+columns.map(([,label])=>'<th scope="col">'+label+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+columns.map(([key,label])=>'<td data-label="'+label+'">'+(key==='nama'?'<strong>'+e(r[key]||'—')+'</strong>':e(r[key]||'—'))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
  function render(){
    if(view==='log')return;const result=state[view];
    $('lookup-result-title').textContent=view==='search'?'Hasil pencarian':'Data kamar';
    $('lookup-screenshot').disabled=busy||!result?.data?.length;
    $('lookup-refresh').disabled=busy||!result;
    $('lookup-match-note').hidden=!result||result.mode_pencarian!=='mirip';
    $('lookup-results').setAttribute('aria-busy',String(busy));
    if(!result){$('lookup-results').innerHTML=empty(view==='search'?'Mulai pencarian':'Pilih filter kamar',view==='search'?'Ketik nama atau NIK, lalu tekan Cari data.':'Isi lokasi, blok, atau kamar lalu tampilkan data.');$('lookup-result-caption').textContent='Belum ada pencarian';$('lookup-pagination').hidden=true;$('lookup-page').textContent='';return;}
    const query=result.args;
    const label=view==='search'?query.p_kata:[query.p_lokasi,query.p_blok&&'Blok '+query.p_blok,query.p_kamar&&'Kamar '+query.p_kamar].filter(Boolean).join(' · ');
    $('lookup-result-caption').textContent=result.jumlah.toLocaleString('id-ID')+' data · '+label;
    $('lookup-results').innerHTML=result.data.length?table(result.data):empty('Data tidak ditemukan','Periksa kata kunci atau filter yang digunakan.');
    const totalPages=Math.max(1,Math.ceil(result.jumlah/10)),page=result.halaman;
    $('lookup-pagination').hidden=totalPages<=1;
    $('lookup-page').textContent=result.jumlah?'Menampilkan '+(page*10+1)+'–'+Math.min(page*10+result.data.length,result.jumlah)+' dari '+result.jumlah.toLocaleString('id-ID')+' data · Halaman '+(page+1)+' dari '+totalPages:'0 data';
    const visible=[...new Set([0,totalPages-1,page-1,page,page+1,...(page<2?[1,2,3]:[]),...(page>totalPages-3?[totalPages-4,totalPages-3,totalPages-2]:[])])].filter(n=>n>=0&&n<totalPages).sort((a,b)=>a-b);
    $('lookup-pages').innerHTML=visible.map((n,i)=>(i&&n-visible[i-1]>1?'<span aria-hidden="true">…</span>':'')+'<button type="button" data-page="'+n+'" aria-label="Halaman '+(n+1)+'"'+(n===page?' aria-current="page"':'')+(busy?' disabled':'')+'>'+(n+1)+'</button>').join('');
    $('lookup-prev').disabled=busy||page===0;$('lookup-next').disabled=busy||page+1>=totalPages;

  }
  async function metadata(){
    const settings=await store.metadata();if(!settings)return;
    if(settings.revisionChanged){state.search=state.filter=null;render();}
    $('lookup-last-update').textContent=time(settings.diperbarui_pada);
  }
  async function options(){
    await metadata();const locations=await store.options();if(!locations)return;
    const previous=$('lookup-location').value;
    $('lookup-location').innerHTML='<option value="">Semua lokasi</option>'+locations.filter(v=>v.trim()).map(v=>'<option>'+e(v)+'</option>').join('');
    if(locations.includes(previous))$('lookup-location').value=previous;
  }
  function lock(value){busy=value;document.querySelectorAll('#lookup-search-form button,#lookup-filter-form button').forEach(b=>b.disabled=value);render();}
  async function run(args,which,config={}){
    const sequence=++requestNumber,who=store.identity();lock(true);error('');state[which]=null;
    if(view===which){$('lookup-results').innerHTML=empty('Memuat data…','');$('lookup-pagination').hidden=true;$('lookup-result-caption').textContent='Sedang mencari';$('lookup-page').textContent='';$('lookup-match-note').hidden=true;}
    try{
      const result=await store.search(args,config);
      if(sequence!==requestNumber||who!==store.identity()||!result)return;
      if(result.revisionChanged)state.search=state.filter=null;
      state[which]={...result,args:{...args,p_halaman:result.halaman}};
      $('lookup-last-update').textContent=time(result.diperbarui_pada);
      if(which==='filter')await options();
    }catch(err){if(sequence===requestNumber)error(err.message);}
    finally{if(sequence===requestNumber){lock(false);render();}}
  }
  $('lookup-search-form').addEventListener('submit',event=>{event.preventDefault();if(busy)return;const q=$('lookup-query').value.trim();if(q.length<2){error('Masukkan minimal 2 karakter.');return;}run({p_jenis:'nama',p_kata:q,p_halaman:0},'search');});
  $('lookup-filter-form').addEventListener('submit',event=>{event.preventDefault();if(busy)return;const l=$('lookup-location').value,b=$('lookup-block').value.trim(),k=$('lookup-room').value.trim();if(!l&&!b&&!k){error('Isi lokasi, blok, atau nomor kamar.');return;}run({p_jenis:'kamar',p_lokasi:l,p_blok:b,p_kamar:k,p_halaman:0},'filter');});
  $('lookup-prev').addEventListener('click',()=>{const r=state[view];if(r&&!busy)run({...r.args,p_halaman:r.halaman-1},view);});
  $('lookup-next').addEventListener('click',()=>{const r=state[view];if(r&&!busy)run({...r.args,p_halaman:r.halaman+1},view);});
  $('lookup-pages').addEventListener('click',event=>{const button=event.target.closest('[data-page]'),r=state[view];if(button&&r&&!busy)run({...r.args,p_halaman:Number(button.dataset.page)},view);});
  $('lookup-refresh').addEventListener('click',()=>{const r=state[view];if(r&&!busy)run({...r.args,p_halaman:0},view,{fresh:true});});
  function select(next){
    if(next==='log'&&!A.administrator())return;
    view=next;error('');
    document.querySelectorAll('[data-lookup-tab]').forEach(el=>{const active=el.dataset.lookupTab===view;el.classList.toggle('active',active);el.setAttribute('aria-selected',String(active));el.tabIndex=active?0:-1;});
    $('lookup-search-panel').hidden=view!=='search';$('lookup-filter-panel').hidden=view!=='filter';$('lookup-log-panel').hidden=view!=='log';$('lookup-normal-results').hidden=view==='log';
    if(view==='log')loadLogs(false).catch(err=>{$('lookup-log-results').innerHTML=empty('Riwayat belum dapat dimuat',err.message);});else render();
    if(view==='filter')options().catch(err=>error(err.message));
  }
  document.querySelectorAll('[data-lookup-tab]').forEach(el=>{
    el.addEventListener('click',()=>select(el.dataset.lookupTab));
    el.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-lookup-tab]')].filter(x=>!x.hidden),i=tabs.indexOf(el),next=event.key==='Home'?tabs[0]:event.key==='End'?tabs.at(-1):tabs[(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length];select(next.dataset.lookupTab);next.focus();});
  });
  async function loadLogs(more=false){
    if(!A.administrator())return;const sequence=++logRequest,who=A.profile?.id,page=more?logPage+1:0,client=await A.requireClient();
    const {data,error:err}=await client.from('riwayat_pencarian_mess').select('*').gte('dicari_pada',new Date(Date.now()-86400000).toISOString()).order('dicari_pada',{ascending:false}).order('id',{ascending:false}).range(page*100,page*100+99);
    if(sequence!==logRequest||A.profile?.id!==who||!A.administrator())return;
    if(err)throw new Error(A.errorText(err));
    logPage=page;logs=more?[...new Map([...logs,...data].map(r=>[r.id,r])).values()]:data;logMore=data.length===100;renderLogs();
  }
  function renderLogs(){
    if(!A.administrator())return;
    const recent=logs.filter(r=>new Date(r.dicari_pada).getTime()>=Date.now()-86400000);
    $('lookup-log-results').innerHTML=recent.length?'<div class="lookup-log-scroll"><table class="lookup-log-table"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Pencarian</th><th>Hasil</th></tr></thead><tbody>'+recent.map(r=>'<tr><td>'+e(time(r.dicari_pada))+'</td><td>'+e(r.nama_pengguna)+'<small>'+e(r.email_pengguna)+'</small></td><td>'+e(r.jenis_pencarian==='nama'?r.kata_kunci:[r.lokasi_hunian,r.blok&&'Blok '+r.blok,r.nomor_kamar&&'Kamar '+r.nomor_kamar].filter(Boolean).join(' · '))+'</td><td>'+r.jumlah_hasil+'</td></tr>').join('')+'</tbody></table></div>':empty('Belum ada riwayat pencarian','Hanya pencarian dalam 24 jam terakhir yang ditampilkan.');
    $('lookup-log-more').hidden=!logMore;
  }
  $('lookup-log-refresh').addEventListener('click',()=>loadLogs().catch(err=>{$('lookup-log-results').innerHTML=empty('Riwayat belum dapat dimuat',err.message);}));
  $('lookup-log-more').addEventListener('click',async()=>{const b=$('lookup-log-more');b.disabled=true;try{await loadLogs(true);}catch(err){$('lookup-log-results').innerHTML=empty('Riwayat belum dapat dimuat',err.message);}finally{b.disabled=false;}});
  setInterval(()=>{if(A.administrator()&&view==='log')renderLogs();},60000);
  let capturePromise;
  $('lookup-screenshot').addEventListener('click',async()=>{
    const button=$('lookup-screenshot');button.disabled=true;
    try{
      if(!capturePromise)capturePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/html2canvas.min.js';script.onload=resolve;script.onerror=()=>{capturePromise=null;reject(new Error('Komponen screenshot belum dapat dimuat.'));};document.head.append(script);});
      await capturePromise;
      const canvas=await window.html2canvas($('lookup-capture'),{backgroundColor:getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()||'#ffffff',scale:2,ignoreElements:el=>el.id==='lookup-screenshot'||el.id==='lookup-refresh'||el.id==='lookup-pagination'});
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Screenshot belum dapat disimpan.');
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Data_Mess_'+new Date().toISOString().slice(0,10)+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(err){error(err.message);}finally{render();}
  });
  document.addEventListener('akses:berubah',()=>{
    if(accountKey!==store.identity()){
      accountKey=store.identity();store.clear();
      accountId=A.profile?.id||null;requestNumber++;logRequest++;state.search=state.filter=null;logs=[];logPage=0;logMore=false;
      $('lookup-query').value=$('lookup-block').value=$('lookup-room').value='';
      $('lookup-location').innerHTML='<option value="">Semua lokasi</option>';
      $('lookup-last-update').textContent='Belum ada pembaruan';$('lookup-log-results').replaceChildren();$('lookup-log-more').hidden=true;
      select('search');lock(false);
    }
    if(!A.administrator()){
      logRequest++;logs=[];$('lookup-log-results').replaceChildren();$('lookup-log-more').hidden=true;
      if(view==='log')select('search');
    }
    metadata().then(()=>view==='filter'?options():null).catch(err=>error(err.message));
  });
  metadata().catch(err=>error(err.message));render();
})();
