(function(){const c=document.createElement("link").relList;if(c&&c.supports&&c.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))e(t);new MutationObserver(t=>{for(const o of t)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function f(t){const o={};return t.integrity&&(o.integrity=t.integrity),t.referrerPolicy&&(o.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?o.credentials="include":t.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(t){if(t.ep)return;t.ep=!0;const o=f(t);fetch(t.href,o)}})();let s=null,G=null,A=null,z=null,h=!1,M=null,T=null,w=null,x=null,H=null,L=null,Z=.3,ee=.4,U=.3,K=!1;const ie=48e3,oe=1e3,te=441;let b=te,V=.985,$=!0,j=5e3,F=0,ne="noise",m=0,Q=440,E=!1,S=null,N=0;const se=50;let g=new Float32Array(te),P=0,C=0,X=null;function J(){return s||(s=new AudioContext,z=s.createAnalyser(),z.fftSize=2048,A=s.createGain(),A.gain.value=.3,G=s.createScriptProcessor(4096,1,1),G.onaudioprocess=re,T=s.createDelay(2),T.delayTime.value=Z,w=s.createGain(),w.gain.value=ee,x=s.createGain(),x.gain.value=K?U:0,H=s.createGain(),H.gain.value=1,L=s.createGain(),L.gain.value=1,G.connect(A),A.connect(H),H.connect(L),A.connect(T),T.connect(w),w.connect(T),T.connect(x),x.connect(L),L.connect(z),z.connect(s.destination),le(),s)}function le(){if(!s)return;const l=Math.max(b,1);g=new Float32Array(l),g.fill(0),P=0,C=0}function ce(){if(N<=0&&!h)return 0;let l=0;switch(ne){case"noise":l=(Math.random()*2-1)*.3;break;case"sine":s&&(l=Math.sin(m)*.3,m+=2*Math.PI*Q/s.sampleRate,m>2*Math.PI&&(m-=2*Math.PI));break;case"square":s&&(l=(Math.sin(m)>0?1:-1)*.3,m+=2*Math.PI*Q/s.sampleRate,m>2*Math.PI&&(m-=2*Math.PI));break}return N>0?(N--,l):h?l:0}function re(l){const c=l.outputBuffer.getChannelData(0),f=c.length;if(!s||g.length===0){c.fill(0);return}for(let e=0;e<f;e++){const t=ce();let o=t;if(b>0){const i=(P-b+g.length)%g.length;let y=g[i];if($&&s){const u=2*Math.PI*j/s.sampleRate,k=Math.min(u,1);y=k*y+(1-k)*C,C=y}if(F>0){const u=Math.abs(y);y+=(Math.random()*2-1)*F*u}o=t+V*y,g[P]=o,P=(P+1)%g.length}c[e]=o}}function Y(){s||J(),g.fill(0),P=0,C=0,m=0,N=Math.floor(se/1e3*((s==null?void 0:s.sampleRate)||ie)),!h&&!M&&_()}function de(){s||J(),E=!E,E?(h=!1,Y(),S=window.setInterval(()=>{Y()},1500),_()):S&&(clearInterval(S),S=null),ae()}function ue(){s||J(),E&&(S&&(clearInterval(S),S=null),E=!1),h=!h,h?(g.fill(0),P=0,C=0,m=0,_()):M&&(cancelAnimationFrame(M),M=null),ae()}function ae(){const l=document.getElementById("continuousBtn");l&&(l.textContent=h?"Stop Continuous":"Start Continuous",l.classList.toggle("active",h));const c=document.getElementById("autoPluckBtn");c&&(c.textContent=E?"Stop Auto-Pluck":"Start Auto-Pluck",c.classList.toggle("active",E))}function pe(l){ne=l,m=0}function fe(l){b=Math.floor(l),s&&le(),B(),xe()}function ye(l){V=l,B()}function me(l){$=l,B();const c=document.getElementById("lowpassControls");c&&(c.style.display=l?"block":"none")}function ge(l){j=l,B()}function he(l){F=l,B()}function ve(l){K=l,x&&(x.gain.value=l?U:0);const c=document.getElementById("delayControls");c&&(c.style.display=l?"block":"none")}function be(l){Z=l,T&&(T.delayTime.value=l)}function ke(l){ee=l,w&&(w.gain.value=l)}function Te(l){U=l,x&&K&&(x.gain.value=l)}function xe(){const l=document.getElementById("delayDisplay");if(l&&s){const c=(b/s.sampleRate*1e3).toFixed(2),f=(s.sampleRate/b).toFixed(1);l.textContent=`${b} samples (${c}ms, ${f}Hz)`}}function _(){h&&(M=requestAnimationFrame(_))}function B(){if(!X)return;const l=X.canvas,c=l.width,f=l.height,e=X;if(e.fillStyle="#0a0e27",e.fillRect(0,0,c,f),b===0){e.fillStyle="#8892b0",e.font="16px -apple-system, sans-serif",e.textAlign="center",e.fillText("No Filter (Bypass)",c/2,f/2-10),e.fillText("Input passes through unchanged",c/2,f/2+15);return}const t=100,o=50,i=f/2;e.fillStyle="#16c79a",e.font="bold 16px -apple-system, sans-serif",e.textAlign="center",e.fillText("Feedback Comb Filter",c/2,30);let y=2;$&&y++,F>0&&y++;const u=120,k=y*u,D=60,d=c/2+150-k/2+D/2-50,p=d+80,I=d-100,r=p+100;e.fillStyle="#e0e0e0",e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Input",I,i+5),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(I+30,i),e.lineTo(d-20,i),e.stroke(),e.beginPath(),e.moveTo(d-20,i),e.lineTo(d-25,i-5),e.moveTo(d-20,i),e.lineTo(d-25,i+5),e.stroke(),e.fillStyle="#0a0e27",e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.arc(d,i,15,0,2*Math.PI),e.fill(),e.stroke(),e.fillStyle="#e0e0e0",e.font="20px -apple-system, sans-serif",e.textAlign="center",e.fillText("+",d,i+7),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(d+15,i),e.lineTo(p-5,i),e.stroke(),e.beginPath(),e.moveTo(p-5,i),e.lineTo(p-10,i-5),e.moveTo(p-5,i),e.lineTo(p-10,i+5),e.stroke(),e.fillStyle="#16c79a",e.beginPath(),e.arc(p,i,5,0,2*Math.PI),e.fill(),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(p,i),e.lineTo(r-30,i),e.stroke(),e.beginPath(),e.moveTo(r-30,i),e.lineTo(r-35,i-5),e.moveTo(r-30,i),e.lineTo(r-35,i+5),e.stroke(),e.fillStyle="#e0e0e0",e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Output",r,i+5);const n=i+90;e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(p,i+5),e.lineTo(p,n),e.stroke();let a=p;e.fillStyle="#1a2942",e.fillRect(a-t/2,n-o/2,t,o),e.strokeStyle="#16c79a",e.lineWidth=2,e.strokeRect(a-t/2,n-o/2,t,o),e.fillStyle="#e0e0e0",e.font="13px -apple-system, sans-serif",e.textAlign="center",e.fillText("Delay",a,n-5),e.fillText(`${b} smp`,a,n+10),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(a-t/2,n),e.lineTo(a-t/2-(u-t),n),e.stroke(),e.beginPath();const R=a-t/2-(u-t);if(e.moveTo(R,n),e.lineTo(R+5,n-5),e.moveTo(R,n),e.lineTo(R+5,n+5),e.stroke(),a-=u,$){e.fillStyle="#1a2942",e.fillRect(a-t/2,n-o/2,t,o),e.strokeStyle="#ff6b6b",e.lineWidth=2,e.strokeRect(a-t/2,n-o/2,t,o),e.fillStyle="#e0e0e0",e.font="13px -apple-system, sans-serif",e.fillText("Lowpass",a,n-5),e.fillText(`${(j/1e3).toFixed(1)}kHz`,a,n+10),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(a-t/2,n),e.lineTo(a-t/2-(u-t),n),e.stroke(),e.beginPath();const v=a-t/2-(u-t);e.moveTo(v,n),e.lineTo(v+5,n-5),e.moveTo(v,n),e.lineTo(v+5,n+5),e.stroke(),a-=u}if(F>0){e.fillStyle="#1a2942",e.fillRect(a-t/2,n-o/2,t,o),e.strokeStyle="#ffd93d",e.lineWidth=2,e.strokeRect(a-t/2,n-o/2,t,o),e.fillStyle="#e0e0e0",e.font="13px -apple-system, sans-serif",e.fillText("Noise",a,n-5),e.fillText(`${F.toFixed(2)}`,a,n+10),e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(a-t/2,n),e.lineTo(a-t/2-(u-t),n),e.stroke(),e.beginPath();const v=a-t/2-(u-t);e.moveTo(v,n),e.lineTo(v+5,n-5),e.moveTo(v,n),e.lineTo(v+5,n+5),e.stroke(),a-=u}e.fillStyle="#1a2942",e.fillRect(a-t/2,n-o/2,t,o),e.strokeStyle="#16c79a",e.lineWidth=2,e.strokeRect(a-t/2,n-o/2,t,o),e.fillStyle="#e0e0e0",e.font="13px -apple-system, sans-serif",e.fillText("Gain",a,n-5),e.fillText(V.toFixed(3),a,n+10);const q=a-t/2-30,O=i-50;e.strokeStyle="#16c79a",e.lineWidth=2,e.beginPath(),e.moveTo(a-t/2,n),e.lineTo(q,n),e.stroke(),e.beginPath(),e.moveTo(q,n),e.lineTo(q,O),e.stroke(),e.beginPath(),e.moveTo(q,O),e.lineTo(d-15,O),e.lineTo(d-15,i-15),e.stroke(),e.beginPath(),e.moveTo(d-15,i-15),e.lineTo(d-20,i-20),e.moveTo(d-15,i-15),e.lineTo(d-10,i-20),e.stroke()}function Se(){const l=document.querySelector("#app");l.innerHTML=`
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
                 min="0" max="${oe}" value="441" step="1">
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
  `;const c=document.getElementById("diagramCanvas");c&&(X=c.getContext("2d")),B();const f=document.getElementById("delaySamplesSlider");f==null||f.addEventListener("input",r=>{fe(parseFloat(r.target.value))});const e=document.getElementById("feedbackSlider");e==null||e.addEventListener("input",r=>{const n=parseFloat(r.target.value);ye(n);const a=document.getElementById("feedbackDisplay");a&&(a.textContent=n.toFixed(2))});const t=document.getElementById("lowpassToggle");t==null||t.addEventListener("change",r=>{me(r.target.checked)});const o=document.getElementById("cutoffSlider");o==null||o.addEventListener("input",r=>{const n=parseFloat(r.target.value);ge(n);const a=document.getElementById("cutoffDisplay");a&&(a.textContent=`${(n/1e3).toFixed(1)} kHz`)});const i=document.getElementById("noiseSlider");i==null||i.addEventListener("input",r=>{const n=parseFloat(r.target.value);he(n);const a=document.getElementById("noiseDisplay");a&&(a.textContent=n.toFixed(3))});const y=document.getElementById("inputSourceSelect");y==null||y.addEventListener("change",r=>{pe(r.target.value)});const u=document.getElementById("pluckBtn");u==null||u.addEventListener("click",Y);const k=document.getElementById("autoPluckBtn");k==null||k.addEventListener("click",de);const D=document.getElementById("continuousBtn");D==null||D.addEventListener("click",ue);const W=document.getElementById("delayToggle");W==null||W.addEventListener("change",r=>{ve(r.target.checked)});const d=document.getElementById("delayTimeSlider");d==null||d.addEventListener("input",r=>{const n=parseFloat(r.target.value);be(n/1e3);const a=document.getElementById("delayTimeDisplay");a&&(a.textContent=`${n} ms`)});const p=document.getElementById("delayFeedbackSlider");p==null||p.addEventListener("input",r=>{const n=parseFloat(r.target.value);ke(n);const a=document.getElementById("delayFeedbackDisplay");a&&(a.textContent=n.toFixed(2))});const I=document.getElementById("delayMixSlider");I==null||I.addEventListener("input",r=>{const n=parseFloat(r.target.value);Te(n);const a=document.getElementById("delayMixDisplay");a&&(a.textContent=`${Math.round(n*100)}%`)})}Se();
