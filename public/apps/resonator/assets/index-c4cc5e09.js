(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))e(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const s of o.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&e(s)}).observe(document,{childList:!0,subtree:!0});function a(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(i){if(i.ep)return;i.ep=!0;const o=a(i);fetch(i.href,o)}})();document.documentElement.classList.add("theme-loading");const Ie=localStorage.getItem("decompiled-theme"),tt=window.matchMedia("(prefers-color-scheme: dark)").matches,nt=Ie?Ie==="light":!tt;nt&&document.body.classList.add("light-mode");requestAnimationFrame(()=>document.documentElement.classList.remove("theme-loading"));function O(){const t=getComputedStyle(document.body);return{bgPrimary:t.getPropertyValue("--bg-primary").trim()||"#0a0e27",bgSecondary:t.getPropertyValue("--bg-secondary").trim()||"#16213e",accent:t.getPropertyValue("--accent-primary").trim()||"#16c79a",accentLight:t.getPropertyValue("--accent-light").trim()||"#1ee7ad",accentSecondary:t.getPropertyValue("--accent-secondary").trim()||"#ff6b6b",textPrimary:t.getPropertyValue("--text-primary").trim()||"#e0e0e0",textSecondary:t.getPropertyValue("--text-secondary").trim()||"#8892b0",borderColor:t.getPropertyValue("--border-color").trim()||"#0f3460",canvasBg:t.getPropertyValue("--canvas-bg").trim()||"#0a0e27",canvasGrid:t.getPropertyValue("--canvas-grid").trim()||"#0f3460",canvasAxis:t.getPropertyValue("--canvas-axis").trim()||"#8892b0",canvasInfoBg:t.getPropertyValue("--canvas-info-bg").trim()||"rgba(22, 33, 62, 0.9)",canvasInfoText:t.getPropertyValue("--canvas-info-text").trim()||"#e0e0e0",canvasAccentGlow:t.getPropertyValue("--canvas-accent-glow").trim()||"rgba(22, 199, 154, 0.15)"}}let $=null,L=null,ae=[],C=null,w=null,F=null,q=null,E=!1,J=null,ee="sine",z=108,Xe=.3,ie=8,b="series",S=216,I=30,se=!1,R=!0,fe=!0;const ot=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],je=69;function Ze(){return fe?432:440}let N=null,G=null,te=null,ne=null,oe=null,K=null;const at=.01;function it(){return $||($=new AudioContext),$}function st(t){const n=t.sampleRate*2,a=t.createBuffer(1,n,t.sampleRate),e=a.getChannelData(0);for(let i=0;i<n;i++)e[i]=Math.random()*2-1;return a}function lt(t){if(b==="none"||se)return null;const n=t.createBiquadFilter();return b==="series"?(n.type="bandpass",n.frequency.value=S,n.Q.value=I):b==="parallel"&&(n.type="notch",n.frequency.value=S,n.Q.value=I),n}function X(){const t=it();C=t.createGain(),C.gain.value=Xe,F=t.createAnalyser(),F.fftSize=8192,q=t.createAnalyser(),q.fftSize=8192,w=lt(t);const n=t.createGain();if(n.gain.value=1,ee==="noise"){const a=t.createBufferSource();a.buffer=st(t),a.loop=!0,a.start(),a.connect(n),L=a}else{const a=t.createOscillator();if(a.type=ee,a.frequency.value=z,a.start(),a.connect(n),L=a,ae=[],ee==="sine")for(let e=1;e<=ie;e++){const i=t.createOscillator();i.type="sine",i.frequency.value=z*(e+1);const o=t.createGain();o.gain.value=1/(e+1),i.connect(o),o.connect(n),i.start(),ae.push(i)}}w?(n.connect(C),C.connect(F),F.connect(w),w.connect(q),q.connect(t.destination)):(n.connect(C),C.connect(F),F.connect(q),q.connect(t.destination)),E=!0,Ke(),ct()}function j(){J&&(cancelAnimationFrame(J),J=null),L&&(L.stop(),L.disconnect(),L=null),ae.forEach(t=>{t.stop(),t.disconnect()}),ae=[],C&&(C.disconnect(),C=null),w&&(w.disconnect(),w=null),F&&(F.disconnect(),F=null),q&&(q.disconnect(),q=null),E=!1,Ke(),Ue()}function rt(){E?j():X()}function ct(){if(!F||!q||!N||!G||!$)return;const t=F.frequencyBinCount,n=new Uint8Array(t),a=new Uint8Array(t);function e(){if(!F||!q||!N||!G||!$)return;J=requestAnimationFrame(e),F.getByteTimeDomainData(n),q.getByteTimeDomainData(a);const i=$.sampleRate/z,s=Math.floor(i*4),l=ut(n,t,i),r=O();Ce(N,n,l,s,r.accentSecondary),Ce(G,a,l,s,r.accent)}e()}function ut(t,n,a){const o=Math.min(Math.floor(a*2),n/4);for(let s=2;s<o;s++)if(t[s-2]<128-3&&t[s-1]<128&&t[s]>=128){const l=s+Math.floor(a);if(l<n-5){for(let r=l-3;r<=l+3;r++)if(r>1&&r<n-1&&t[r-1]<128&&t[r]>=128)return s}if(s<a)return s}for(let s=1;s<o;s++)if(t[s-1]<128&&t[s]>=128)return s;return 0}function Ce(t,n,a,e,i){const o=t.canvas,s=o.width,l=o.height,r=n.length,c=O();t.fillStyle=c.canvasBg,t.fillRect(0,0,s,l);const f=Math.min(e,r-a);if(f<=0){t.strokeStyle=c.canvasGrid,t.lineWidth=1,t.beginPath(),t.moveTo(0,l/2),t.lineTo(s,l/2),t.stroke();return}t.lineWidth=2,t.strokeStyle=i,t.beginPath();const m=s/f;let T=0;for(let u=0;u<f;u++){const p=a+u,B=n[p]/128*l/2;u===0?t.moveTo(T,B):t.lineTo(T,B),T+=m}if(t.stroke(),$){const u=$.sampleRate/z;t.strokeStyle=c.canvasAccentGlow,t.lineWidth=1;for(let p=1;p<4;p++){const k=p*u/f*s;k<s&&(t.beginPath(),t.moveTo(k,0),t.lineTo(k,l),t.stroke())}}}function Ue(){le(N),le(G)}function le(t){if(!t)return;const n=t.canvas,a=O();t.fillStyle=a.canvasBg,t.fillRect(0,0,n.width,n.height),t.strokeStyle=a.canvasGrid,t.lineWidth=1,t.beginPath(),t.moveTo(0,n.height/2),t.lineTo(n.width,n.height/2),t.stroke()}function dt(){const t=at,n=2*Math.PI*S,a=1/(4*Math.PI*Math.PI*S*S*t);let e;return b==="series"?e=n*t/I:e=I*n*t,{R:e,L:t,C:a}}function ue(t,n){return n==="Ω"?t>=1e6?`${(t/1e6).toFixed(2)} MΩ`:t>=1e3?`${(t/1e3).toFixed(2)} kΩ`:t>=1?`${t.toFixed(2)} Ω`:`${(t*1e3).toFixed(2)} mΩ`:n==="H"?t>=1?`${t.toFixed(3)} H`:t>=.001?`${(t*1e3).toFixed(2)} mH`:`${(t*1e6).toFixed(2)} µH`:n==="F"?t>=1e-6?`${(t*1e6).toFixed(2)} µF`:t>=1e-9?`${(t*1e9).toFixed(2)} nF`:`${(t*1e12).toFixed(2)} pF`:t.toExponential(2)}function Z(){if(!te)return;const t=te.canvas,n=t.width,a=t.height,e=te,i=O();if(e.fillStyle=i.canvasBg,e.fillRect(0,0,n,a),b==="none"){e.fillStyle=i.textSecondary,e.font="11px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type",n/2,a/2);return}e.strokeStyle=i.accent,e.lineWidth=1.5,e.fillStyle=i.textSecondary,e.font="9px -apple-system, sans-serif",e.textAlign="center";const o=a/2,s=20,l=n-20,r=40;if(b==="series"){const c=(l-s-3*r)/4;e.beginPath(),e.moveTo(s,o),e.lineTo(s+c,o),e.stroke(),e.fillText("IN",s,o-10);const f=s+c;ft(e,f,o,r),e.fillText("R",f+r/2,o-12),e.beginPath(),e.moveTo(f+r,o),e.lineTo(f+r+c,o),e.stroke();const m=f+r+c;pt(e,m,o,r),e.fillText("L",m+r/2,o-12),e.beginPath(),e.moveTo(m+r,o),e.lineTo(m+r+c,o),e.stroke();const T=m+r+c;ht(e,T,o,r),e.fillText("C",T+r/2,o-12),e.beginPath(),e.moveTo(T+r,o),e.lineTo(l,o),e.stroke(),e.fillText("OUT",l,o-10),e.beginPath(),e.moveTo(l,o),e.lineTo(l,o+15),e.stroke(),we(e,l,o+15)}else{const c=n/2-50,f=n/2+50;e.beginPath(),e.moveTo(s,o),e.lineTo(c,o),e.stroke(),e.fillText("IN",s,o-10),e.beginPath(),e.moveTo(c,o),e.lineTo(c,o-25),e.lineTo(f,o-25),e.lineTo(f,o),e.stroke(),e.beginPath(),e.moveTo(c,o),e.lineTo(c,o+25),e.lineTo(f,o+25),e.lineTo(f,o),e.stroke();const m=c+20;e.beginPath(),e.moveTo(m,o-25),e.lineTo(m,o-15),e.stroke(),mt(e,m,o-15,30),e.beginPath(),e.moveTo(m,o+15),e.lineTo(m,o+25),e.stroke(),e.fillText("R",m,a-5);const T=n/2;e.beginPath(),e.moveTo(T,o-25),e.lineTo(T,o-15),e.stroke(),gt(e,T,o-15,30),e.beginPath(),e.moveTo(T,o+15),e.lineTo(T,o+25),e.stroke(),e.fillText("L",T,10);const u=f-20;e.beginPath(),e.moveTo(u,o-25),e.lineTo(u,o-5),e.stroke(),vt(e,u,o-5),e.beginPath(),e.moveTo(u,o+5),e.lineTo(u,o+25),e.stroke(),e.fillText("C",u,a-5),e.beginPath(),e.moveTo(f,o),e.lineTo(l,o),e.stroke(),e.fillText("OUT",l,o-10),e.beginPath(),e.moveTo(l,o),e.lineTo(l,o+15),e.stroke(),we(e,l,o+15)}}function ft(t,n,a,e){const s=e/6;t.beginPath(),t.moveTo(n,a);for(let l=0;l<6;l++){const r=n+l*s;l%2===0?(t.lineTo(r+s/2,a-8),t.lineTo(r+s,a)):(t.lineTo(r+s/2,a+8),t.lineTo(r+s,a))}t.stroke()}function mt(t,n,a,e){const s=e/6;t.beginPath(),t.moveTo(n,a);for(let l=0;l<6;l++){const r=a+l*s;l%2===0?(t.lineTo(n-8,r+s/2),t.lineTo(n,r+s)):(t.lineTo(n+8,r+s/2),t.lineTo(n,r+s))}t.stroke()}function pt(t,n,a,e){const o=e/4;t.beginPath(),t.moveTo(n,a);for(let s=0;s<4;s++){const l=n+s*o+o/2;t.arc(l,a,o/2,Math.PI,0,!1)}t.stroke()}function gt(t,n,a,e){const o=e/4;t.beginPath(),t.moveTo(n,a);for(let s=0;s<4;s++){const l=a+s*o+o/2;t.arc(n,l,o/2,-Math.PI/2,Math.PI/2,!1)}t.stroke()}function ht(t,n,a,e){t.beginPath(),t.moveTo(n,a),t.lineTo(n+e/2-8/2,a),t.stroke(),t.beginPath(),t.moveTo(n+e/2-8/2,a-20/2),t.lineTo(n+e/2-8/2,a+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,a-20/2),t.lineTo(n+e/2+8/2,a+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,a),t.lineTo(n+e,a),t.stroke()}function vt(t,n,a,e){t.beginPath(),t.moveTo(n-20/2,a),t.lineTo(n+20/2,a),t.stroke(),t.beginPath(),t.moveTo(n-20/2,a+8),t.lineTo(n+20/2,a+8),t.stroke()}function we(t,n,a){t.beginPath(),t.moveTo(n-15,a),t.lineTo(n+15,a),t.stroke(),t.beginPath(),t.moveTo(n-10,a+5),t.lineTo(n+10,a+5),t.stroke(),t.beginPath(),t.moveTo(n-5,a+10),t.lineTo(n+5,a+10),t.stroke()}function U(){if(!ne)return;const t=ne.canvas,n=t.width,a=t.height,e=ne,i=O();if(e.fillStyle=i.canvasBg,e.fillRect(0,0,n,a),b==="none"){e.fillStyle=i.textSecondary,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view pole-zero plot",n/2,a/2);return}const o=2*Math.PI*S,s=1/(2*I),l=-s*o,r=o*Math.sqrt(Math.abs(1-s*s)),c=s<1,f=Math.abs(s-1)<.001,m=Math.abs(l)*2.5,T=c?r*1.5:m,u=n*.6,p=a/2,k=n*.35/m,B=a*.4/T;e.strokeStyle=i.canvasGrid,e.lineWidth=1;for(let v=-5;v<=2;v++){const P=u+v*m*k/5;e.beginPath(),e.moveTo(P,0),e.lineTo(P,a),e.stroke()}for(let v=-4;v<=4;v++){const P=p-v*T*B/4;e.beginPath(),e.moveTo(0,P),e.lineTo(n,P),e.stroke()}if(e.strokeStyle=i.canvasAxis,e.lineWidth=2,e.beginPath(),e.moveTo(0,p),e.lineTo(n,p),e.stroke(),e.beginPath(),e.moveTo(u,0),e.lineTo(u,a),e.stroke(),e.fillStyle=i.canvasAxis,e.beginPath(),e.moveTo(n-10,p-5),e.lineTo(n,p),e.lineTo(n-10,p+5),e.fill(),e.beginPath(),e.moveTo(u-5,10),e.lineTo(u,0),e.lineTo(u+5,10),e.fill(),e.font="12px -apple-system, sans-serif",e.textAlign="center",e.fillStyle=i.canvasAxis,e.fillText("σ (Real)",n-30,p-10),e.fillText("jω (Imag)",u+35,15),e.strokeStyle=i.canvasGrid,e.lineWidth=1,e.setLineDash([5,5]),e.beginPath(),e.moveTo(u,0),e.lineTo(u,a),e.stroke(),e.setLineDash([]),e.fillStyle=i.accentSecondary,e.strokeStyle=i.accentSecondary,e.lineWidth=3,c){const v=u+l*k,P=p-r*B,M=p+r*B;Q(e,v,P),Q(e,v,M),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(l/1e3).toFixed(1)}k + j${(r/1e3).toFixed(1)}k`,v+15,P-5),e.fillText(`p₂ = ${(l/1e3).toFixed(1)}k - j${(r/1e3).toFixed(1)}k`,v+15,M+15)}else if(f){const v=u+l*k;Q(e,v,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁,₂ = ${(l/1e3).toFixed(1)}k (double)`,v+15,p-10)}else{const v=l+o*Math.sqrt(s*s-1),P=l-o*Math.sqrt(s*s-1),M=u+v*k,V=u+P*k;Q(e,M,p),Q(e,V,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(v/1e3).toFixed(1)}k`,M+15,p-10),e.fillText(`p₂ = ${(P/1e3).toFixed(1)}k`,V+15,p+20)}if(e.fillStyle=i.accent,e.strokeStyle=i.accent,e.lineWidth=3,b==="series")de(e,u,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText("z = 0",u+15,p+25);else if(b==="parallel"){const v=p-o*B,P=p+o*B;de(e,u,v),de(e,u,P),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`z₁ = +j${(o/1e3).toFixed(1)}k`,u+15,v-5),e.fillText(`z₂ = -j${(o/1e3).toFixed(1)}k`,u+15,P+15)}e.fillStyle=i.canvasInfoBg,e.fillRect(10,10,220,100),e.strokeStyle=i.canvasGrid,e.lineWidth=1,e.strokeRect(10,10,220,100),e.fillStyle=i.canvasInfoText,e.font="11px Courier New, monospace",e.textAlign="left";const A=c?"Underdamped":f?"Critically Damped":"Overdamped";e.fillText(`ω₀ = ${(o/1e3).toFixed(2)}k rad/s`,20,30),e.fillText(`ζ = ${s.toFixed(4)} (${A})`,20,50),e.fillText(`Q = ${I.toFixed(2)}`,20,70),e.fillText(`f₀ = ${S} Hz`,20,90),e.fillStyle=i.canvasInfoBg,e.fillRect(n-120,10,110,60),e.strokeStyle=i.canvasGrid,e.strokeRect(n-120,10,110,60),e.font="11px -apple-system, sans-serif",e.fillStyle=i.accentSecondary,e.fillText("✕ Poles",n-110,30),e.fillStyle=i.accent,e.fillText("○ Zeros",n-110,50)}function Q(t,n,a){t.beginPath(),t.moveTo(n-8,a-8),t.lineTo(n+8,a+8),t.stroke(),t.beginPath(),t.moveTo(n+8,a-8),t.lineTo(n-8,a+8),t.stroke()}function de(t,n,a){t.beginPath(),t.arc(n,a,8,0,2*Math.PI),t.stroke()}function me(){K!==null&&clearTimeout(K),K=window.setTimeout(()=>{pe(),K=null},150)}function pe(){if(!oe)return;const t=oe.canvas,n=t.width,a=t.height,e=oe,i=O();if(e.fillStyle=i.canvasBg,e.fillRect(0,0,n,a),b==="none"){e.fillStyle=i.textSecondary,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view 3D transfer function",n/2,a/2);return}const o=2*Math.PI*S,s=1/(2*I),l=-s*o,r=o*Math.sqrt(Math.abs(1-s*s)),c=60,f=Math.abs(l)*4,m=o*2,T=.7,u=-.3,p=.8,k=n*.5,B=a*.6,A=[],v=[],P=[];for(let d=0;d<=c;d++){const y=-f+d/c*f*1.2;v.push(y)}for(let d=0;d<=c;d++){const y=-m+d/c*m*2;P.push(y)}for(let d=0;d<=c;d++){A[d]=[];for(let y=0;y<=c;y++){const g=v[d],h=P[y];let x;if(b==="series"){const W=Math.sqrt(Math.pow(2*s*o*g,2)+Math.pow(2*s*o*h,2)),D=Math.sqrt(Math.pow(g-l,2)+Math.pow(h-r,2)),H=Math.sqrt(Math.pow(g-l,2)+Math.pow(h+r,2));x=W/(D*H+.001)}else{const W=Math.sqrt(Math.pow(g,2)+Math.pow(h-o,2)),D=Math.sqrt(Math.pow(g,2)+Math.pow(h+o,2)),H=W*D,ce=Math.sqrt(Math.pow(g-l,2)+Math.pow(h-r,2)),_=Math.sqrt(Math.pow(g-l,2)+Math.pow(h+r,2));x=H/(ce*_+.001)}x=Math.min(x,50),A[d][y]=Math.log10(x+1)*30}}function M(d,y,g){const h=(d/c-.5)*2,x=(y/c-.5)*2,W=g/50,D=Math.cos(u),H=Math.sin(u),ce=h*D-x*H,_=h*H+x*D,Me=Math.cos(T),xe=Math.sin(T),et=_*Me-W*xe,Fe=_*xe+W*Me,ke=3,qe=ke/(ke+Fe);return{x:k+ce*qe*n*p*.4,y:B-et*qe*a*p*.4,depth:Fe}}e.lineWidth=.5;const V=i.accent,ye=parseInt(V.slice(1,3),16),Te=parseInt(V.slice(3,5),16),be=parseInt(V.slice(5,7),16);for(let d=0;d<=c;d+=2){e.beginPath();let y=!0;for(let g=0;g<=c;g++){const h=M(g,d,A[g][d]);y?(e.moveTo(h.x,h.y),y=!1):e.lineTo(h.x,h.y)}e.strokeStyle=`rgba(${ye}, ${Te}, ${be}, ${.3+d/c*.4})`,e.stroke()}for(let d=0;d<=c;d+=2){e.beginPath();let y=!0;for(let g=0;g<=c;g++){const h=M(d,g,A[d][g]);y?(e.moveTo(h.x,h.y),y=!1):e.lineTo(h.x,h.y)}e.strokeStyle=`rgba(${ye}, ${Te}, ${be}, ${.3+d/c*.4})`,e.stroke()}if(e.fillStyle=i.accentSecondary,e.strokeStyle=i.accentSecondary,e.lineWidth=2,s<1){const d=(l+f)/(f*1.2)*c,y=(r+m)/(m*2)*c,g=(-r+m)/(m*2)*c,h=M(d,y,80),x=M(d,g,80);e.beginPath(),e.arc(h.x,h.y,6,0,2*Math.PI),e.fill(),e.beginPath(),e.arc(x.x,x.y,6,0,2*Math.PI),e.fill()}if(b==="series"){const d=f/(f*1.2)*c,y=m/(m*2)*c,g=M(d,y,0);e.strokeStyle=i.accent,e.lineWidth=3,e.beginPath(),e.arc(g.x,g.y,8,0,2*Math.PI),e.stroke()}else if(b==="parallel"){const d=f/(f*1.2)*c,y=(o+m)/(m*2)*c,g=(-o+m)/(m*2)*c,h=M(d,y,0),x=M(d,g,0);e.strokeStyle=i.accent,e.lineWidth=3,e.beginPath(),e.arc(h.x,h.y,8,0,2*Math.PI),e.stroke(),e.beginPath(),e.arc(x.x,x.y,8,0,2*Math.PI),e.stroke()}e.fillStyle=i.canvasAxis,e.font="12px -apple-system, sans-serif",e.textAlign="center";const Se=M(c,c/2,0);e.fillText("σ (Real)",Se.x+30,Se.y);const Pe=M(c/2,c,0);e.fillText("jω (Imag)",Pe.x,Pe.y-10),e.fillText("|H(s)|",n-50,30),e.fillStyle=i.canvasInfoBg,e.fillRect(10,10,180,50),e.strokeStyle=i.canvasGrid,e.lineWidth=1,e.strokeRect(10,10,180,50),e.fillStyle=i.canvasInfoText,e.font="11px -apple-system, sans-serif",e.textAlign="left",e.fillText("3D Transfer Function Surface",20,30),e.fillStyle=i.textSecondary,e.fillText("Peaks at poles, valleys at zeros",20,48)}function yt(t){const e=Math.log10(20),i=Math.log10(2e3),o=e+t/100*(i-e);return Math.round(Math.pow(10,o))}function Tt(t){const e=Math.log10(20),i=Math.log10(2e3);return(Math.log10(t)-e)/(i-e)*100}function bt(t){const e=Math.log10(20),i=Math.log10(1e4),o=e+t/100*(i-e);return Math.round(Math.pow(10,o))}function St(t){const e=Math.log10(20),i=Math.log10(1e4);return(Math.log10(t)-e)/(i-e)*100}function Pt(t){const e=Math.log10(.1),i=Math.log10(100),o=e+t/100*(i-e);return Math.pow(10,o)}function Mt(t){const e=Math.log10(.1),i=Math.log10(100);return(Math.log10(t)-e)/(i-e)*100}function Ye(t){return 12*Math.log2(t/Ze())+je}function xt(t){return Ze()*Math.pow(2,(t-je)/12)}function _e(t){const n=Math.round(Ye(t));return xt(n)}function ge(t){const n=Math.round(Ye(t)),a=(n%12+12)%12,e=Math.floor(n/12)-1;return`${ot[a]}${e}`}function Ft(t){var a;ee=t;const n=(a=document.getElementById("overtones"))==null?void 0:a.parentElement;n&&(n.style.display=t==="sine"?"block":"none"),E&&(j(),X())}function he(t){R&&(t=_e(t)),z=t,L&&"frequency"in L&&(L.frequency.value=t);const n=R?`${Math.round(t)} Hz (${ge(t)})`:`${t} Hz`;document.getElementById("freqValue").textContent=n}function kt(t){Xe=t,C&&(C.gain.value=t),document.getElementById("ampValue").textContent=t.toFixed(2)}function qt(t){ie=t,document.getElementById("overtonesValue").textContent=t.toString(),E&&(j(),X())}function It(t){b=t,E&&(j(),X()),re(),Z(),Y(),U(),me()}function Ct(){se=!se,wt(),E&&(j(),X())}function wt(){const t=document.getElementById("bypassBtn");t&&(se?(t.textContent="Enable Filter",t.classList.add("bypassed")):(t.textContent="Bypass",t.classList.remove("bypassed")))}function ve(t){R&&(t=_e(t)),S=t,w&&(w.frequency.value=t),re(),Z(),Y(),U(),me()}function Bt(t){I=t,w&&(w.Q.value=t),re(),Z(),Y(),U(),me()}function re(){const t=document.getElementById("circuitInfo");if(b==="none")t.textContent="No filter applied - direct signal path";else{const n=b==="series"?"Bandpass (passes resonant frequency)":"Notch (blocks resonant frequency)";t.innerHTML=`
      <strong>${b==="series"?"Series":"Parallel"} RLC Circuit</strong><br>
      ${n}
    `}}function Y(){const t=document.querySelector(".formula-content");if(b==="none"){t.innerHTML="Select a circuit type to see formulas";return}if(document.getElementById("resFrequency")){Be();return}t.innerHTML=`
    <div class="formula-grid">
      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resonant Frequency</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">f₀</span> <span class="formula-equals">=</span> 1 / (2π√LC)</div>
        <div class="formula-result" id="resFreqResult">${R?`${Math.round(S)} Hz (${ge(S)})`:`${S} Hz`}</div>
        <input type="range" class="formula-slider" id="resFrequency" min="0" max="100" value="${St(S)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Q Factor</div>
        </div>
        <div class="formula-equation" id="qEquation"><span class="formula-symbol">Q</span> <span class="formula-equals">=</span> ${b==="series"?"ω₀L / R":"R / (ω₀L)"}</div>
        <div class="formula-result" id="qFactorResult">${I.toFixed(2)}</div>
        <input type="range" class="formula-slider" id="qFactor" min="0" max="100" value="${Mt(I)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Inductance (fixed)</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">L</span> <span class="formula-equals">=</span> reference</div>
        <div class="formula-result" id="inductanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Capacitance</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">C</span> <span class="formula-equals">=</span> 1 / (4π²f₀²L)</div>
        <div class="formula-result" id="capacitanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resistance</div>
        </div>
        <div class="formula-equation" id="resistanceEquation"></div>
        <div class="formula-result" id="resistanceResult"></div>
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Bandwidth</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">BW</span> <span class="formula-equals">=</span> f₀ / Q</div>
        <div class="formula-result" id="bandwidthResult"></div>
      </div>
    </div>
  `,Et(),Be()}function Be(){const{R:t,L:n,C:a}=dt(),e=S/I,i=document.getElementById("resFreqResult"),o=document.getElementById("qFactorResult"),s=document.getElementById("inductanceResult"),l=document.getElementById("capacitanceResult"),r=document.getElementById("resistanceResult"),c=document.getElementById("resistanceEquation"),f=document.getElementById("bandwidthResult");i&&(i.textContent=R?`${Math.round(S)} Hz (${ge(S)})`:`${S} Hz`),o&&(o.textContent=I.toFixed(2)),s&&(s.textContent=ue(n,"H")),l&&(l.textContent=ue(a,"F")),r&&(r.textContent=ue(t,"Ω")),c&&(c.innerHTML=b==="series"?"Q = ω₀L / R":"Q = R / (ω₀L)"),f&&(f.textContent=`${e.toFixed(2)} Hz`)}function Et(){const t=document.getElementById("resFrequency"),n=document.getElementById("qFactor");t==null||t.addEventListener("input",a=>{const e=a.target,i=bt(parseFloat(e.value));ve(i)}),n==null||n.addEventListener("input",a=>{const e=a.target,i=Pt(parseFloat(e.value));Bt(i)})}function Ke(){const t=document.getElementById("startBtn");t&&(t.textContent=E?"Stop Signal":"Start Signal",E?t.classList.add("playing"):t.classList.remove("playing"))}document.querySelector("#app").innerHTML=`
  <div class="container">
    <header class="app-header">
      <h1>Resonator Circuit Explorer</h1>
      <p>Explore Series and Parallel RLC resonator circuits with real-time audio and visualization</p>
      <div class="auto-mode-toggle">
        <label>
          <input type="checkbox" id="autoMusicalMode" ${R?"checked":""}>
          Auto ♪ (snap to musical notes)
        </label>
        <label>
          <input type="checkbox" id="useA432Tuning" ${fe?"checked":""}>
          A4 = 432 Hz
        </label>
      </div>
    </header>

    <div class="panels">
      <section class="controls">
        <h2>Input Signal</h2>

        <div class="control-group">
          <label>Signal Type:</label>
          <select id="signalType">
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
            <option value="noise">White Noise</option>
          </select>
        </div>

        <div class="control-group">
          <label>Frequency: <span id="freqValue">${z} Hz</span></label>
          <input type="range" id="frequency" min="0" max="100" value="${Tt(z)}" step="0.1">
        </div>

        <div class="control-group">
          <label>Amplitude: <span id="ampValue">0.30</span></label>
          <input type="range" id="amplitude" min="0" max="1" value="0.3" step="0.01">
        </div>

        <div class="control-group">
          <label>Overtones: <span id="overtonesValue">${ie}</span></label>
          <input type="range" id="overtones" min="0" max="16" value="${ie}" step="1">
        </div>

        <button id="startBtn" type="button">Start Signal</button>
      </section>

      <section class="controls">
        <h2>Circuit Type</h2>

        <div class="control-group">
          <label>Resonator Configuration:</label>
          <select id="circuitType">
            <option value="series" selected>Series RLC (Bandpass)</option>
            <option value="parallel">Parallel RLC (Notch)</option>
          </select>
        </div>

        <button id="bypassBtn" type="button">Bypass</button>

        <canvas id="circuitDiagramCanvas" width="400" height="80"></canvas>

        <div id="circuitInfo" class="circuit-info">
          No filter applied - direct signal path
        </div>
      </section>
    </div>

    <section class="formula-section">
      <h2>Component Calculations</h2>
      <div id="formulaBox" class="formula-box-wide">
        <div class="formula-content">Select a circuit type to see formulas</div>
      </div>
    </section>

    <section class="visualization">
      <h2>Input Waveform</h2>
      <canvas id="inputWaveformCanvas" width="800" height="150"></canvas>
    </section>

    <section class="visualization">
      <h2>Output Waveform</h2>
      <canvas id="outputWaveformCanvas" width="800" height="150"></canvas>
    </section>

    <section class="visualization">
      <h2>Pole-Zero Plot (s-plane)</h2>
      <canvas id="poleZeroCanvas" width="800" height="300"></canvas>
    </section>

    <section class="visualization">
      <h2>Transfer Function Magnitude |H(s)|</h2>
      <canvas id="sPlane3DCanvas" width="800" height="400"></canvas>
    </section>
  </div>
`;const Ee=document.getElementById("inputWaveformCanvas"),ze=document.getElementById("outputWaveformCanvas"),Le=document.getElementById("circuitDiagramCanvas"),Re=document.getElementById("poleZeroCanvas");Ee&&(N=Ee.getContext("2d"),le(N));ze&&(G=ze.getContext("2d"),le(G));Le&&(te=Le.getContext("2d"),Z());Re&&(ne=Re.getContext("2d"),U());const $e=document.getElementById("sPlane3DCanvas");$e&&(oe=$e.getContext("2d"),pe());re();Y();var Ae;(Ae=document.getElementById("startBtn"))==null||Ae.addEventListener("click",rt);var Ve;(Ve=document.getElementById("signalType"))==null||Ve.addEventListener("change",t=>{const n=t.target;Ft(n.value)});var We;(We=document.getElementById("frequency"))==null||We.addEventListener("input",t=>{const n=t.target,a=yt(parseFloat(n.value));he(a)});var De;(De=document.getElementById("amplitude"))==null||De.addEventListener("input",t=>{const n=t.target;kt(parseFloat(n.value))});var He;(He=document.getElementById("overtones"))==null||He.addEventListener("input",t=>{const n=t.target;qt(parseInt(n.value))});var Ne;(Ne=document.getElementById("circuitType"))==null||Ne.addEventListener("change",t=>{const n=t.target;It(n.value)});var Ge;(Ge=document.getElementById("bypassBtn"))==null||Ge.addEventListener("click",Ct);var Oe;(Oe=document.getElementById("autoMusicalMode"))==null||Oe.addEventListener("change",t=>{if(R=t.target.checked,R)he(z),ve(S);else{const a=`${z} Hz`;document.getElementById("freqValue").textContent=a,Y()}});var Qe;(Qe=document.getElementById("useA432Tuning"))==null||Qe.addEventListener("change",t=>{fe=t.target.checked,R&&(he(z),ve(S))});window.addEventListener("storage",t=>{t.key==="decompiled-theme"&&(t.newValue==="light"?document.body.classList.add("light-mode"):document.body.classList.remove("light-mode"),Je())});const zt=new MutationObserver(t=>{for(const n of t)n.attributeName==="class"&&Je()});zt.observe(document.body,{attributes:!0});function Je(){requestAnimationFrame(()=>{Z(),U(),pe(),E||Ue()})}
