(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const c of document.querySelectorAll('link[rel="modulepreload"]'))e(c);new MutationObserver(c=>{for(const d of c)if(d.type==="childList")for(const u of d.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&e(u)}).observe(document,{childList:!0,subtree:!0});function g(c){const d={};return c.integrity&&(d.integrity=c.integrity),c.referrerPolicy&&(d.referrerPolicy=c.referrerPolicy),c.crossOrigin==="use-credentials"?d.credentials="include":c.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function e(c){if(c.ep)return;c.ep=!0;const d=g(c);fetch(c.href,d)}})();document.documentElement.classList.add("theme-loading");const ie=localStorage.getItem("decompiled-theme"),me=window.matchMedia("(prefers-color-scheme: dark)").matches,fe=ie?ie==="light":!me;fe&&document.body.classList.add("light-mode");requestAnimationFrame(()=>document.documentElement.classList.remove("theme-loading"));let i=null,J=null,z=null,_=null,x=!1,H=null,I=null,W=null,w=null,G=null,N=null,se=.3,re=.4,Z=.3,ee=!1;const ye=48e3,ge=1e3,ce=441;let E=ce,te=.985,K=!0,ne=5e3,R=0,de="noise",k=0,oe=440,A=!1,L=null,Y=0;const he=50;let T=new Float32Array(ce),D=0,X=0,U=null;function B(t){return getComputedStyle(document.body).getPropertyValue(t).trim()}function le(){return i||(i=new AudioContext,_=i.createAnalyser(),_.fftSize=2048,z=i.createGain(),z.gain.value=.3,J=i.createScriptProcessor(4096,1,1),J.onaudioprocess=be,I=i.createDelay(2),I.delayTime.value=se,W=i.createGain(),W.gain.value=re,w=i.createGain(),w.gain.value=ee?Z:0,G=i.createGain(),G.gain.value=1,N=i.createGain(),N.gain.value=1,J.connect(z),z.connect(G),G.connect(N),z.connect(I),I.connect(W),W.connect(I),I.connect(w),w.connect(N),N.connect(_),_.connect(i.destination),ue(),i)}function ue(){if(!i)return;const t=Math.max(E,1);T=new Float32Array(t),T.fill(0),D=0,X=0}function ve(){if(Y<=0&&!x)return 0;let t=0;switch(de){case"noise":t=(Math.random()*2-1)*.3;break;case"sine":i&&(t=Math.sin(k)*.3,k+=2*Math.PI*oe/i.sampleRate,k>2*Math.PI&&(k-=2*Math.PI));break;case"square":i&&(t=(Math.sin(k)>0?1:-1)*.3,k+=2*Math.PI*oe/i.sampleRate,k>2*Math.PI&&(k-=2*Math.PI));break}return Y>0?(Y--,t):x?t:0}function be(t){const o=t.outputBuffer.getChannelData(0),g=o.length;if(!i||T.length===0){o.fill(0);return}for(let e=0;e<g;e++){const c=ve();let d=c;if(E>0){const u=(D-E+T.length)%T.length;let v=T[u];if(K&&i){const S=2*Math.PI*ne/i.sampleRate,h=Math.min(S,1);v=h*v+(1-h)*X,X=v}if(R>0){const S=Math.abs(v);v+=(Math.random()*2-1)*R*S}d=c+te*v,T[D]=d,D=(D+1)%T.length}o[e]=d}}function Q(){i||le(),T.fill(0),D=0,X=0,k=0,Y=Math.floor(he/1e3*((i==null?void 0:i.sampleRate)||ye)),!x&&!H&&V()}function ke(){i||le(),A=!A,A?(x=!1,Q(),L=window.setInterval(()=>{Q()},1500),V()):L&&(clearInterval(L),L=null),pe()}function Te(){i||le(),A&&(L&&(clearInterval(L),L=null),A=!1),x=!x,x?(T.fill(0),D=0,X=0,k=0,V()):H&&(cancelAnimationFrame(H),H=null),pe()}function pe(){const t=document.getElementById("continuousBtn");t&&(t.textContent=x?"Stop Continuous":"Start Continuous",t.classList.toggle("active",x));const o=document.getElementById("autoPluckBtn");o&&(o.textContent=A?"Stop Auto-Pluck":"Start Auto-Pluck",o.classList.toggle("active",A))}function xe(t){de=t,k=0}function Se(t){E=Math.floor(t),i&&ue(),M(),Ae()}function Pe(t){te=t,M()}function Ee(t){K=t,M();const o=document.getElementById("lowpassControls");o&&(o.style.display=t?"block":"none")}function Ie(t){ne=t,M()}function we(t){R=t,M()}function Fe(t){ee=t,w&&(w.gain.value=t?Z:0);const o=document.getElementById("delayControls");o&&(o.style.display=t?"block":"none")}function Be(t){se=t,I&&(I.delayTime.value=t)}function Le(t){re=t,W&&(W.gain.value=t)}function De(t){Z=t,w&&ee&&(w.gain.value=t)}function Ae(){const t=document.getElementById("delayDisplay");if(t&&i){const o=(E/i.sampleRate*1e3).toFixed(2),g=(i.sampleRate/E).toFixed(1);t.textContent=`${E} samples (${o}ms, ${g}Hz)`}}function V(){x&&(H=requestAnimationFrame(V))}function M(){if(!U)return;const t=U.canvas,o=t.width,g=t.height,e=U,c=B("--bg-primary"),d=B("--bg-tertiary"),u=B("--accent-primary"),v=B("--accent-secondary"),S=B("--accent-warning"),h=B("--text-primary"),q=B("--text-secondary");if(e.fillStyle=c,e.fillRect(0,0,o,g),E===0){e.fillStyle=q,e.font="16px -apple-system, sans-serif",e.textAlign="center",e.fillText("No Filter (Bypass)",o/2,g/2-10),e.fillText("Input passes through unchanged",o/2,g/2+15);return}const l=100,p=50,a=g/2;e.fillStyle=u,e.font="bold 16px -apple-system, sans-serif",e.textAlign="center",e.fillText("Feedback Comb Filter",o/2,30);let F=2;K&&F++,R>0&&F++;const s=120,m=F*s,f=60,y=o/2+150-m/2+f/2-50,b=y+80,ae=y-100,C=b+100;e.fillStyle=h,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Input",ae,a+5),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(ae+30,a),e.lineTo(y-20,a),e.stroke(),e.beginPath(),e.moveTo(y-20,a),e.lineTo(y-25,a-5),e.moveTo(y-20,a),e.lineTo(y-25,a+5),e.stroke(),e.fillStyle=c,e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.arc(y,a,15,0,2*Math.PI),e.fill(),e.stroke(),e.fillStyle=h,e.font="20px -apple-system, sans-serif",e.textAlign="center",e.fillText("+",y,a+7),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(y+15,a),e.lineTo(b-5,a),e.stroke(),e.beginPath(),e.moveTo(b-5,a),e.lineTo(b-10,a-5),e.moveTo(b-5,a),e.lineTo(b-10,a+5),e.stroke(),e.fillStyle=u,e.beginPath(),e.arc(b,a,5,0,2*Math.PI),e.fill(),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(b,a),e.lineTo(C-30,a),e.stroke(),e.beginPath(),e.moveTo(C-30,a),e.lineTo(C-35,a-5),e.moveTo(C-30,a),e.lineTo(C-35,a+5),e.stroke(),e.fillStyle=h,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Output",C,a+5);const n=a+90;e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(b,a+5),e.lineTo(b,n),e.stroke();let r=b;e.fillStyle=d,e.fillRect(r-l/2,n-p/2,l,p),e.strokeStyle=u,e.lineWidth=2,e.strokeRect(r-l/2,n-p/2,l,p),e.fillStyle=h,e.font="13px -apple-system, sans-serif",e.textAlign="center",e.fillText("Delay",r,n-5),e.fillText(`${E} smp`,r,n+10),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(r-l/2,n),e.lineTo(r-l/2-(s-l),n),e.stroke(),e.beginPath();const O=r-l/2-(s-l);if(e.moveTo(O,n),e.lineTo(O+5,n-5),e.moveTo(O,n),e.lineTo(O+5,n+5),e.stroke(),r-=s,K){e.fillStyle=d,e.fillRect(r-l/2,n-p/2,l,p),e.strokeStyle=v,e.lineWidth=2,e.strokeRect(r-l/2,n-p/2,l,p),e.fillStyle=h,e.font="13px -apple-system, sans-serif",e.fillText("Lowpass",r,n-5),e.fillText(`${(ne/1e3).toFixed(1)}kHz`,r,n+10),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(r-l/2,n),e.lineTo(r-l/2-(s-l),n),e.stroke(),e.beginPath();const P=r-l/2-(s-l);e.moveTo(P,n),e.lineTo(P+5,n-5),e.moveTo(P,n),e.lineTo(P+5,n+5),e.stroke(),r-=s}if(R>0){e.fillStyle=d,e.fillRect(r-l/2,n-p/2,l,p),e.strokeStyle=S,e.lineWidth=2,e.strokeRect(r-l/2,n-p/2,l,p),e.fillStyle=h,e.font="13px -apple-system, sans-serif",e.fillText("Noise",r,n-5),e.fillText(`${R.toFixed(2)}`,r,n+10),e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(r-l/2,n),e.lineTo(r-l/2-(s-l),n),e.stroke(),e.beginPath();const P=r-l/2-(s-l);e.moveTo(P,n),e.lineTo(P+5,n-5),e.moveTo(P,n),e.lineTo(P+5,n+5),e.stroke(),r-=s}e.fillStyle=d,e.fillRect(r-l/2,n-p/2,l,p),e.strokeStyle=u,e.lineWidth=2,e.strokeRect(r-l/2,n-p/2,l,p),e.fillStyle=h,e.font="13px -apple-system, sans-serif",e.fillText("Gain",r,n-5),e.fillText(te.toFixed(3),r,n+10);const $=r-l/2-30,j=a-50;e.strokeStyle=u,e.lineWidth=2,e.beginPath(),e.moveTo(r-l/2,n),e.lineTo($,n),e.stroke(),e.beginPath(),e.moveTo($,n),e.lineTo($,j),e.stroke(),e.beginPath(),e.moveTo($,j),e.lineTo(y-15,j),e.lineTo(y-15,a-15),e.stroke(),e.beginPath(),e.moveTo(y-15,a-15),e.lineTo(y-20,a-20),e.moveTo(y-15,a-15),e.lineTo(y-10,a-20),e.stroke()}function Me(){const t=document.querySelector("#app");t.innerHTML=`
    <div class="app-header">
      <h1>Karplus-Strong Demo</h1>
      <p class="subtitle">Explore how delays create resonant frequencies</p>
      <div class="theory-box">
        <p><strong>How it works:</strong> A feedback comb filter adds a delayed copy of the output back to the input.
        This creates resonant peaks at frequencies where the delay time matches whole cycles of the wave.</p>

        <p><strong>Why noise becomes pitch:</strong> White noise contains all frequencies equally. When fed through
        the delay feedback loop, only frequencies that "fit" the delay time constructively interfere and build up into
        audible resonances. A 111-sample delay at 48kHz creates peaks every ~432Hz (the fundamental) and its harmonics
        (864Hz, 1296Hz...), transforming random noise into a musical tone!</p>

        <p><strong>Why pitch changes with delay:</strong> The fundamental frequency equals sample_rate ÷ delay_samples.
        Shorter delays (fewer samples) = higher pitch, longer delays = lower pitch. With 48kHz sampling: 100 samples ≈ 480Hz,
        200 samples ≈ 240Hz. It's like changing string length on a guitar! The sample rate here is usually set by hardware, in this case the web audio API, but were it changeable it would be like tuning. A faster sample rate is analagous to the increased tension in the string.</p>

        <p><strong>Why it sounds like a string:</strong> Real plucked strings work exactly this way! When you pluck a guitar
        string, the vibration travels to the bridge, reflects back, and reinforces itself—creating a delay loop in physical space.
        This digital simulation (Karplus-Strong algorithm) replicates that process: the "pluck" is noise, the delay line is the
        string length, feedback is the reflection, and the lowpass filter mimics how strings lose high frequencies over time,
        creating realistic decay and timbre. Lowering the gain is like adding palm mute.</p>
      </div>
    </div>

    <div class="main-container">
      <section class="control-panel">
        <h2>Filter Parameters</h2>

        <div class="control-group">
          <label>Delay: <span id="delayDisplay" class="value-display">441 samples</span></label>
          <input type="range" id="delaySamplesSlider"
                 min="0" max="${ge}" value="441" step="1">
        </div>

        <div class="control-group">
          <label>Feedback: <span id="feedbackDisplay" class="value-display">0.985</span></label>
          <input type="range" id="feedbackSlider"
                 min="0" max="0.999" value="0.985" step="0.001">
        </div>

        <div class="control-group checkbox-group">
          <label>
            <input type="checkbox" id="lowpassToggle" checked>
            Enable Lowpass Filter
          </label>
        </div>

        <div id="lowpassControls" class="lowpass-controls" style="display: block;">
          <div class="control-group">
            <label>Cutoff Frequency: <span id="cutoffDisplay" class="value-display">5.0 kHz</span></label>
            <input type="range" id="cutoffSlider"
                   min="500" max="10000" value="5000" step="100">
          </div>
        </div>

        <div class="control-group">
          <label>Dither: <span id="noiseDisplay" class="value-display">0.000</span></label>
          <input type="range" id="noiseSlider"
                 min="0" max="0.1" value="0" step="0.001">
        </div>

        <h2 style="margin-top: 2rem;">Input Source</h2>

        <div class="control-group">
          <label>Waveform:</label>
          <select id="inputSourceSelect">
            <option value="noise">White Noise</option>
            <option value="sine">Sine Wave (440Hz)</option>
            <option value="square">Square Wave (440Hz)</option>
          </select>
        </div>

        <h2 style="margin-top: 2rem;">Playback Mode</h2>

        <div class="button-grid">
          <button id="pluckBtn" type="button" class="action-btn">Pluck</button>
          <button id="autoPluckBtn" type="button" class="toggle-btn">Start Auto-Pluck</button>
          <button id="continuousBtn" type="button" class="toggle-btn">Start Continuous</button>
        </div>

        <h2 style="margin-top: 2rem;">Delay Effect</h2>

        <div class="control-group checkbox-group">
          <label>
            <input type="checkbox" id="delayToggle">
            Enable Delay
          </label>
        </div>

        <div id="delayControls" class="delay-controls" style="display: none;">
          <div class="control-group">
            <label>Delay Time: <span id="delayTimeDisplay" class="value-display">300 ms</span></label>
            <input type="range" id="delayTimeSlider"
                   min="50" max="1000" value="300" step="10">
          </div>

          <div class="control-group">
            <label>Feedback: <span id="delayFeedbackDisplay" class="value-display">0.40</span></label>
            <input type="range" id="delayFeedbackSlider"
                   min="0" max="0.9" value="0.4" step="0.01">
          </div>

          <div class="control-group">
            <label>Mix (Wet): <span id="delayMixDisplay" class="value-display">30%</span></label>
            <input type="range" id="delayMixSlider"
                   min="0" max="1" value="0.3" step="0.01">
          </div>
        </div>
      </section>

      <section class="circuit-panel">
        <canvas id="diagramCanvas" width="800" height="450"></canvas>
      </section>
    </div>
  `;const o=document.getElementById("diagramCanvas");o&&(U=o.getContext("2d")),M();const g=document.getElementById("delaySamplesSlider");g==null||g.addEventListener("input",s=>{Se(parseFloat(s.target.value))});const e=document.getElementById("feedbackSlider");e==null||e.addEventListener("input",s=>{const m=parseFloat(s.target.value);Pe(m);const f=document.getElementById("feedbackDisplay");f&&(f.textContent=m.toFixed(2))});const c=document.getElementById("lowpassToggle");c==null||c.addEventListener("change",s=>{Ee(s.target.checked)});const d=document.getElementById("cutoffSlider");d==null||d.addEventListener("input",s=>{const m=parseFloat(s.target.value);Ie(m);const f=document.getElementById("cutoffDisplay");f&&(f.textContent=`${(m/1e3).toFixed(1)} kHz`)});const u=document.getElementById("noiseSlider");u==null||u.addEventListener("input",s=>{const m=parseFloat(s.target.value);we(m);const f=document.getElementById("noiseDisplay");f&&(f.textContent=m.toFixed(3))});const v=document.getElementById("inputSourceSelect");v==null||v.addEventListener("change",s=>{xe(s.target.value)});const S=document.getElementById("pluckBtn");S==null||S.addEventListener("click",Q);const h=document.getElementById("autoPluckBtn");h==null||h.addEventListener("click",ke);const q=document.getElementById("continuousBtn");q==null||q.addEventListener("click",Te);const l=document.getElementById("delayToggle");l==null||l.addEventListener("change",s=>{Fe(s.target.checked)});const p=document.getElementById("delayTimeSlider");p==null||p.addEventListener("input",s=>{const m=parseFloat(s.target.value);Be(m/1e3);const f=document.getElementById("delayTimeDisplay");f&&(f.textContent=`${m} ms`)});const a=document.getElementById("delayFeedbackSlider");a==null||a.addEventListener("input",s=>{const m=parseFloat(s.target.value);Le(m);const f=document.getElementById("delayFeedbackDisplay");f&&(f.textContent=m.toFixed(2))});const F=document.getElementById("delayMixSlider");F==null||F.addEventListener("input",s=>{const m=parseFloat(s.target.value);De(m);const f=document.getElementById("delayMixDisplay");f&&(f.textContent=`${Math.round(m*100)}%`)})}Me();const Ce=new MutationObserver(t=>{t.forEach(o=>{o.attributeName==="class"&&M()})});Ce.observe(document.body,{attributes:!0});
