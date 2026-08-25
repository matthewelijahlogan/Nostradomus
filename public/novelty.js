(()=>{
  const key='nostradomus-novelty-acknowledged';
  if(localStorage.getItem(key))return;
  const style=document.createElement('style');style.textContent='.novelty-dialog{position:fixed;z-index:99;inset:0;display:grid;place-items:center;padding:1rem;background:#02050bdd;backdrop-filter:blur(8px)}.novelty-dialog section{width:min(34rem,100%);padding:2rem;border:1px solid #ff3fbd;background:linear-gradient(135deg,#071827,#1c0822);box-shadow:0 0 3rem #ff3fbd55;color:#dffaff;font:500 1rem/1.55 Inter,system-ui,sans-serif}.novelty-dialog p{margin:0 0 .5rem;color:#35e6ff;font-size:.68rem;font-weight:900;letter-spacing:.16em}.novelty-dialog h2{margin:.2rem 0 1rem;font:400 2rem Georgia,serif}.novelty-plain{margin:1rem 0;color:#ffb1dd;font-style:italic}.novelty-dialog button{padding:.8rem 1rem;border:1px solid #35e6ff;background:linear-gradient(135deg,#35e6ff,#a651ff);color:#06101b;font-weight:900;cursor:pointer}';document.head.append(style);
  const dialog=document.createElement('div');
  dialog.className='novelty-dialog';
  dialog.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="novelty-title"><p>RESEARCH NOTICE</p><h2 id="novelty-title">Speculative signal sandbox</h2><div>This is a novelty research experience. It combines public data with experimental models; it does not predict disasters, provide safety guidance, or establish facts.</div><div class="novelty-plain">In plain English: we are throwing data at the wall to see what sticks.</div><button type="button">I understand - enter the research environment</button></section>';
  dialog.querySelector('button').addEventListener('click',()=>{localStorage.setItem(key,'yes');dialog.remove()});
  document.body.append(dialog);
})();
