(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))l(a);new MutationObserver(a=>{for(const t of a)if(t.type==="childList")for(const c of t.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&l(c)}).observe(document,{childList:!0,subtree:!0});function o(a){const t={};return a.integrity&&(t.integrity=a.integrity),a.referrerPolicy&&(t.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?t.credentials="include":a.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function l(a){if(a.ep)return;a.ep=!0;const t=o(a);fetch(a.href,t)}})();const ee=document.querySelector("#app");ee.innerHTML=`
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <h2>Lissajous Curves</h2>
        <p>When two oscillations move at right angles to each other, they trace out these patterns. The magic lies in their frequency ratio:</p>
        <p>A <strong>3:2</strong> ratio (perfect fifth) means x completes 3 cycles while y completes 2. For example if x is determined by a sine wave tuned to C and the y by one tuned to G the P5 pattern will emerge. More dissonant intervals create more complex patterns</p>
        <p style="font-size: 11px; color: #888; margin-top: 15px;"><em>Tip: Enable "Auto Sweep Phase" animate the pattern through all of its possible orientations.</em></p>
      </div>

      <div class="presets">
        <h3>Chromatic Intervals</h3>
        <div class="preset-grid">
          <button class="preset-btn" data-preset="unison">Unison (1:1)</button>
          <button class="preset-btn" data-preset="minor2nd">m2 (16:15)</button>
          <button class="preset-btn" data-preset="major2nd">M2 (9:8)</button>
          <button class="preset-btn" data-preset="minor3rd">m3 (6:5)</button>
          <button class="preset-btn" data-preset="major3rd">M3 (5:4)</button>
          <button class="preset-btn" data-preset="perfect4th">P4 (4:3)</button>
          <button class="preset-btn" data-preset="tritone">TT (7:5)</button>
          <button class="preset-btn" data-preset="perfect5th">P5 (3:2)</button>
          <button class="preset-btn" data-preset="minor6th">m6 (8:5)</button>
          <button class="preset-btn" data-preset="major6th">M6 (5:3)</button>
          <button class="preset-btn" data-preset="minor7th">m7 (9:5)</button>
          <button class="preset-btn" data-preset="major7th">M7 (15:8)</button>
          <button class="preset-btn" data-preset="octave">Oct (2:1)</button>
        </div>
      </div>
    </div>

    <canvas id="canvas"></canvas>

    <div class="sidebar right">
      <div class="controls">
        <button id="phaseSweep" class="play-btn sweep-enabled">Enable Auto Sweep</button>
        <button id="playSound" class="play-btn">▶ Play Sound</button>

        <div class="control-group">
          <label>X Frequency: <span id="freqXValue">3</span></label>
          <input type="range" id="freqX" min="1" max="10" value="3" step="0.1">
        </div>
        <div class="control-group">
          <label>Y Frequency: <span id="freqYValue">2</span></label>
          <input type="range" id="freqY" min="1" max="10" value="2" step="0.1">
        </div>
        <div class="control-group">
          <label>Phase Shift: <span id="phaseValue">1.57</span></label>
          <input type="range" id="phase" min="0" max="6.28" value="1.57" step="0.01">
        </div>
        <div class="control-group">
          <label>Animation Speed: <span id="speedValue">1.00x</span></label>
          <input type="range" id="speed" min="0" max="50" value="25" step="1">
        </div>
        <div class="control-group">
          <label>Sweep Speed: <span id="sweepSpeedValue">1.00x</span></label>
          <input type="range" id="sweepSpeed" min="0" max="50" value="25" step="0.5">
        </div>
      </div>
    </div>
  </div>
`;const A=document.querySelector("#canvas"),s=A.getContext("2d");function te(){const e=Math.min(800,window.innerWidth-40),n=4/3,o=e,l=o/n;return{width:o,height:l}}function B(){const{width:e,height:n}=te();A.width=e,A.height=n,O=e/2,j=n/2,w=Math.min(e,n)*.33}let O=400,j=300,w=200;B();window.addEventListener("resize",B);const D=document.querySelector("#freqX"),W=document.querySelector("#freqY"),E=document.querySelector("#phase"),k=document.querySelector("#speed"),H=document.querySelector("#sweepSpeed"),M=document.querySelector("#phaseSweep"),P=document.querySelector("#playSound"),K=document.querySelector("#freqXValue"),U=document.querySelector("#freqYValue"),G=document.querySelector("#phaseValue"),J=document.querySelector("#speedValue"),Q=document.querySelector("#sweepSpeedValue");let R=null;function ne(){return R||(R=new AudioContext),R}function ae(){const e=ne();e.state==="suspended"&&e.resume();const n=e.currentTime,o=130.81;let l=o*m,a=o*h;for(;a>1200;)l/=2,a/=2;const t=.4,c=.1,f=2,$=t+c+t+c+f,y=e.createOscillator(),g=e.createGain();y.type="sine",y.frequency.value=l,y.connect(g),g.connect(e.destination);const S=e.createOscillator(),b=e.createGain();S.type="sine",S.frequency.value=a,S.connect(b),b.connect(e.destination);const x=e.createOscillator(),T=e.createOscillator(),v=e.createGain(),q=e.createGain(),X=e.createGain();x.type="sine",T.type="sine",x.frequency.value=l,T.frequency.value=a,x.connect(v),T.connect(q),v.connect(X),q.connect(X),X.connect(e.destination);const u=.05,Y=.1,F=.25,N=.15,p=n;g.gain.setValueAtTime(0,p),g.gain.linearRampToValueAtTime(.4,p+u),g.gain.linearRampToValueAtTime(F,p+u+Y),g.gain.setValueAtTime(F,p+t-N),g.gain.linearRampToValueAtTime(0,p+t),y.start(p),y.stop(p+t);const d=p+t+c;b.gain.setValueAtTime(0,d),b.gain.linearRampToValueAtTime(.4,d+u),b.gain.linearRampToValueAtTime(F,d+u+Y),b.gain.setValueAtTime(F,d+t-N),b.gain.linearRampToValueAtTime(0,d+t),S.start(d),S.stop(d+t);const r=d+t+c;X.gain.value=.7,v.gain.setValueAtTime(0,r),q.gain.setValueAtTime(0,r),v.gain.linearRampToValueAtTime(.3,r+u),q.gain.linearRampToValueAtTime(.3,r+u),v.gain.linearRampToValueAtTime(.2,r+u+Y),q.gain.linearRampToValueAtTime(.2,r+u+Y),v.gain.setValueAtTime(.2,r+f-.3),q.gain.setValueAtTime(.2,r+f-.3),v.gain.linearRampToValueAtTime(0,r+f),q.gain.linearRampToValueAtTime(0,r+f),x.start(r),T.start(r),x.stop(r+f),T.stop(r+f),P.disabled=!0,P.textContent="♪ Playing...",setTimeout(()=>{P.disabled=!1,P.textContent="▶ Play Sound"},$*1e3)}P.addEventListener("click",ae);function Z(e){return e===0?.01:.01*Math.pow(10,e/25)}function z(e){return e<=.01?0:25*Math.log10(e/.01)}let h=3,m=2,i=Math.PI/2,I=.01,C=.01,V=!1,L=0;const oe={unison:{freqX:1,freqY:1,phase:Math.PI/2},minor2nd:{freqX:16,freqY:15,phase:Math.PI/4},major2nd:{freqX:9,freqY:8,phase:Math.PI/4+Math.PI/32},minor3rd:{freqX:6,freqY:5,phase:Math.PI/2-Math.PI/11},major3rd:{freqX:5,freqY:4,phase:Math.PI/4-Math.PI/48},perfect4th:{freqX:4,freqY:3,phase:Math.PI/3+Math.PI/48},tritone:{freqX:7,freqY:5,phase:Math.PI/3-Math.PI/24},perfect5th:{freqX:3,freqY:2,phase:Math.PI/2},minor6th:{freqX:8,freqY:5,phase:Math.PI/5},major6th:{freqX:5,freqY:3,phase:Math.PI/5-Math.PI/64},minor7th:{freqX:9,freqY:5,phase:Math.PI/5+Math.PI/32},major7th:{freqX:15,freqY:8,phase:Math.PI/4+Math.PI/48},octave:{freqX:2,freqY:1,phase:0}};function se(){D.value=h.toString(),W.value=m.toString(),E.value=i.toString(),k.value=z(I).toString(),H.value=z(C).toString(),K.textContent=h.toFixed(1),U.textContent=m.toFixed(1),G.textContent=i.toFixed(2);const e=I/.01;J.textContent=e.toFixed(2)+"x";const n=C/.01;Q.textContent=n.toFixed(2)+"x"}document.querySelectorAll(".preset-btn").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.preset,o=oe[n];h=o.freqX,m=o.freqY,i=o.phase,L=0,se()})});D.addEventListener("input",e=>{h=parseFloat(e.target.value),K.textContent=h.toFixed(1)});W.addEventListener("input",e=>{m=parseFloat(e.target.value),U.textContent=m.toFixed(1)});E.addEventListener("input",e=>{i=parseFloat(e.target.value),G.textContent=i.toFixed(2)});k.addEventListener("input",e=>{const n=parseFloat(e.target.value);I=Z(n);const o=I/.01;J.textContent=o.toFixed(2)+"x"});H.addEventListener("input",e=>{const n=parseFloat(e.target.value);C=Z(n);const o=C/.01;Q.textContent=o.toFixed(2)+"x"});M.addEventListener("click",()=>{V=!V,V?(M.textContent="Disable Auto Sweep",M.classList.remove("sweep-enabled")):(M.textContent="Enable Auto Sweep",M.classList.add("sweep-enabled")),E.disabled=V});function _(){V&&(i+=C,i>Math.PI*2&&(i=0),E.value=i.toString(),G.textContent=i.toFixed(2)),s.fillStyle="#1a1a2e",s.fillRect(0,0,A.width,A.height),s.strokeStyle="#0f3460",s.lineWidth=2,s.beginPath();for(let o=0;o<1e3;o++){const l=o/1e3*Math.PI*2,a=O+w*Math.sin(h*l+i),t=j+w*Math.sin(m*l);o===0?s.moveTo(a,t):s.lineTo(a,t)}s.stroke();const e=O+w*Math.sin(h*L+i),n=j+w*Math.sin(m*L);s.fillStyle="#16c79a",s.beginPath(),s.arc(e,n,8,0,Math.PI*2),s.fill(),s.shadowBlur=15,s.shadowColor="#16c79a",s.fillStyle="#16c79a",s.beginPath(),s.arc(e,n,8,0,Math.PI*2),s.fill(),s.shadowBlur=0,L+=I,requestAnimationFrame(_)}_();
