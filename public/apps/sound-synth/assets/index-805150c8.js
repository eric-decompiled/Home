(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))d(o);new MutationObserver(o=>{for(const s of o)if(s.type==="childList")for(const m of s.addedNodes)m.tagName==="LINK"&&m.rel==="modulepreload"&&d(m)}).observe(document,{childList:!0,subtree:!0});function a(o){const s={};return o.integrity&&(s.integrity=o.integrity),o.referrerPolicy&&(s.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?s.credentials="include":o.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function d(o){if(o.ep)return;o.ep=!0;const s=a(o);fetch(o.href,s)}})();const k=12,z=.25;let r=null,l=null,ee=[],g=[],f=null,E=null,w=null,q=null,R=110;const C=new Array(k).fill(0);let v=50,h=200,x=.7,b=300,P=.01,V=.3,L=.3;const u=new Set;let p=0,$=!1,I=[],T=!1,c=[];const te=[{note:"C2",freq:65.41,white:!0},{note:"C#2",freq:69.3,white:!1},{note:"D2",freq:73.42,white:!0},{note:"D#2",freq:77.78,white:!1},{note:"E2",freq:82.41,white:!0},{note:"F2",freq:87.31,white:!0},{note:"F#2",freq:92.5,white:!1},{note:"G2",freq:98,white:!0},{note:"G#2",freq:103.83,white:!1},{note:"A2",freq:110,white:!0},{note:"A#2",freq:116.54,white:!1},{note:"B2",freq:123.47,white:!0},{note:"C3",freq:130.81,white:!0},{note:"C#3",freq:138.59,white:!1},{note:"D3",freq:146.83,white:!0},{note:"D#3",freq:155.56,white:!1},{note:"E3",freq:164.81,white:!0},{note:"F3",freq:174.61,white:!0},{note:"F#3",freq:185,white:!1},{note:"G3",freq:196,white:!0},{note:"G#3",freq:207.65,white:!1},{note:"A3",freq:220,white:!0},{note:"A#3",freq:233.08,white:!1},{note:"B3",freq:246.94,white:!0},{note:"C4",freq:261.63,white:!0},{note:"C#4",freq:277.18,white:!1},{note:"D4",freq:293.66,white:!0},{note:"D#4",freq:311.13,white:!1},{note:"E4",freq:329.63,white:!0},{note:"F4",freq:349.23,white:!0},{note:"F#4",freq:369.99,white:!1},{note:"G4",freq:392,white:!0},{note:"G#4",freq:415.3,white:!1},{note:"A4",freq:440,white:!0},{note:"A#4",freq:466.16,white:!1},{note:"B4",freq:493.88,white:!0},{note:"C5",freq:523.25,white:!0}];function S(e){var t;u.has(e)||(r||we(),u.add(e),R=te[e].freq*Math.pow(2,p),qe(),(t=document.querySelector(`[data-note-index="${e}"]`))==null||t.classList.add("active"),l&&ke())}function B(e){var t;u.has(e)&&(u.delete(e),(t=document.querySelector(`[data-note-index="${e}"]`))==null||t.classList.remove("active"),u.size===0&&K())}function fe(e){I.forEach(a=>clearTimeout(a)),I=[];let t=0;e.forEach(({noteIndex:a,duration:d})=>{const o=setTimeout(()=>{S(a)},t);I.push(o);const s=setTimeout(()=>{B(a)},t+d);I.push(s),t+=d})}const Y={odeToJoy:[{noteIndex:28,duration:400},{noteIndex:28,duration:400},{noteIndex:29,duration:400},{noteIndex:31,duration:400},{noteIndex:31,duration:400},{noteIndex:29,duration:400},{noteIndex:28,duration:400},{noteIndex:26,duration:400},{noteIndex:24,duration:400},{noteIndex:24,duration:400},{noteIndex:26,duration:400},{noteIndex:28,duration:400},{noteIndex:28,duration:600},{noteIndex:26,duration:200},{noteIndex:26,duration:800}],twinkleStar:[{noteIndex:24,duration:400},{noteIndex:24,duration:400},{noteIndex:31,duration:400},{noteIndex:31,duration:400},{noteIndex:33,duration:400},{noteIndex:33,duration:400},{noteIndex:31,duration:800},{noteIndex:29,duration:400},{noteIndex:29,duration:400},{noteIndex:28,duration:400},{noteIndex:28,duration:400},{noteIndex:26,duration:400},{noteIndex:26,duration:400},{noteIndex:24,duration:800}],jazzRiff:[{noteIndex:12,duration:300},{noteIndex:15,duration:300},{noteIndex:17,duration:300},{noteIndex:19,duration:600},{noteIndex:24,duration:300},{noteIndex:27,duration:300},{noteIndex:29,duration:300},{noteIndex:31,duration:600},{noteIndex:29,duration:300},{noteIndex:27,duration:300},{noteIndex:24,duration:600},{noteIndex:12,duration:900}],ascendingScale:[{noteIndex:12,duration:250},{noteIndex:14,duration:250},{noteIndex:16,duration:250},{noteIndex:17,duration:250},{noteIndex:19,duration:250},{noteIndex:21,duration:250},{noteIndex:23,duration:250},{noteIndex:24,duration:250},{noteIndex:26,duration:250},{noteIndex:28,duration:250},{noteIndex:29,duration:250},{noteIndex:31,duration:250},{noteIndex:33,duration:250},{noteIndex:35,duration:250},{noteIndex:36,duration:500},{noteIndex:35,duration:250},{noteIndex:33,duration:250},{noteIndex:31,duration:250},{noteIndex:29,duration:250},{noteIndex:28,duration:250},{noteIndex:26,duration:250},{noteIndex:24,duration:500}],babyShark:[{noteIndex:24,duration:200},{noteIndex:26,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:24,duration:200},{noteIndex:26,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:28,duration:200},{noteIndex:24,duration:200},{noteIndex:26,duration:200},{noteIndex:28,duration:400},{noteIndex:26,duration:400},{noteIndex:24,duration:600}],imperialMarch:[{noteIndex:19,duration:500},{noteIndex:19,duration:500},{noteIndex:19,duration:500},{noteIndex:15,duration:350},{noteIndex:22,duration:150},{noteIndex:19,duration:500},{noteIndex:15,duration:350},{noteIndex:22,duration:150},{noteIndex:19,duration:1e3},{noteIndex:26,duration:500},{noteIndex:26,duration:500},{noteIndex:26,duration:500},{noteIndex:27,duration:350},{noteIndex:22,duration:150},{noteIndex:18,duration:500},{noteIndex:15,duration:350},{noteIndex:22,duration:150},{noteIndex:19,duration:1e3}]},G={odeToJoy:"ode-to-joy",twinkleStar:"twinkle-star",jazzRiff:"jazz-riff",ascendingScale:"ascending-scale",babyShark:"baby-shark",imperialMarch:"imperial-march"};function ve(e){T&&ne(),T=!0,j(e),fe(Y[e]);const t=Y[e].reduce((a,d)=>a+d.duration,0);I.push(setTimeout(()=>{T=!1,j(null)},t+100))}function ne(){I.forEach(e=>clearTimeout(e)),I=[],T=!1,u.forEach(e=>{var t;(t=document.querySelector(`[data-note-index="${e}"]`))==null||t.classList.remove("active")}),u.clear(),K(),j(null)}function j(e){var t;Object.values(G).forEach(a=>{var d;(d=document.getElementById(`melody-${a}`))==null||d.classList.remove("playing")}),e&&((t=document.getElementById(`melody-${G[e]}`))==null||t.classList.add("playing"))}function Ie(e){const t={name:e,harmonics:[...C],attack:v,decay:h,sustain:x,release:b};c.push(t),ae(),H(t,c.length-1)}function he(e){[v,h,x,b]=[e.attack,e.decay,e.sustain,e.release],oe();for(let t=0;t<k;t++)J(t,e.harmonics[t]),ie(t)}function xe(e){c.splice(e,1),ae(),Ee()}function ae(){localStorage.setItem("customInstruments",JSON.stringify(c))}function be(){try{c=JSON.parse(localStorage.getItem("customInstruments")||"[]")}catch{c=[]}}function H(e,t){const a=document.querySelector(".action-buttons");if(!a)return;const d=document.createElement("button");d.id=`preset-custom-${t}`,d.className="custom-preset",d.innerHTML=`
    ${e.name}
    <span class="delete-custom" data-index="${t}">×</span>
  `,d.addEventListener("click",o=>{const s=o.target;if(s.classList.contains("delete-custom")){o.stopPropagation();const m=Number(s.getAttribute("data-index"));confirm(`Delete "${c[m].name}"?`)&&xe(m)}else ge(t)}),a.appendChild(d)}function ge(e){document.querySelectorAll(".action-buttons button").forEach(a=>a.classList.remove("selected"));const t=document.getElementById(`preset-custom-${e}`);t&&t.classList.add("selected"),he(c[e])}function Ee(){document.querySelectorAll(".custom-preset").forEach(e=>e.remove()),c.forEach((e,t)=>{H(e,t)})}function we(){if(!r){r=new AudioContext,f=r.createDelay(2),f.delayTime.value=P,E=r.createGain(),E.gain.value=V,w=r.createGain(),w.gain.value=L,q=r.createGain(),q.gain.value=1-L,f.connect(E),E.connect(f),f.connect(w),l=r.createGain(),l.gain.value=z,q.connect(r.destination),w.connect(r.destination);for(let e=0;e<k;e++){const t=r.createOscillator(),a=r.createGain();t.type="sine",t.frequency.value=R*(e+1),a.gain.value=C[e],t.connect(a),a.connect(l),t.start(),ee.push(t),g.push(a)}l.connect(q),l.connect(f)}}function qe(){ee.forEach((e,t)=>{e.frequency.setValueAtTime(R*(t+1),r.currentTime)})}function J(e,t){if(C[e]=t,g[e]&&r){const a=r.currentTime;g[e].gain.cancelScheduledValues(a),g[e].gain.setValueAtTime(g[e].gain.value,a),g[e].gain.exponentialRampToValueAtTime(t===0?.001:t,a+.05)}}function ke(){if(!l||!r)return;const e=r.currentTime,t=z*x;l.gain.cancelScheduledValues(e),l.gain.setValueAtTime(.001,e),l.gain.exponentialRampToValueAtTime(z,e+v/1e3),l.gain.exponentialRampToValueAtTime(Math.max(t,.001),e+(v+h)/1e3)}function K(){if(!l||!r)return;const e=r.currentTime;l.gain.cancelScheduledValues(e),l.gain.setValueAtTime(l.gain.value,e),l.gain.exponentialRampToValueAtTime(.001,e+b/1e3)}const Se={guitar:{adsr:[10,300,.3,400],harmonicFn:e=>.8/Math.pow(e+1,1.1)},string:{adsr:[50,200,.7,300],harmonicFn:e=>.8/Math.pow(e+1,1.2)},wind:{adsr:[200,100,.8,250],harmonicFn:e=>(e+1)%2===0?.7/(e+1):.2/(e+1)},clarinet:{adsr:[80,150,.75,200],harmonicFn:e=>(e+1)%2===1?.8/(e+1):.05/(e+1)},sine:{adsr:[50,50,1,100],harmonicFn:e=>e===0?1:0},sawtooth:{adsr:[20,50,.9,150],harmonicFn:e=>1/(e+1)}};function Z(e){const t=Se[e];[v,h,x,b]=t.adsr;for(let a=0;a<k;a++)J(a,t.harmonicFn(a)),ie(a);oe()}function oe(){[{id:"attack",value:v,format:t=>`${t}ms`},{id:"decay",value:h,format:t=>`${t}ms`},{id:"sustain",value:x*100,format:t=>`${Math.round(t)}%`},{id:"release",value:b,format:t=>`${t}ms`}].forEach(({id:t,value:a,format:d})=>{const o=document.getElementById(t),s=document.getElementById(`${t}-display`);o&&(o.value=String(a)),s&&(s.textContent=d(a))})}function ie(e){const t=C[e]*100,a=document.getElementById(`harmonic-${e}`),d=document.getElementById(`amp-${e}`),o=document.getElementById(`bar-${e}`);a&&(a.value=String(t)),d&&(d.textContent=`${Math.round(t)}%`),o&&(o.style.height=`${t}%`)}function Le(){var Q;const e=document.querySelector("#app");e.innerHTML=`
    <div class="app-header">
      <h1>Harmonics Explorer</h1>
      <p>Manipulate overtones to understand the nature of sound and timbre</p>
    </div>

    <div class="main-controls">
      <div class="action-buttons">
        <button id="preset-guitar">Guitar</button>
        <button id="preset-string">String</button>
        <button id="preset-clarinet">Clarinet</button>
        <button id="preset-wind">Flute</button>
        <button id="preset-sine">Pure Sine</button>
        <button id="preset-sawtooth">Sawtooth</button>
      </div>

      <div class="envelope-row">
        <div class="envelope-param">
          <label for="attack">Attack</label>
          <input type="range" id="attack" min="1" max="2000" value="50" step="1">
          <div class="envelope-display" id="attack-display">50ms</div>
        </div>
        <div class="envelope-param">
          <label for="decay">Decay</label>
          <input type="range" id="decay" min="1" max="2000" value="200" step="1">
          <div class="envelope-display" id="decay-display">200ms</div>
        </div>
        <div class="envelope-param">
          <label for="sustain">Sustain</label>
          <input type="range" id="sustain" min="0" max="100" value="70" step="1">
          <div class="envelope-display" id="sustain-display">70%</div>
        </div>
        <div class="envelope-param">
          <label for="release">Release</label>
          <input type="range" id="release" min="1" max="3000" value="300" step="1">
          <div class="envelope-display" id="release-display">300ms</div>
        </div>
      </div>

      <div class="delay-row">
        <div class="delay-param">
          <label for="delay-time">Delay Time</label>
          <input type="range" id="delay-time" min="10" max="2000" value="10" step="10">
          <div class="delay-display" id="delay-time-display">10ms</div>
        </div>
        <div class="delay-param">
          <label for="delay-feedback">Feedback</label>
          <input type="range" id="delay-feedback" min="0" max="90" value="30" step="1">
          <div class="delay-display" id="delay-feedback-display">30%</div>
        </div>
        <div class="delay-param">
          <label for="delay-mix">Mix</label>
          <input type="range" id="delay-mix" min="0" max="100" value="30" step="1">
          <div class="delay-display" id="delay-mix-display">30%</div>
        </div>
      </div>
    </div>

    <div class="equalizer-section">
      <div class="equalizer-header">
        <h2>Harmonic Equalizer</h2>
        <button id="create-instrument-btn" class="create-btn">+ Create Instrument</button>
      </div>
      <div class="equalizer-container">
        ${Array.from({length:k},(n,i)=>{const y=i+1;return`
            <div class="eq-channel ${y%2===1?"odd":"even"}">
              <div class="eq-label">H${y}</div>
              <div class="eq-slider-container">
                <div class="eq-level-bar" id="bar-${i}" style="height: 0%"></div>
                <input type="range" id="harmonic-${i}" min="0" max="100" value="0" step="1" orient="vertical">
              </div>
              <div class="eq-value" id="amp-${i}">0%</div>
            </div>
          `}).join("")}
      </div>
    </div>

    <div class="keyboard-section">
      <div class="keyboard-header">
        <h2>Piano Keyboard</h2>
        <div class="octave-controls">
          <button id="octave-down" class="octave-btn">Octave -</button>
          <span class="octave-display" id="octave-display">Octave: 0</span>
          <button id="octave-up" class="octave-btn">Octave +</button>
        </div>
      </div>
      <div class="keyboard-hint">Play with mouse or computer keyboard: A-K (white keys), W-P (black keys)</div>
      <div class="keyboard">
        ${te.map((n,i)=>`<div class="piano-key ${n.white?"white-key":"black-key"}" data-note-index="${i}" data-note="${n.note}">
            ${n.white?`<span class="key-label">${n.note}</span>`:""}
          </div>`).join("")}
      </div>
    </div>

    <div class="melody-section">
      <div class="melody-header">
        <h2>Play Melodies</h2>
        <button id="stop-melody-btn" class="stop-btn">Stop</button>
      </div>
      <div class="melody-buttons">
        <button id="melody-ode-to-joy" class="melody-btn">Ode to Joy</button>
        <button id="melody-twinkle-star" class="melody-btn">Twinkle Star</button>
        <button id="melody-jazz-riff" class="melody-btn">Jazz Riff</button>
        <button id="melody-ascending-scale" class="melody-btn">Scale</button>
        <button id="melody-baby-shark" class="melody-btn">Baby Shark</button>
        <button id="melody-imperial-march" class="melody-btn">Imperial March</button>
      </div>
    </div>
  `;const t=document.getElementById("octave-up"),a=document.getElementById("octave-down"),d=document.getElementById("octave-display");t.addEventListener("click",()=>{p<2&&(p++,d.textContent=`Octave: ${p>0?"+":""}${p}`)}),a.addEventListener("click",()=>{p>-2&&(p--,d.textContent=`Octave: ${p>0?"+":""}${p}`)});for(let n=0;n<k;n++){const i=document.getElementById(`harmonic-${n}`),y=document.getElementById(`amp-${n}`),X=document.getElementById(`bar-${n}`);i.addEventListener("input",()=>{const O=Number(i.value)/100;J(n,O),y.textContent=`${Math.round(O*100)}%`,X.style.height=`${O*100}%`})}const o=document.getElementById("attack"),s=document.getElementById("decay"),m=document.getElementById("sustain"),U=document.getElementById("release"),de=document.getElementById("attack-display"),re=document.getElementById("decay-display"),se=document.getElementById("sustain-display"),le=document.getElementById("release-display");o.addEventListener("input",()=>{v=Number(o.value),de.textContent=`${v}ms`}),s.addEventListener("input",()=>{h=Number(s.value),re.textContent=`${h}ms`}),m.addEventListener("input",()=>{x=Number(m.value)/100,se.textContent=`${Math.round(x*100)}%`}),U.addEventListener("input",()=>{b=Number(U.value),le.textContent=`${b}ms`});const A=document.getElementById("delay-time"),M=document.getElementById("delay-feedback"),D=document.getElementById("delay-mix"),ue=document.getElementById("delay-time-display"),ce=document.getElementById("delay-feedback-display"),me=document.getElementById("delay-mix-display");A.addEventListener("input",()=>{P=Number(A.value)/1e3,f&&f.delayTime.setValueAtTime(P,r.currentTime),ue.textContent=`${Number(A.value)}ms`}),M.addEventListener("input",()=>{V=Number(M.value)/100,E&&E.gain.setValueAtTime(V,r.currentTime),ce.textContent=`${Number(M.value)}%`}),D.addEventListener("input",()=>{L=Number(D.value)/100,w&&q&&(w.gain.setValueAtTime(L,r.currentTime),q.gain.setValueAtTime(1-L,r.currentTime)),me.textContent=`${Number(D.value)}%`});const _=["guitar","string","clarinet","wind","sine","sawtooth"],N=Object.fromEntries(_.map(n=>[n,document.getElementById(`preset-${n}`)]));function ye(n){Object.values(N).forEach(i=>i.classList.remove("selected")),N[n].classList.add("selected"),Z(n)}_.forEach(n=>{N[n].addEventListener("click",()=>ye(n))});const pe=document.querySelectorAll(".piano-key");window.addEventListener("mousedown",()=>{$=!0}),window.addEventListener("mouseup",()=>{$=!1,u.forEach(n=>{const i=document.querySelector(`[data-note-index="${n}"]`);i&&i.classList.remove("active")}),u.clear(),K()}),pe.forEach(n=>{const i=Number(n.getAttribute("data-note-index"));n.addEventListener("mousedown",()=>{$=!0,S(i)}),n.addEventListener("mouseenter",()=>{$&&S(i)}),n.addEventListener("mouseleave",()=>{u.has(i)&&B(i)}),n.addEventListener("touchstart",y=>{y.preventDefault(),S(i)}),n.addEventListener("touchend",y=>{y.preventDefault(),B(i)})});const W={a:12,w:13,s:14,e:15,d:16,f:17,t:18,g:19,y:20,h:21,u:22,j:23,k:24,o:25,l:26,p:27,";":28,"'":29,"]":30,z:31,x:33,c:35,v:36};let F=new Set;window.addEventListener("keydown",n=>{if(F.has(n.key.toLowerCase()))return;const i=W[n.key.toLowerCase()];i!==void 0&&(n.preventDefault(),F.add(n.key.toLowerCase()),S(i))}),window.addEventListener("keyup",n=>{const i=W[n.key.toLowerCase()];i!==void 0&&(n.preventDefault(),F.delete(n.key.toLowerCase()),B(i))}),["odeToJoy","twinkleStar","jazzRiff","ascendingScale","babyShark","imperialMarch"].forEach(n=>{document.getElementById(`melody-${G[n]}`).addEventListener("click",()=>ve(n))}),document.getElementById("stop-melody-btn").addEventListener("click",ne),document.getElementById("create-instrument-btn").addEventListener("click",()=>{const n=prompt("Enter a name for your custom instrument:");n&&n.trim()&&Ie(n.trim())}),be(),c.forEach((n,i)=>{H(n,i)}),Z("guitar"),(Q=document.getElementById("preset-guitar"))==null||Q.classList.add("selected")}Le();
