(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))e(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function o(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function e(a){if(a.ep)return;a.ep=!0;const s=o(a);fetch(a.href,s)}})();document.documentElement.classList.add("theme-loading");const Re=localStorage.getItem("decompiled-theme"),lt=window.matchMedia("(prefers-color-scheme: dark)").matches,Ke=Re?Re==="light":!lt;Ke&&(document.documentElement.classList.add("light-mode"),document.body.classList.add("light-mode"));requestAnimationFrame(()=>document.documentElement.classList.remove("theme-loading"));function Z(){const t=getComputedStyle(document.body);return{bgPrimary:t.getPropertyValue("--bg-primary").trim()||"#0a0e27",bgSecondary:t.getPropertyValue("--bg-secondary").trim()||"#16213e",accent:t.getPropertyValue("--accent-primary").trim()||"#16c79a",accentLight:t.getPropertyValue("--accent-light").trim()||"#1ee7ad",accentSecondary:t.getPropertyValue("--accent-secondary").trim()||"#ff6b6b",textPrimary:t.getPropertyValue("--text-primary").trim()||"#e0e0e0",textSecondary:t.getPropertyValue("--text-secondary").trim()||"#8892b0",borderColor:t.getPropertyValue("--border-color").trim()||"#0f3460",canvasBg:t.getPropertyValue("--canvas-bg").trim()||"#0a0e27",canvasGrid:t.getPropertyValue("--canvas-grid").trim()||"#0f3460",canvasAxis:t.getPropertyValue("--canvas-axis").trim()||"#8892b0",canvasInfoBg:t.getPropertyValue("--canvas-info-bg").trim()||"rgba(22, 33, 62, 0.9)",canvasInfoText:t.getPropertyValue("--canvas-info-text").trim()||"#e0e0e0",canvasAccentGlow:t.getPropertyValue("--canvas-accent-glow").trim()||"rgba(22, 199, 154, 0.15)"}}let H=null,V=null,re=[],L=null,E=null,q=null,C=null,$=!1,oe=null,se="sine",I=108,Je=.3,ce=8,b="series",M=216,F=30,de=!1,D=!0,Te=!0;const rt=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],et=69;function tt(){return Te?432:440}let X=null,j=null,ae=null,ie=null,le=null,ne=null;const ct=.01;function dt(){return H||(H=new AudioContext),H}function ut(t){const n=t.sampleRate*2,o=t.createBuffer(1,n,t.sampleRate),e=o.getChannelData(0);for(let a=0;a<n;a++)e[a]=Math.random()*2-1;return o}function mt(t){if(b==="none"||de)return null;const n=t.createBiquadFilter();return b==="series"?(n.type="bandpass",n.frequency.value=M,n.Q.value=F):b==="parallel"&&(n.type="notch",n.frequency.value=M,n.Q.value=F),n}function Y(){const t=dt();L=t.createGain(),L.gain.value=Je,q=t.createAnalyser(),q.fftSize=8192,C=t.createAnalyser(),C.fftSize=8192,E=mt(t);const n=t.createGain();if(n.gain.value=1,se==="noise"){const o=t.createBufferSource();o.buffer=ut(t),o.loop=!0,o.start(),o.connect(n),V=o}else{const o=t.createOscillator();if(o.type=se,o.frequency.value=I,o.start(),o.connect(n),V=o,re=[],se==="sine")for(let e=1;e<=ce;e++){const a=t.createOscillator();a.type="sine",a.frequency.value=I*(e+1);const s=t.createGain();s.gain.value=1/(e+1),a.connect(s),s.connect(n),a.start(),re.push(a)}}E?(n.connect(L),L.connect(q),q.connect(E),E.connect(C),C.connect(t.destination)):(n.connect(L),L.connect(q),q.connect(C),C.connect(t.destination)),$=!0,at(),pt()}function _(){oe&&(cancelAnimationFrame(oe),oe=null),V&&(V.stop(),V.disconnect(),V=null),re.forEach(t=>{t.stop(),t.disconnect()}),re=[],L&&(L.disconnect(),L=null),E&&(E.disconnect(),E=null),q&&(q.disconnect(),q=null),C&&(C.disconnect(),C=null),$=!1,at(),nt()}function ft(){$?_():Y()}function pt(){if(!q||!C||!X||!j||!H)return;const t=q.frequencyBinCount,n=new Uint8Array(t),o=new Uint8Array(t);function e(){if(!q||!C||!X||!j||!H)return;oe=requestAnimationFrame(e),q.getByteTimeDomainData(n),C.getByteTimeDomainData(o);const a=H.sampleRate/I,i=Math.floor(a*4),l=ht(n,t,a),r=Z();ze(X,n,l,i,r.accentSecondary),ze(j,o,l,i,r.accent)}e()}function ht(t,n,o){const s=Math.min(Math.floor(o*2),n/4);for(let i=2;i<s;i++)if(t[i-2]<128-3&&t[i-1]<128&&t[i]>=128){const l=i+Math.floor(o);if(l<n-5){for(let r=l-3;r<=l+3;r++)if(r>1&&r<n-1&&t[r-1]<128&&t[r]>=128)return i}if(i<o)return i}for(let i=1;i<s;i++)if(t[i-1]<128&&t[i]>=128)return i;return 0}function ze(t,n,o,e,a){const s=t.canvas,i=s.width,l=s.height,r=n.length,c=Z();t.fillStyle=c.canvasBg,t.fillRect(0,0,i,l);const m=Math.min(e,r-o);if(m<=0){t.strokeStyle=c.canvasGrid,t.lineWidth=1,t.beginPath(),t.moveTo(0,l/2),t.lineTo(i,l/2),t.stroke();return}t.lineWidth=2,t.strokeStyle=a,t.beginPath();const f=i/m;let S=0;for(let u=0;u<m;u++){const g=o+u,B=n[g]/128*l/2;u===0?t.moveTo(S,B):t.lineTo(S,B),S+=f}if(t.stroke(),H){const u=H.sampleRate/I;t.strokeStyle=c.canvasAccentGlow,t.lineWidth=1;for(let g=1;g<4;g++){const w=g*u/m*i;w<i&&(t.beginPath(),t.moveTo(w,0),t.lineTo(w,l),t.stroke())}}}function nt(){ue(X),ue(j)}function ue(t){if(!t)return;const n=t.canvas,o=Z();t.fillStyle=o.canvasBg,t.fillRect(0,0,n.width,n.height),t.strokeStyle=o.canvasGrid,t.lineWidth=1,t.beginPath(),t.moveTo(0,n.height/2),t.lineTo(n.width,n.height/2),t.stroke()}function gt(){const t=ct,n=2*Math.PI*M,o=1/(4*Math.PI*Math.PI*M*M*t);let e;return b==="series"?e=n*t/F:e=F*n*t,{R:e,L:t,C:o}}function pe(t,n){return n==="Ω"?t>=1e6?`${(t/1e6).toFixed(2)} MΩ`:t>=1e3?`${(t/1e3).toFixed(2)} kΩ`:t>=1?`${t.toFixed(2)} Ω`:`${(t*1e3).toFixed(2)} mΩ`:n==="H"?t>=1?`${t.toFixed(3)} H`:t>=.001?`${(t*1e3).toFixed(2)} mH`:`${(t*1e6).toFixed(2)} µH`:n==="F"?t>=1e-6?`${(t*1e6).toFixed(2)} µF`:t>=1e-9?`${(t*1e9).toFixed(2)} nF`:`${(t*1e12).toFixed(2)} pF`:t.toExponential(2)}function K(){if(!ae)return;const t=ae.canvas,n=t.width,o=t.height,e=ae,a=Z();if(e.fillStyle=a.canvasBg,e.fillRect(0,0,n,o),b==="none"){e.fillStyle=a.textSecondary,e.font="11px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type",n/2,o/2);return}e.strokeStyle=a.accent,e.lineWidth=1.5,e.fillStyle=a.textSecondary,e.font="9px -apple-system, sans-serif",e.textAlign="center";const s=o/2,i=20,l=n-20,r=40;if(b==="series"){const c=(l-i-3*r)/4;e.beginPath(),e.moveTo(i,s),e.lineTo(i+c,s),e.stroke(),e.fillText("IN",i,s-10);const m=i+c;vt(e,m,s,r),e.fillText("R",m+r/2,s-12),e.beginPath(),e.moveTo(m+r,s),e.lineTo(m+r+c,s),e.stroke();const f=m+r+c;Tt(e,f,s,r),e.fillText("L",f+r/2,s-12),e.beginPath(),e.moveTo(f+r,s),e.lineTo(f+r+c,s),e.stroke();const S=f+r+c;St(e,S,s,r),e.fillText("C",S+r/2,s-12),e.beginPath(),e.moveTo(S+r,s),e.lineTo(l,s),e.stroke(),e.fillText("OUT",l,s-10),e.beginPath(),e.moveTo(l,s),e.lineTo(l,s+15),e.stroke(),$e(e,l,s+15)}else{const c=n/2-50,m=n/2+50;e.beginPath(),e.moveTo(i,s),e.lineTo(c,s),e.stroke(),e.fillText("IN",i,s-10),e.beginPath(),e.moveTo(c,s),e.lineTo(c,s-25),e.lineTo(m,s-25),e.lineTo(m,s),e.stroke(),e.beginPath(),e.moveTo(c,s),e.lineTo(c,s+25),e.lineTo(m,s+25),e.lineTo(m,s),e.stroke();const f=c+20;e.beginPath(),e.moveTo(f,s-25),e.lineTo(f,s-15),e.stroke(),yt(e,f,s-15,30),e.beginPath(),e.moveTo(f,s+15),e.lineTo(f,s+25),e.stroke(),e.fillText("R",f,o-5);const S=n/2;e.beginPath(),e.moveTo(S,s-25),e.lineTo(S,s-15),e.stroke(),bt(e,S,s-15,30),e.beginPath(),e.moveTo(S,s+15),e.lineTo(S,s+25),e.stroke(),e.fillText("L",S,10);const u=m-20;e.beginPath(),e.moveTo(u,s-25),e.lineTo(u,s-5),e.stroke(),Mt(e,u,s-5),e.beginPath(),e.moveTo(u,s+5),e.lineTo(u,s+25),e.stroke(),e.fillText("C",u,o-5),e.beginPath(),e.moveTo(m,s),e.lineTo(l,s),e.stroke(),e.fillText("OUT",l,s-10),e.beginPath(),e.moveTo(l,s),e.lineTo(l,s+15),e.stroke(),$e(e,l,s+15)}}function vt(t,n,o,e){const i=e/6;t.beginPath(),t.moveTo(n,o);for(let l=0;l<6;l++){const r=n+l*i;l%2===0?(t.lineTo(r+i/2,o-8),t.lineTo(r+i,o)):(t.lineTo(r+i/2,o+8),t.lineTo(r+i,o))}t.stroke()}function yt(t,n,o,e){const i=e/6;t.beginPath(),t.moveTo(n,o);for(let l=0;l<6;l++){const r=o+l*i;l%2===0?(t.lineTo(n-8,r+i/2),t.lineTo(n,r+i)):(t.lineTo(n+8,r+i/2),t.lineTo(n,r+i))}t.stroke()}function Tt(t,n,o,e){const s=e/4;t.beginPath(),t.moveTo(n,o);for(let i=0;i<4;i++){const l=n+i*s+s/2;t.arc(l,o,s/2,Math.PI,0,!1)}t.stroke()}function bt(t,n,o,e){const s=e/4;t.beginPath(),t.moveTo(n,o);for(let i=0;i<4;i++){const l=o+i*s+s/2;t.arc(n,l,s/2,-Math.PI/2,Math.PI/2,!1)}t.stroke()}function St(t,n,o,e){t.beginPath(),t.moveTo(n,o),t.lineTo(n+e/2-8/2,o),t.stroke(),t.beginPath(),t.moveTo(n+e/2-8/2,o-20/2),t.lineTo(n+e/2-8/2,o+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,o-20/2),t.lineTo(n+e/2+8/2,o+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,o),t.lineTo(n+e,o),t.stroke()}function Mt(t,n,o,e){t.beginPath(),t.moveTo(n-20/2,o),t.lineTo(n+20/2,o),t.stroke(),t.beginPath(),t.moveTo(n-20/2,o+8),t.lineTo(n+20/2,o+8),t.stroke()}function $e(t,n,o){t.beginPath(),t.moveTo(n-15,o),t.lineTo(n+15,o),t.stroke(),t.beginPath(),t.moveTo(n-10,o+5),t.lineTo(n+10,o+5),t.stroke(),t.beginPath(),t.moveTo(n-5,o+10),t.lineTo(n+5,o+10),t.stroke()}function J(){if(!ie)return;const t=ie.canvas,n=t.width,o=t.height,e=ie,a=Z();if(e.fillStyle=a.canvasBg,e.fillRect(0,0,n,o),b==="none"){e.fillStyle=a.textSecondary,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view pole-zero plot",n/2,o/2);return}const s=2*Math.PI*M,i=1/(2*F),l=-i*s,r=s*Math.sqrt(Math.abs(1-i*i)),c=i<1,m=Math.abs(i-1)<.001,f=Math.abs(l)*2.5,S=c?r*1.5:f,u=n*.6,g=o/2,w=n*.35/f,B=o*.4/S;e.strokeStyle=a.canvasGrid,e.lineWidth=1;for(let v=-5;v<=2;v++){const P=u+v*f*w/5;e.beginPath(),e.moveTo(P,0),e.lineTo(P,o),e.stroke()}for(let v=-4;v<=4;v++){const P=g-v*S*B/4;e.beginPath(),e.moveTo(0,P),e.lineTo(n,P),e.stroke()}if(e.strokeStyle=a.canvasAxis,e.lineWidth=2,e.beginPath(),e.moveTo(0,g),e.lineTo(n,g),e.stroke(),e.beginPath(),e.moveTo(u,0),e.lineTo(u,o),e.stroke(),e.fillStyle=a.canvasAxis,e.beginPath(),e.moveTo(n-10,g-5),e.lineTo(n,g),e.lineTo(n-10,g+5),e.fill(),e.beginPath(),e.moveTo(u-5,10),e.lineTo(u,0),e.lineTo(u+5,10),e.fill(),e.font="12px -apple-system, sans-serif",e.textAlign="center",e.fillStyle=a.canvasAxis,e.fillText("σ (Real)",n-30,g-10),e.fillText("jω (Imag)",u+35,15),e.strokeStyle=a.canvasGrid,e.lineWidth=1,e.setLineDash([5,5]),e.beginPath(),e.moveTo(u,0),e.lineTo(u,o),e.stroke(),e.setLineDash([]),e.fillStyle=a.accentSecondary,e.strokeStyle=a.accentSecondary,e.lineWidth=3,c){const v=u+l*w,P=g-r*B,k=g+r*B;U(e,v,P),U(e,v,k),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(l/1e3).toFixed(1)}k + j${(r/1e3).toFixed(1)}k`,v+15,P-5),e.fillText(`p₂ = ${(l/1e3).toFixed(1)}k - j${(r/1e3).toFixed(1)}k`,v+15,k+15)}else if(m){const v=u+l*w;U(e,v,g),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁,₂ = ${(l/1e3).toFixed(1)}k (double)`,v+15,g-10)}else{const v=l+s*Math.sqrt(i*i-1),P=l-s*Math.sqrt(i*i-1),k=u+v*w,O=u+P*w;U(e,k,g),U(e,O,g),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(v/1e3).toFixed(1)}k`,k+15,g-10),e.fillText(`p₂ = ${(P/1e3).toFixed(1)}k`,O+15,g+20)}if(e.lineWidth=3,b==="series")e.fillStyle=a.textSecondary,e.strokeStyle=a.textSecondary,he(e,u,g),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText("z = 0",u+15,g+25);else if(b==="parallel"){e.fillStyle=a.accent,e.strokeStyle=a.accent;const v=g-s*B,P=g+s*B;he(e,u,v),he(e,u,P),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`z₁ = +j${(s/1e3).toFixed(1)}k`,u+15,v-5),e.fillText(`z₂ = -j${(s/1e3).toFixed(1)}k`,u+15,P+15)}e.fillStyle=a.canvasInfoBg,e.fillRect(10,10,220,100),e.strokeStyle=a.canvasGrid,e.lineWidth=1,e.strokeRect(10,10,220,100),e.fillStyle=a.canvasInfoText,e.font="11px Courier New, monospace",e.textAlign="left";const G=c?"Underdamped":m?"Critically Damped":"Overdamped";e.fillText(`ω₀ = ${(s/1e3).toFixed(2)}k rad/s`,20,30),e.fillText(`ζ = ${i.toFixed(4)} (${G})`,20,50),e.fillText(`Q = ${F.toFixed(2)}`,20,70),e.fillText(`f₀ = ${M} Hz`,20,90),e.fillStyle=a.canvasInfoBg,e.fillRect(n-120,10,110,60),e.strokeStyle=a.canvasGrid,e.strokeRect(n-120,10,110,60),e.font="11px -apple-system, sans-serif",e.fillStyle=a.accentSecondary,e.fillText("✕ Poles",n-110,30),e.fillStyle=a.accent,e.fillText("○ Zeros",n-110,50)}function U(t,n,o){t.beginPath(),t.moveTo(n-8,o-8),t.lineTo(n+8,o+8),t.stroke(),t.beginPath(),t.moveTo(n+8,o-8),t.lineTo(n-8,o+8),t.stroke()}function he(t,n,o){t.beginPath(),t.arc(n,o,8,0,2*Math.PI),t.stroke()}function me(){ne!==null&&clearTimeout(ne),ne=window.setTimeout(()=>{be(),ne=null},16)}function be(){if(!le)return;const t=le.canvas,n=t.width,o=t.height,e=le,a=Z();if(e.fillStyle=a.canvasBg,e.fillRect(0,0,n,o),b==="none"){e.fillStyle=a.textSecondary,e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view 3D transfer function",n/2,o/2);return}const s=2*Math.PI*M,i=1/(2*F),l=-i*s,r=s*Math.sqrt(Math.abs(1-i*i)),c=60,m=Math.abs(l)*4,f=s*2,S=.7,u=-.3,g=.8,w=n*.5,B=o*.6,G=[],v=[],P=[];for(let d=0;d<=c;d++){const y=-m+d/c*m*1.2;v.push(y)}for(let d=0;d<=c;d++){const y=-f+d/c*f*2;P.push(y)}for(let d=0;d<=c;d++){G[d]=[];for(let y=0;y<=c;y++){const p=v[d],h=P[y];let T;if(b==="series"){const W=Math.sqrt(Math.pow(2*i*s*p,2)+Math.pow(2*i*s*h,2)),R=Math.sqrt(Math.pow(p-l,2)+Math.pow(h-r,2)),z=Math.sqrt(Math.pow(p-l,2)+Math.pow(h+r,2));T=W/(R*z+.001)}else{const W=Math.sqrt(Math.pow(p,2)+Math.pow(h-s,2)),R=Math.sqrt(Math.pow(p,2)+Math.pow(h+s,2)),z=W*R,N=Math.sqrt(Math.pow(p-l,2)+Math.pow(h-r,2)),Q=Math.sqrt(Math.pow(p-l,2)+Math.pow(h+r,2));T=z/(N*Q+.001)}T=Math.min(T,50),G[d][y]=Math.log10(T+1)*30}}function k(d,y,p){const h=(d/c-.5)*2,T=(y/c-.5)*2,W=p/50,R=Math.cos(u),z=Math.sin(u),N=h*R-T*z,Q=h*z+T*R,te=Math.cos(S),Fe=Math.sin(S),it=Q*te-W*Fe,Le=Q*Fe+W*te,Ee=3,Be=Ee/(Ee+Le);return{x:w+N*Be*n*g*.4,y:B-it*Be*o*g*.4,depth:Le}}e.lineWidth=.5;const O=a.accent,xe=parseInt(O.slice(1,3),16),qe=parseInt(O.slice(3,5),16),we=parseInt(O.slice(5,7),16);for(let d=0;d<=c;d+=2){e.beginPath();let y=!0;for(let p=0;p<=c;p++){const h=k(p,d,G[p][d]);y?(e.moveTo(h.x,h.y),y=!1):e.lineTo(h.x,h.y)}e.strokeStyle=`rgba(${xe}, ${qe}, ${we}, ${.3+d/c*.4})`,e.stroke()}for(let d=0;d<=c;d+=2){e.beginPath();let y=!0;for(let p=0;p<=c;p++){const h=k(d,p,G[d][p]);y?(e.moveTo(h.x,h.y),y=!1):e.lineTo(h.x,h.y)}e.strokeStyle=`rgba(${xe}, ${qe}, ${we}, ${.3+d/c*.4})`,e.stroke()}if(e.fillStyle=a.accentSecondary,e.strokeStyle=a.accentSecondary,e.lineWidth=2,i<1){const d=(l+m)/(m*1.2)*c,y=(r+f)/(f*2)*c,p=(-r+f)/(f*2)*c,h=k(d,y,80),T=k(d,p,80);e.beginPath(),e.arc(h.x,h.y,6,0,2*Math.PI),e.fill(),e.beginPath(),e.arc(T.x,T.y,6,0,2*Math.PI),e.fill()}if(b==="series"){const d=m/(m*1.2)*c,y=f/(f*2)*c,p=k(d,y,0);e.strokeStyle=a.textSecondary,e.lineWidth=3,e.beginPath(),e.arc(p.x,p.y,8,0,2*Math.PI),e.stroke()}else if(b==="parallel"){const d=m/(m*1.2)*c,y=(s+f)/(f*2)*c,p=(-s+f)/(f*2)*c,h=k(d,y,0),T=k(d,p,0);e.strokeStyle=a.accent,e.lineWidth=3,e.beginPath(),e.arc(h.x,h.y,8,0,2*Math.PI),e.stroke(),e.beginPath(),e.arc(T.x,T.y,8,0,2*Math.PI),e.stroke()}e.fillStyle=a.canvasAxis,e.font="12px -apple-system, sans-serif",e.textAlign="center";const Ce=k(c,c/2,0);e.fillText("σ (Real)",Ce.x+30,Ce.y);const Ie=k(c/2,c,0);e.fillText("jω (Imag)",Ie.x,Ie.y-10),e.fillText("|H(s)|",n-50,30);const A=2*Math.PI*I;if(A<=f*2){let d;if(b==="series"){const R=2*i*s*A,z=Math.sqrt(Math.pow(l,2)+Math.pow(A-r,2)),N=Math.sqrt(Math.pow(l,2)+Math.pow(A+r,2));d=R/(z*N+.001)}else{const R=Math.sqrt(Math.pow(A-s,2)),z=Math.sqrt(Math.pow(A+s,2)),N=R*z,Q=Math.sqrt(Math.pow(l,2)+Math.pow(A-r,2)),te=Math.sqrt(Math.pow(l,2)+Math.pow(A+r,2));d=N/(Q*te+.001)}d=Math.min(d,50);const y=Math.log10(d+1)*30,p=m/(m*1.2)*c,h=(A+f)/(f*2)*c,T=k(p,h,y),W=k(p,h,0);e.strokeStyle=a.accent,e.lineWidth=2,e.setLineDash([4,4]),e.beginPath(),e.moveTo(W.x,W.y),e.lineTo(T.x,T.y),e.stroke(),e.setLineDash([]),e.fillStyle=a.accent,e.beginPath(),e.arc(T.x,T.y,8,0,2*Math.PI),e.fill(),e.strokeStyle=a.canvasBg,e.lineWidth=2,e.stroke(),e.fillStyle=a.accent,e.font="bold 11px -apple-system, sans-serif",e.textAlign="left",e.fillText(`Input: ${I} Hz`,T.x+12,T.y+4)}e.fillStyle=a.canvasInfoBg,e.fillRect(10,10,180,50),e.strokeStyle=a.canvasGrid,e.lineWidth=1,e.strokeRect(10,10,180,50),e.fillStyle=a.canvasInfoText,e.font="11px -apple-system, sans-serif",e.textAlign="left",e.fillText("3D Transfer Function Surface",20,30),e.fillStyle=a.textSecondary,e.fillText("Peaks at poles, valleys at zeros",20,48)}function Pt(t){const e=Math.log10(20),a=Math.log10(2e3),s=e+t/100*(a-e);return Math.round(Math.pow(10,s))}function kt(t){const e=Math.log10(20),a=Math.log10(2e3);return(Math.log10(t)-e)/(a-e)*100}function xt(t){const e=Math.log10(20),a=Math.log10(1e4),s=e+t/100*(a-e);return Math.round(Math.pow(10,s))}function qt(t){const e=Math.log10(20),a=Math.log10(1e4);return(Math.log10(t)-e)/(a-e)*100}function wt(t){const e=Math.log10(.1),a=Math.log10(100),s=e+t/100*(a-e);return Math.pow(10,s)}function Ct(t){const e=Math.log10(.1),a=Math.log10(100);return(Math.log10(t)-e)/(a-e)*100}function ot(t){return 12*Math.log2(t/tt())+et}function It(t){return tt()*Math.pow(2,(t-et)/12)}function st(t){const n=Math.round(ot(t));return It(n)}function Se(t){const n=Math.round(ot(t)),o=(n%12+12)%12,e=Math.floor(n/12)-1;return`${rt[o]}${e}`}function Ft(t){var o;se=t;const n=(o=document.getElementById("overtones"))==null?void 0:o.parentElement;n&&(n.style.display=t==="sine"?"block":"none"),$&&(_(),Y())}function Me(t){D&&(t=st(t)),I=t,V&&"frequency"in V&&(V.frequency.value=t);const n=D?`${Math.round(t)} Hz (${Se(t)})`:`${t} Hz`;document.getElementById("freqValue").textContent=n,me()}function Lt(t){Je=t,L&&(L.gain.value=t),document.getElementById("ampValue").textContent=t.toFixed(2)}function Et(t){ce=t,document.getElementById("overtonesValue").textContent=t.toString(),$&&(_(),Y())}function Bt(t){b=t,$&&(_(),Y()),fe(),K(),ee(),J(),me()}function Rt(){de=!de,zt(),$&&(_(),Y())}function zt(){const t=document.getElementById("bypassBtn");t&&(de?(t.textContent="Enable Filter",t.classList.add("bypassed")):(t.textContent="Bypass",t.classList.remove("bypassed")))}function Pe(t){D&&(t=st(t)),M=t,E&&(E.frequency.value=t),fe(),K(),ee(),J(),me()}function $t(t){F=t,E&&(E.Q.value=t),fe(),K(),ee(),J(),me()}function fe(){const t=document.getElementById("circuitInfo");if(b==="none")t.textContent="No filter applied - direct signal path";else{const n=b==="series"?"Bandpass (passes resonant frequency)":"Notch (blocks resonant frequency)";t.innerHTML=`
      <strong>${b==="series"?"Series":"Parallel"} RLC Circuit</strong><br>
      ${n}
    `}}function ee(){const t=document.querySelector(".formula-content");if(b==="none"){t.innerHTML="Select a circuit type to see formulas";return}if(document.getElementById("resFrequency")){Ae();return}t.innerHTML=`
    <div class="formula-grid">
      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resonant Frequency</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">f₀</span> <span class="formula-equals">=</span> 1 / (2π√LC)</div>
        <div class="formula-result" id="resFreqResult">${D?`${Math.round(M)} Hz (${Se(M)})`:`${M} Hz`}</div>
        <input type="range" class="formula-slider" id="resFrequency" min="0" max="100" value="${qt(M)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Q Factor</div>
        </div>
        <div class="formula-equation" id="qEquation"><span class="formula-symbol">Q</span> <span class="formula-equals">=</span> ${b==="series"?"ω₀L / R":"R / (ω₀L)"}</div>
        <div class="formula-result" id="qFactorResult">${F.toFixed(2)}</div>
        <input type="range" class="formula-slider" id="qFactor" min="0" max="100" value="${Ct(F)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Inductance</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">L</span> <span class="formula-equals">=</span> fixed</div>
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
        <div class="formula-equation" id="resistanceEquation"><span class="formula-symbol">R</span></div>
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
  `,At(),Ae()}function Ae(){const{R:t,L:n,C:o}=gt(),e=M/F,a=document.getElementById("resFreqResult"),s=document.getElementById("qFactorResult"),i=document.getElementById("inductanceResult"),l=document.getElementById("capacitanceResult"),r=document.getElementById("resistanceResult"),c=document.getElementById("resistanceEquation"),m=document.getElementById("bandwidthResult");a&&(a.textContent=D?`${Math.round(M)} Hz (${Se(M)})`:`${M} Hz`),s&&(s.textContent=F.toFixed(2)),i&&(i.textContent=pe(n,"H")),l&&(l.textContent=pe(o,"F")),r&&(r.textContent=pe(t,"Ω")),c&&(c.innerHTML=b==="series"?"Q = ω₀L / R":"Q = R / (ω₀L)"),m&&(m.textContent=`${e.toFixed(2)} Hz`)}function At(){const t=document.getElementById("resFrequency"),n=document.getElementById("qFactor");t==null||t.addEventListener("input",o=>{const e=o.target,a=xt(parseFloat(e.value));Pe(a)}),n==null||n.addEventListener("input",o=>{const e=o.target,a=wt(parseFloat(e.value));$t(a)})}function at(){const t=document.getElementById("startBtn");t&&(t.textContent=$?"Stop Signal":"Start Signal",$?t.classList.add("playing"):t.classList.remove("playing"))}document.querySelector("#app").innerHTML=`
  <div class="container">
    <header class="app-header">
      <div class="header-title">
        <h1>Resonator Circuit Explorer</h1>
        <button class="info-btn" id="info-btn" title="About RLC Circuits">i</button>
      </div>
      <p>Explore Series and Parallel RLC resonator circuits with real-time audio and visualization</p>
      <div class="auto-mode-toggle">
        <label>
          <input type="checkbox" id="autoMusicalMode" ${D?"checked":""}>
          Auto ♪ (snap to musical notes)
        </label>
        <label>
          <input type="checkbox" id="useA432Tuning" ${Te?"checked":""}>
          A4 = 432 Hz
        </label>
        <div class="theme-controls">
          <span class="theme-icon">${Ke?"☀️":"🌙"}</span>
          <button class="theme-toggle" id="theme-toggle" title="Toggle light/dark mode"></button>
        </div>
      </div>
    </header>

    <!-- Info Modal -->
    <div class="modal-overlay" id="info-modal">
      <div class="modal">
        <button class="modal-close" id="modal-close">&times;</button>
        <h2>About RLC Resonator Circuits</h2>

        <h3>What is an RLC Circuit?</h3>
        <p>An RLC circuit contains a <strong>Resistor (R)</strong>, <strong>Inductor (L)</strong>, and <strong>Capacitor (C)</strong>. These components interact to create frequency-selective behavior, making them fundamental to audio filters, radio tuners, and signal processing.</p>

        <h3>Resonant Frequency</h3>
        <p>Every RLC circuit has a <strong>resonant frequency</strong> (f₀) where the inductive and capacitive reactances cancel out:</p>
        <code>f₀ = 1 / (2π√LC)</code>
        <p>At this frequency, the circuit's response is at its peak (or minimum, depending on configuration).</p>

        <h3>Q Factor (Quality Factor)</h3>
        <p>The <strong>Q factor</strong> measures how "sharp" or selective the resonance is. Higher Q means:</p>
        <ul>
          <li>Narrower bandwidth (more selective filtering)</li>
          <li>Stronger resonance peak</li>
          <li>Longer ringing/decay time</li>
        </ul>
        <code>Q = f₀ / Bandwidth</code>

        <h3>Series vs Parallel</h3>
        <p><strong>Series RLC (Bandpass):</strong> Passes frequencies near resonance, attenuates others. Used in radio tuners to select a station.</p>
        <p><strong>Parallel RLC (Notch/Band-reject):</strong> Blocks frequencies near resonance, passes others. Used to remove unwanted interference like 60Hz hum.</p>

        <h3>Pole-Zero Analysis</h3>
        <p>The <strong>s-plane</strong> visualization shows the system's poles (×) and zeros (○). Poles in the left half-plane indicate stability. The distance from poles to the imaginary axis determines how quickly oscillations decay.</p>

        <h3>Musical Connection</h3>
        <p>RLC circuits behave like acoustic resonators. A guitar string, drum head, or vocal tract all exhibit similar resonant behavior. The "Auto ♪" mode snaps frequencies to musical notes, letting you explore how filters interact with harmonic content.</p>
      </div>
    </div>

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
          <label>Frequency: <span id="freqValue">${I} Hz</span></label>
          <input type="range" id="frequency" min="0" max="100" value="${kt(I)}" step="0.1">
        </div>

        <div class="control-group">
          <label>Amplitude: <span id="ampValue">0.30</span></label>
          <input type="range" id="amplitude" min="0" max="1" value="0.3" step="0.01">
        </div>

        <div class="control-group">
          <label>Overtones: <span id="overtonesValue">${ce}</span></label>
          <input type="range" id="overtones" min="0" max="16" value="${ce}" step="1">
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
      <h2>Transfer Function Magnitude |H(s)|</h2>
      <canvas id="sPlane3DCanvas" width="800" height="400"></canvas>
    </section>

    <section class="visualization">
      <h2>Pole-Zero Plot (s-plane)</h2>
      <canvas id="poleZeroCanvas" width="800" height="300"></canvas>
    </section>

    <section class="visualization">
      <h2>Input Waveform</h2>
      <canvas id="inputWaveformCanvas" width="800" height="150"></canvas>
    </section>

    <section class="visualization">
      <h2>Output Waveform</h2>
      <canvas id="outputWaveformCanvas" width="800" height="150"></canvas>
    </section>
  </div>
`;const We=document.getElementById("inputWaveformCanvas"),Ve=document.getElementById("outputWaveformCanvas"),De=document.getElementById("circuitDiagramCanvas"),He=document.getElementById("poleZeroCanvas");We&&(X=We.getContext("2d"),ue(X));Ve&&(j=Ve.getContext("2d"),ue(j));De&&(ae=De.getContext("2d"),K());He&&(ie=He.getContext("2d"),J());const Ne=document.getElementById("sPlane3DCanvas");Ne&&(le=Ne.getContext("2d"),be());fe();ee();var Ge;(Ge=document.getElementById("startBtn"))==null||Ge.addEventListener("click",ft);var Oe;(Oe=document.getElementById("signalType"))==null||Oe.addEventListener("change",t=>{const n=t.target;Ft(n.value)});var Qe;(Qe=document.getElementById("frequency"))==null||Qe.addEventListener("input",t=>{const n=t.target,o=Pt(parseFloat(n.value));Me(o)});var Xe;(Xe=document.getElementById("amplitude"))==null||Xe.addEventListener("input",t=>{const n=t.target;Lt(parseFloat(n.value))});var je;(je=document.getElementById("overtones"))==null||je.addEventListener("input",t=>{const n=t.target;Et(parseInt(n.value))});var Ze;(Ze=document.getElementById("circuitType"))==null||Ze.addEventListener("change",t=>{const n=t.target;Bt(n.value)});var Ue;(Ue=document.getElementById("bypassBtn"))==null||Ue.addEventListener("click",Rt);var Ye;(Ye=document.getElementById("autoMusicalMode"))==null||Ye.addEventListener("change",t=>{if(D=t.target.checked,D)Me(I),Pe(M);else{const o=`${I} Hz`;document.getElementById("freqValue").textContent=o,ee()}});var _e;(_e=document.getElementById("useA432Tuning"))==null||_e.addEventListener("change",t=>{Te=t.target.checked,D&&(Me(I),Pe(M))});const Wt="decompiled-theme";function Vt(t){const n=t==="light";document.documentElement.classList.toggle("light-mode",n),document.body.classList.toggle("light-mode",n),localStorage.setItem(Wt,t);const o=document.querySelector(".theme-icon");o&&(o.textContent=n?"☀️":"🌙"),ke()}const ge=document.getElementById("theme-toggle");ge==null||ge.addEventListener("click",()=>{const t=document.documentElement.classList.contains("light-mode");Vt(t?"dark":"light")});const ve=document.getElementById("info-btn"),x=document.getElementById("info-modal"),ye=document.getElementById("modal-close");ve==null||ve.addEventListener("click",()=>{x==null||x.classList.add("open")});ye==null||ye.addEventListener("click",()=>{x==null||x.classList.remove("open")});x==null||x.addEventListener("click",t=>{t.target===x&&x.classList.remove("open")});document.addEventListener("keydown",t=>{t.key==="Escape"&&(x!=null&&x.classList.contains("open"))&&x.classList.remove("open")});window.addEventListener("storage",t=>{if(t.key==="decompiled-theme"){const o=(t.newValue==="light"?"light":"dark")==="light";document.documentElement.classList.toggle("light-mode",o),document.body.classList.toggle("light-mode",o);const e=document.querySelector(".theme-icon");e&&(e.textContent=o?"☀️":"🌙"),ke()}});const Dt=new MutationObserver(t=>{for(const n of t)n.attributeName==="class"&&ke()});Dt.observe(document.body,{attributes:!0});function ke(){requestAnimationFrame(()=>{K(),J(),be(),$||nt()})}
