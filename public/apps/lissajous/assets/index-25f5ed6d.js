(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const a of s)if(a.type==="childList")for(const d of a.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&o(d)}).observe(document,{childList:!0,subtree:!0});function t(s){const a={};return s.integrity&&(a.integrity=s.integrity),s.referrerPolicy&&(a.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?a.credentials="include":s.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(s){if(s.ep)return;s.ep=!0;const a=t(s);fetch(s.href,a)}})();document.documentElement.classList.add("theme-loading");const Z=localStorage.getItem("decompiled-theme"),fe=window.matchMedia("(prefers-color-scheme: dark)").matches,ve=Z?Z==="light":!fe;ve&&document.body.classList.add("light-mode");requestAnimationFrame(()=>document.documentElement.classList.remove("theme-loading"));const be=document.querySelector("#app");be.innerHTML=`
  <div class="container">
    <div class="sidebar left">
      <div class="info">
        <div class="info-header">
          <h2>Lissajous Curves</h2>
          <button class="info-btn" id="infoBtn" title="Learn more">i</button>
        </div>
        <p>Select a musical interval to see its visual pattern. Simple ratios like the Perfect Fifth (3:2) create elegant curves, while complex intervals produce intricate patterns.</p>
              </div>

      <div class="presets">
        <h3>Intervals</h3>
        <div class="preset-grid">
          <button class="preset-btn" data-preset="unison">Unison (1:1)</button>
          <button class="preset-btn" data-preset="minor2nd">m2 (16:15)</button>
          <button class="preset-btn" data-preset="major2nd">M2 (9:8)</button>
          <button class="preset-btn" data-preset="minor3rd">m3 (6:5)</button>
          <button class="preset-btn" data-preset="major3rd">M3 (5:4)</button>
          <button class="preset-btn" data-preset="perfect4th">P4 (4:3)</button>
          <button class="preset-btn" data-preset="tritone">TT (7:5)</button>
          <button class="preset-btn active" data-preset="perfect5th">P5 (3:2)</button>
          <button class="preset-btn" data-preset="minor6th">m6 (8:5)</button>
          <button class="preset-btn" data-preset="major6th">M6 (5:3)</button>
          <button class="preset-btn" data-preset="minor7th">m7 (9:5)</button>
          <button class="preset-btn" data-preset="major7th">M7 (15:8)</button>
          <button class="preset-btn" data-preset="octave">Oct (2:1)</button>
          <button id="playSound" class="preset-btn listen-btn" title="Play Interval">▶ Listen</button>
        </div>
        <div class="sound-options">
          <label><input type="radio" name="sound" value="synth" checked> Synth</label>
          <label><input type="radio" name="sound" value="piano"> E. Piano</label>
          <label><input type="radio" name="sound" value="organ"> Pad</label>
          <label><input type="radio" name="sound" value="bell"> Bell</label>
        </div>
      </div>
    </div>

    <canvas id="canvas"></canvas>

    <div class="sidebar right">
      <div class="controls">
        <div class="control-section">
          <h4 class="section-label">Frequency Ratio</h4>
          <div class="control-group">
            <label>X: <span id="freqXValue">3</span></label>
            <input type="range" id="freqX" min="1" max="32" value="3" step="1">
          </div>
          <div class="control-group">
            <label>Y: <span id="freqYValue">2</span></label>
            <input type="range" id="freqY" min="1" max="32" value="2" step="1">
          </div>
        </div>

        <div class="control-section">
          <h4 class="section-label">Animation</h4>
          <div class="control-group">
            <label>Phase: <span id="phaseValue">1.57</span></label>
            <input type="range" id="phase" min="0" max="6.28" value="1.57" step="0.01" disabled>
          </div>
          <div class="control-group">
            <label>Speed: <span id="speedValue">1.00x</span></label>
            <input type="range" id="speed" min="0" max="50" value="25" step="1">
          </div>
          <div class="control-group">
            <label>Sweep: <span id="sweepSpeedValue">1.00x</span></label>
            <input type="range" id="sweepSpeed" min="0" max="50" value="25" step="0.5">
          </div>
        </div>

        <div class="control-section">
          <h4 class="section-label">Effects</h4>
          <div class="toggle-row">
            <span class="toggle-label">Animate</span>
            <button id="phaseSweep" class="toggle-btn active" title="Toggle phase animation">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Glow Trail</span>
            <button id="trailToggle" class="toggle-btn active" title="Toggle glow trail">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Curve Glow</span>
            <button id="curveGlowToggle" class="toggle-btn active" title="Toggle curve glow">
              <span class="toggle-indicator"></span>
            </button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Feedback</span>
            <button id="feedbackToggle" class="toggle-btn" title="Toggle feedback echo effect">
              <span class="toggle-indicator"></span>
            </button>
          </div>
        </div>

        <div class="theme-row">
          <span class="theme-label">Theme</span>
          <div class="theme-controls">
            <span class="theme-icon">🌙</span>
            <button class="theme-toggle" title="Toggle light/dark mode"></button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal-overlay" id="infoModal">
    <div class="modal">
      <button class="modal-close" id="modalClose">&times;</button>
      <h2>About Lissajous Curves</h2>

      <h3>What Are They?</h3>
      <p>Lissajous curves (also called Bowditch curves) are the patterns traced when two perpendicular oscillations are combined. Mathematically, they're described by:</p>
      <code>x = A sin(at + δ), y = B sin(bt)</code>
      <p>The ratio <strong>a:b</strong> determines the curve's shape, while the phase shift <strong>δ</strong> controls its orientation.</p>

      <h3>History</h3>
      <p>First studied by Nathaniel Bowditch in 1815, these curves were later explored extensively by French physicist Jules Antoine Lissajous in 1857. He created an elegant apparatus using tuning forks and mirrors to project the patterns onto a screen, demonstrating the visual relationship between sound frequencies.</p>

      <h3>Music Connection</h3>
      <p>The frequency ratios that produce pleasing musical intervals also create the most elegant visual patterns. The Perfect Fifth (3:2) and Perfect Fourth (4:3) form simple, closed curves. The Octave (2:1) traces a figure-eight. Dissonant intervals like the Minor Second (16:15) create dense, complex patterns that never quite close.</p>

      <h3>Just Intonation</h3>
      <p>This app uses <em>just intonation</em> ratios rather than the equal temperament found on modern pianos. In just intonation, intervals are defined by simple whole-number ratios, producing pure, beatless harmonies—and the cleanest Lissajous patterns.</p>
    </div>
  </div>
`;const x=document.querySelector("#canvas"),y=x.getContext("2d"),I=document.createElement("canvas"),m=I.getContext("2d"),X=document.createElement("canvas"),_=X.getContext("2d"),k=document.createElement("canvas"),u=k.getContext("2d"),ye=.92,Q=1.006,qe=.002;function j(e){return getComputedStyle(document.body).getPropertyValue(e).trim()}function Se(){const e=Math.min(800,window.innerWidth-40),n=4/3,t=e,o=t/n;return{width:t,height:o}}function le(){const{width:e,height:n}=Se();x.width=e,x.height=n,D=e/2,W=n/2,T=Math.min(e,n)*.33,I.width=e,I.height=n,X.width=e,X.height=n,k.width=e,k.height=n,m.clearRect(0,0,e,n)}let D=400,W=300,T=200;le();window.addEventListener("resize",le);const z=document.querySelector("#freqX"),H=document.querySelector("#freqY"),V=document.querySelector("#phase"),$=document.querySelector("#speed"),J=document.querySelector("#sweepSpeed"),ee=document.querySelector("#phaseSweep"),b=document.querySelector("#playSound"),ce=document.querySelector("#freqXValue"),ie=document.querySelector("#freqYValue"),K=document.querySelector("#phaseValue"),re=document.querySelector("#speedValue"),de=document.querySelector("#sweepSpeedValue");let N=null,ue="synth";function we(){return N||(N=new AudioContext),N}document.querySelectorAll('input[name="sound"]').forEach(e=>{e.addEventListener("change",n=>{ue=n.target.value})});function xe(e,n,t,o,s){const a=e.createGain();a.connect(e.destination),a.gain.value=s*.5;const d=e.createOscillator(),l=e.createGain();d.type="sine",d.frequency.value=n,d.connect(l),l.connect(a);const c=e.createOscillator(),i=e.createGain();c.type="sine",c.frequency.value=n*2.001,c.connect(i),i.connect(a);const r=e.createOscillator(),p=e.createGain();r.type="sine",r.frequency.value=n*3.5,r.connect(p),p.connect(a);const h=e.createOscillator(),g=e.createGain();h.type="sine",h.frequency.value=n*.5,h.connect(g),g.connect(a),l.gain.setValueAtTime(0,t),l.gain.linearRampToValueAtTime(.7,t+.005),l.gain.exponentialRampToValueAtTime(.4,t+.3),l.gain.exponentialRampToValueAtTime(.2,t+o*.7),l.gain.linearRampToValueAtTime(.001,t+o),i.gain.setValueAtTime(0,t),i.gain.linearRampToValueAtTime(.3,t+.005),i.gain.exponentialRampToValueAtTime(.1,t+.2),i.gain.exponentialRampToValueAtTime(.05,t+o*.5),i.gain.linearRampToValueAtTime(.001,t+o),p.gain.setValueAtTime(0,t),p.gain.linearRampToValueAtTime(.25,t+.002),p.gain.exponentialRampToValueAtTime(.01,t+.15),p.gain.linearRampToValueAtTime(.001,t+.3),g.gain.setValueAtTime(0,t),g.gain.linearRampToValueAtTime(.15,t+.01),g.gain.exponentialRampToValueAtTime(.08,t+.4),g.gain.linearRampToValueAtTime(.001,t+o),[d,c,r,h].forEach(v=>{v.start(t),v.stop(t+o)})}function Me(e,n,t,o,s){const a=e.createGain();a.connect(e.destination),a.gain.value=s*.3;const d=[-5,0,5],l=[];d.forEach(p=>{const h=e.createOscillator();h.type="sawtooth",h.frequency.value=n,h.detune.value=p,h.connect(a),l.push(h)});const c=.1,i=.4,r=.5;a.gain.setValueAtTime(0,t),a.gain.linearRampToValueAtTime(s*.3,t+c),a.gain.setValueAtTime(s*.3*i,t+o-r),a.gain.linearRampToValueAtTime(.001,t+o),l.forEach(p=>{p.start(t),p.stop(t+o)})}function Le(e,n,t,o,s){const a=e.createGain();a.connect(e.destination);const d=e.createOscillator(),l=e.createOscillator();d.type="triangle",l.type="triangle",d.frequency.value=n,l.frequency.value=n,d.detune.value=-8,l.detune.value=8;const c=e.createGain();d.connect(c),l.connect(c),c.connect(a),c.gain.value=.4;const i=e.createOscillator();i.type="sine",i.frequency.value=n*.5;const r=e.createGain();i.connect(r),r.connect(a),r.gain.value=.25;const p=e.createOscillator();p.type="sine",p.frequency.value=n*1.5;const h=e.createGain();p.connect(h),h.connect(a),h.gain.value=.1;const g=.15,v=.3;a.gain.setValueAtTime(0,t),a.gain.linearRampToValueAtTime(s*.35,t+g),a.gain.setValueAtTime(s*.35,t+o-v),a.gain.linearRampToValueAtTime(.001,t+o),[d,l,i,p].forEach(L=>{L.start(t),L.stop(t+o)})}function Ae(e,n,t,o,s){const a=e.createGain();a.connect(e.destination),a.gain.value=s*.4,[{ratio:1,amp:1,decay:1},{ratio:2.76,amp:.4,decay:.7},{ratio:5.4,amp:.2,decay:.5},{ratio:8.9,amp:.1,decay:.3}].forEach(({ratio:i,amp:r,decay:p})=>{const h=e.createOscillator(),g=e.createGain();h.type="sine",h.frequency.value=n*i,h.connect(g),g.connect(a);const v=o*p;g.gain.setValueAtTime(0,t),g.gain.linearRampToValueAtTime(r,t+.003),g.gain.exponentialRampToValueAtTime(r*.3,t+v*.3),g.gain.exponentialRampToValueAtTime(.001,t+v),h.start(t),h.stop(t+o)});const l=e.createOscillator(),c=e.createGain();l.type="sine",l.frequency.value=n*.5,l.connect(c),c.connect(a),c.gain.setValueAtTime(0,t),c.gain.linearRampToValueAtTime(.15,t+.01),c.gain.exponentialRampToValueAtTime(.001,t+o*.6),l.start(t),l.stop(t+o)}function F(e,n,t,o,s){switch(ue){case"piano":xe(e,n,t,o,s);break;case"synth":Me(e,n,t,o,s);break;case"organ":Le(e,n,t,o,s);break;case"bell":Ae(e,n,t,o,s);break}}function U(){const e=we();e.state==="suspended"&&e.resume();const n=e.currentTime,t=130.81;let o=t*w,s=t*S;for(;s>1200;)o/=2,s/=2;const a=.5,d=.1,l=2,c=a+d+a+d+l,i=n;F(e,o,i,a,.6);const r=i+a+d;F(e,s,r,a,.6);const p=r+a+d;F(e,o,p,l,.5),F(e,s,p,l,.5),b.disabled=!0,b.classList.add("playing"),b.textContent="♪ Playing",setTimeout(()=>{b.disabled=!1,b.classList.remove("playing"),b.textContent="▶ Listen"},c*1e3)}b.addEventListener("click",U);function pe(e){return .001*Math.pow(10,e/25)}function te(e){return e<=.001?0:25*Math.log10(e/.001)}let S=3,w=2,f=Math.PI/2,R=.01,G=.01;const B=.01;let P=!0,C=!0,O=!0,E=!1,Y=0;const Ve={unison:{freqX:1,freqY:1,phase:Math.PI/2},minor2nd:{freqX:16,freqY:15,phase:Math.PI/4},major2nd:{freqX:9,freqY:8,phase:Math.PI/4+Math.PI/32},minor3rd:{freqX:6,freqY:5,phase:Math.PI/2-Math.PI/11},major3rd:{freqX:5,freqY:4,phase:Math.PI/4-Math.PI/48},perfect4th:{freqX:4,freqY:3,phase:Math.PI/3+Math.PI/48},tritone:{freqX:7,freqY:5,phase:Math.PI/3-Math.PI/24},perfect5th:{freqX:3,freqY:2,phase:Math.PI/2},minor6th:{freqX:8,freqY:5,phase:Math.PI/5},major6th:{freqX:5,freqY:3,phase:Math.PI/5-Math.PI/64},minor7th:{freqX:9,freqY:5,phase:Math.PI/5+Math.PI/32},major7th:{freqX:15,freqY:8,phase:Math.PI/4+Math.PI/48},octave:{freqX:2,freqY:1,phase:0}};function M(e){const n=parseFloat(e.min),t=parseFloat(e.max),s=(parseFloat(e.value)-n)/(t-n);e.style.setProperty("--progress",s.toString())}function he(){[z,H,V,$,J].forEach(M)}function Te(){z.value=S.toString(),H.value=w.toString(),V.value=f.toString(),$.value=te(R).toString(),J.value=te(G).toString(),ce.textContent=S.toFixed(0),ie.textContent=w.toFixed(0),K.textContent=f.toFixed(2);const e=R/B;re.textContent=e.toFixed(2)+"x";const n=G/B;de.textContent=n.toFixed(2)+"x",he()}document.querySelectorAll(".preset-btn").forEach(e=>{e.addEventListener("click",()=>{const n=e.dataset.preset;if(!n)return;document.querySelectorAll(".preset-btn").forEach(o=>o.classList.remove("active")),e.classList.add("active");const t=Ve[n];S=t.freqX,w=t.freqY,f=t.phase,Y=0,Te(),b.disabled||U()})});z.addEventListener("input",e=>{const n=e.target;S=Math.round(parseFloat(n.value)),ce.textContent=S.toFixed(0),M(n)});H.addEventListener("input",e=>{const n=e.target;w=Math.round(parseFloat(n.value)),ie.textContent=w.toFixed(0),M(n)});V.addEventListener("input",e=>{const n=e.target;f=parseFloat(n.value),K.textContent=f.toFixed(2),M(n)});$.addEventListener("input",e=>{const n=e.target,t=parseFloat(n.value);R=pe(t);const o=R/B;re.textContent=o.toFixed(2)+"x",M(n)});J.addEventListener("input",e=>{const n=e.target,t=parseFloat(n.value);G=pe(t);const o=G/B;de.textContent=o.toFixed(2)+"x",M(n)});ee.addEventListener("click",()=>{P=!P,ee.classList.toggle("active",P),V.disabled=P});const ne=document.querySelector("#trailToggle");ne.addEventListener("click",()=>{C=!C,ne.classList.toggle("active",C),C||(A.length=0)});const ae=document.querySelector("#curveGlowToggle");ae.addEventListener("click",()=>{O=!O,ae.classList.toggle("active",O)});const oe=document.querySelector("#feedbackToggle");oe.addEventListener("click",()=>{E=!E,oe.classList.toggle("active",E),E||m.clearRect(0,0,x.width,x.height)});const se=60,A=[];function ge(){P&&(f+=G,f>Math.PI*2&&(f=0),V.value=f.toString(),K.textContent=f.toFixed(2),M(V));const e=j("--canvas-bg"),n=j("--canvas-curve"),t=j("--accent-primary"),o=x.width,s=x.height;u.clearRect(0,0,o,s),O&&(u.shadowBlur=10,u.shadowColor=t),u.strokeStyle=n,u.lineWidth=2,u.beginPath();for(let l=0;l<1e3;l++){const c=l/1e3*Math.PI*2,i=D+T*Math.sin(S*c+f),r=W+T*Math.sin(w*c);l===0?u.moveTo(i,r):u.lineTo(i,r)}u.stroke(),u.shadowBlur=0;const a=D+T*Math.sin(S*Y+f),d=W+T*Math.sin(w*Y);if(C){A.unshift({x:a,y:d}),A.length>se&&A.pop();const l=document.body.classList.contains("light-mode");for(let c=A.length-1;c>=0;c--){const i=A[c],r=1-c/se,p=r*.8,h=4+r*6;let g,v,L;l?(g=Math.round(201+(212-201)*r),v=Math.round(75+(118-75)*r),L=Math.round(75+(58-75)*r)):(g=Math.round(233+(22-233)*r),v=Math.round(69+(199-69)*r),L=Math.round(96+(154-96)*r)),u.beginPath(),u.arc(i.x,i.y,h,0,Math.PI*2),u.fillStyle=`rgba(${g}, ${v}, ${L}, ${p})`,u.fill()}}if(u.shadowBlur=25,u.shadowColor=t,u.fillStyle=t,u.beginPath(),u.arc(a,d,10,0,Math.PI*2),u.fill(),u.shadowBlur=0,u.fillStyle="#ffffff",u.beginPath(),u.arc(a,d,4,0,Math.PI*2),u.fill(),y.fillStyle=e,y.fillRect(0,0,o,s),E){const l=o/2,c=s/2,i=document.body.classList.contains("light-mode");_.clearRect(0,0,o,s),_.drawImage(I,0,0),m.clearRect(0,0,o,s),m.save(),m.globalAlpha=ye,m.translate(l,c),m.rotate(qe),m.scale(Q,Q),m.translate(-l,-c),m.drawImage(X,0,0),m.restore(),m.globalAlpha=1,m.globalCompositeOperation=i?"source-over":"lighter",m.globalAlpha=i?.7:.6,m.drawImage(k,0,0),m.globalAlpha=1,m.globalCompositeOperation="source-over",y.globalCompositeOperation=i?"multiply":"lighter",y.globalAlpha=i?.85:.5,y.drawImage(I,0,0),y.globalAlpha=1,y.globalCompositeOperation="source-over"}y.drawImage(k,0,0),Y+=R,requestAnimationFrame(ge)}he();const Pe=document.querySelector("#infoBtn"),q=document.querySelector("#infoModal"),Ce=document.querySelector("#modalClose");Pe.addEventListener("click",()=>{q.classList.add("open")});Ce.addEventListener("click",()=>{q.classList.remove("open")});q.addEventListener("click",e=>{e.target===q&&q.classList.remove("open")});document.addEventListener("keydown",e=>{e.key==="Escape"&&q.classList.contains("open")&&q.classList.remove("open"),e.code==="Space"&&e.target===document.body&&!q.classList.contains("open")&&(e.preventDefault(),!b.disabled&&!b.classList.contains("playing")&&U())});const Ee="decompiled-theme",Ie=document.querySelector(".theme-toggle"),ke=document.querySelector(".theme-icon");function me(){const e=document.body.classList.contains("light-mode");ke.textContent=e?"☀️":"🌙"}me();Ie.addEventListener("click",()=>{const e=document.body.classList.contains("light-mode"),n=e?"dark":"light";localStorage.setItem(Ee,n),document.body.classList.toggle("light-mode",!e),me()});ge();
