(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))e(o);new MutationObserver(o=>{for(const a of o)if(a.type==="childList")for(const s of a.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&e(s)}).observe(document,{childList:!0,subtree:!0});function i(o){const a={};return o.integrity&&(a.integrity=o.integrity),o.referrerPolicy&&(a.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?a.credentials="include":o.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function e(o){if(o.ep)return;o.ep=!0;const a=i(o);fetch(o.href,a)}})();let L=null,E=null,J=[],I=null,x=null,F=null,q=null,B=!1,Z=null,U="sine",z=108,De=.3,ee=8,y="series",b=216,C=30,te=!1,R=!0,ue=!0;const je=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],He=69;function Ne(){return ue?432:440}let H=null,N=null,Y=null,_=null,K=null,j=null;const Ze=.01;function Ue(){return L||(L=new AudioContext),L}function Ye(t){const n=t.sampleRate*2,i=t.createBuffer(1,n,t.sampleRate),e=i.getChannelData(0);for(let o=0;o<n;o++)e[o]=Math.random()*2-1;return i}function _e(t){if(y==="none"||te)return null;const n=t.createBiquadFilter();return y==="series"?(n.type="bandpass",n.frequency.value=b,n.Q.value=C):y==="parallel"&&(n.type="notch",n.frequency.value=b,n.Q.value=C),n}function O(){const t=Ue();I=t.createGain(),I.gain.value=De,F=t.createAnalyser(),F.fftSize=8192,q=t.createAnalyser(),q.fftSize=8192,x=_e(t);const n=t.createGain();if(n.gain.value=1,U==="noise"){const i=t.createBufferSource();i.buffer=Ye(t),i.loop=!0,i.start(),i.connect(n),E=i}else{const i=t.createOscillator();if(i.type=U,i.frequency.value=z,i.start(),i.connect(n),E=i,J=[],U==="sine")for(let e=1;e<=ee;e++){const o=t.createOscillator();o.type="sine",o.frequency.value=z*(e+1);const a=t.createGain();a.gain.value=1/(e+1),o.connect(a),a.connect(n),o.start(),J.push(o)}}x?(n.connect(I),I.connect(F),F.connect(x),x.connect(q),q.connect(t.destination)):(n.connect(I),I.connect(F),F.connect(q),q.connect(t.destination)),B=!0,Ge(),Je()}function Q(){Z&&(cancelAnimationFrame(Z),Z=null),E&&(E.stop(),E.disconnect(),E=null),J.forEach(t=>{t.stop(),t.disconnect()}),J=[],I&&(I.disconnect(),I=null),x&&(x.disconnect(),x=null),F&&(F.disconnect(),F=null),q&&(q.disconnect(),q=null),B=!1,Ge(),tt()}function Ke(){B?Q():O()}function Je(){if(!F||!q||!H||!N||!L)return;const t=F.frequencyBinCount,n=new Uint8Array(t),i=new Uint8Array(t);function e(){if(!F||!q||!H||!N||!L)return;Z=requestAnimationFrame(e),F.getByteTimeDomainData(n),q.getByteTimeDomainData(i);const o=L.sampleRate/z,s=Math.floor(o*4),r=et(n,t,o);Se(H,n,r,s,"#ff6b6b"),Se(N,i,r,s,"#16c79a")}e()}function et(t,n,i){const a=Math.min(Math.floor(i*2),n/4);for(let s=2;s<a;s++)if(t[s-2]<128-3&&t[s-1]<128&&t[s]>=128){const r=s+Math.floor(i);if(r<n-5){for(let l=r-3;l<=r+3;l++)if(l>1&&l<n-1&&t[l-1]<128&&t[l]>=128)return s}if(s<i)return s}for(let s=1;s<a;s++)if(t[s-1]<128&&t[s]>=128)return s;return 0}function Se(t,n,i,e,o){const a=t.canvas,s=a.width,r=a.height,l=n.length;t.fillStyle="#0a0e27",t.fillRect(0,0,s,r);const f=Math.min(e,l-i);if(f<=0){t.strokeStyle="#0f3460",t.lineWidth=1,t.beginPath(),t.moveTo(0,r/2),t.lineTo(s,r/2),t.stroke();return}t.lineWidth=2,t.strokeStyle=o,t.beginPath();const d=s/f;let T=0;for(let c=0;c<f;c++){const p=i+c,w=n[p]/128*r/2;c===0?t.moveTo(T,w):t.lineTo(T,w),T+=d}if(t.stroke(),L){const c=L.sampleRate/z;t.strokeStyle="rgba(22, 199, 154, 0.15)",t.lineWidth=1;for(let p=1;p<4;p++){const k=p*c/f*s;k<s&&(t.beginPath(),t.moveTo(k,0),t.lineTo(k,r),t.stroke())}}}function tt(){ne(H),ne(N)}function ne(t){if(!t)return;const n=t.canvas;t.fillStyle="#0a0e27",t.fillRect(0,0,n.width,n.height),t.strokeStyle="#0f3460",t.lineWidth=1,t.beginPath(),t.moveTo(0,n.height/2),t.lineTo(n.width,n.height/2),t.stroke()}function nt(){const t=Ze,n=2*Math.PI*b,i=1/(4*Math.PI*Math.PI*b*b*t);let e;return y==="series"?e=n*t/C:e=C*n*t,{R:e,L:t,C:i}}function re(t,n){return n==="Ω"?t>=1e6?`${(t/1e6).toFixed(2)} MΩ`:t>=1e3?`${(t/1e3).toFixed(2)} kΩ`:t>=1?`${t.toFixed(2)} Ω`:`${(t*1e3).toFixed(2)} mΩ`:n==="H"?t>=1?`${t.toFixed(3)} H`:t>=.001?`${(t*1e3).toFixed(2)} mH`:`${(t*1e6).toFixed(2)} µH`:n==="F"?t>=1e-6?`${(t*1e6).toFixed(2)} µF`:t>=1e-9?`${(t*1e9).toFixed(2)} nF`:`${(t*1e12).toFixed(2)} pF`:t.toExponential(2)}function oe(){if(!Y)return;const t=Y.canvas,n=t.width,i=t.height,e=Y;if(e.fillStyle="#0a0e27",e.fillRect(0,0,n,i),y==="none"){e.fillStyle="#8892b0",e.font="11px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type",n/2,i/2);return}e.strokeStyle="#16c79a",e.lineWidth=1.5,e.fillStyle="#8892b0",e.font="9px -apple-system, sans-serif",e.textAlign="center";const o=i/2,a=20,s=n-20,r=40;if(y==="series"){const l=(s-a-3*r)/4;e.beginPath(),e.moveTo(a,o),e.lineTo(a+l,o),e.stroke(),e.fillText("IN",a,o-10);const f=a+l;ot(e,f,o,r),e.fillText("R",f+r/2,o-12),e.beginPath(),e.moveTo(f+r,o),e.lineTo(f+r+l,o),e.stroke();const d=f+r+l;st(e,d,o,r),e.fillText("L",d+r/2,o-12),e.beginPath(),e.moveTo(d+r,o),e.lineTo(d+r+l,o),e.stroke();const T=d+r+l;lt(e,T,o,r),e.fillText("C",T+r/2,o-12),e.beginPath(),e.moveTo(T+r,o),e.lineTo(s,o),e.stroke(),e.fillText("OUT",s,o-10),e.beginPath(),e.moveTo(s,o),e.lineTo(s,o+15),e.stroke(),Pe(e,s,o+15)}else{const l=n/2-50,f=n/2+50;e.beginPath(),e.moveTo(a,o),e.lineTo(l,o),e.stroke(),e.fillText("IN",a,o-10),e.beginPath(),e.moveTo(l,o),e.lineTo(l,o-25),e.lineTo(f,o-25),e.lineTo(f,o),e.stroke(),e.beginPath(),e.moveTo(l,o),e.lineTo(l,o+25),e.lineTo(f,o+25),e.lineTo(f,o),e.stroke();const d=l+20;e.beginPath(),e.moveTo(d,o-25),e.lineTo(d,o-15),e.stroke(),it(e,d,o-15,30),e.beginPath(),e.moveTo(d,o+15),e.lineTo(d,o+25),e.stroke(),e.fillText("R",d,i-5);const T=n/2;e.beginPath(),e.moveTo(T,o-25),e.lineTo(T,o-15),e.stroke(),at(e,T,o-15,30),e.beginPath(),e.moveTo(T,o+15),e.lineTo(T,o+25),e.stroke(),e.fillText("L",T,10);const c=f-20;e.beginPath(),e.moveTo(c,o-25),e.lineTo(c,o-5),e.stroke(),rt(e,c,o-5),e.beginPath(),e.moveTo(c,o+5),e.lineTo(c,o+25),e.stroke(),e.fillText("C",c,i-5),e.beginPath(),e.moveTo(f,o),e.lineTo(s,o),e.stroke(),e.fillText("OUT",s,o-10),e.beginPath(),e.moveTo(s,o),e.lineTo(s,o+15),e.stroke(),Pe(e,s,o+15)}}function ot(t,n,i,e){const s=e/6;t.beginPath(),t.moveTo(n,i);for(let r=0;r<6;r++){const l=n+r*s;r%2===0?(t.lineTo(l+s/2,i-8),t.lineTo(l+s,i)):(t.lineTo(l+s/2,i+8),t.lineTo(l+s,i))}t.stroke()}function it(t,n,i,e){const s=e/6;t.beginPath(),t.moveTo(n,i);for(let r=0;r<6;r++){const l=i+r*s;r%2===0?(t.lineTo(n-8,l+s/2),t.lineTo(n,l+s)):(t.lineTo(n+8,l+s/2),t.lineTo(n,l+s))}t.stroke()}function st(t,n,i,e){const a=e/4;t.beginPath(),t.moveTo(n,i);for(let s=0;s<4;s++){const r=n+s*a+a/2;t.arc(r,i,a/2,Math.PI,0,!1)}t.stroke()}function at(t,n,i,e){const a=e/4;t.beginPath(),t.moveTo(n,i);for(let s=0;s<4;s++){const r=i+s*a+a/2;t.arc(n,r,a/2,-Math.PI/2,Math.PI/2,!1)}t.stroke()}function lt(t,n,i,e){t.beginPath(),t.moveTo(n,i),t.lineTo(n+e/2-8/2,i),t.stroke(),t.beginPath(),t.moveTo(n+e/2-8/2,i-20/2),t.lineTo(n+e/2-8/2,i+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,i-20/2),t.lineTo(n+e/2+8/2,i+20/2),t.stroke(),t.beginPath(),t.moveTo(n+e/2+8/2,i),t.lineTo(n+e,i),t.stroke()}function rt(t,n,i,e){t.beginPath(),t.moveTo(n-20/2,i),t.lineTo(n+20/2,i),t.stroke(),t.beginPath(),t.moveTo(n-20/2,i+8),t.lineTo(n+20/2,i+8),t.stroke()}function Pe(t,n,i){t.beginPath(),t.moveTo(n-15,i),t.lineTo(n+15,i),t.stroke(),t.beginPath(),t.moveTo(n-10,i+5),t.lineTo(n+10,i+5),t.stroke(),t.beginPath(),t.moveTo(n-5,i+10),t.lineTo(n+5,i+10),t.stroke()}function ie(){if(!_)return;const t=_.canvas,n=t.width,i=t.height,e=_;if(e.fillStyle="#0a0e27",e.fillRect(0,0,n,i),y==="none"){e.fillStyle="#8892b0",e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view pole-zero plot",n/2,i/2);return}const o=2*Math.PI*b,a=1/(2*C),s=-a*o,r=o*Math.sqrt(Math.abs(1-a*a)),l=a<1,f=Math.abs(a-1)<.001,d=Math.abs(s)*2.5,T=l?r*1.5:d,c=n*.6,p=i/2,k=n*.35/d,w=i*.4/T;e.strokeStyle="#0f3460",e.lineWidth=1;for(let h=-5;h<=2;h++){const M=c+h*d*k/5;e.beginPath(),e.moveTo(M,0),e.lineTo(M,i),e.stroke()}for(let h=-4;h<=4;h++){const M=p-h*T*w/4;e.beginPath(),e.moveTo(0,M),e.lineTo(n,M),e.stroke()}if(e.strokeStyle="#8892b0",e.lineWidth=2,e.beginPath(),e.moveTo(0,p),e.lineTo(n,p),e.stroke(),e.beginPath(),e.moveTo(c,0),e.lineTo(c,i),e.stroke(),e.fillStyle="#8892b0",e.beginPath(),e.moveTo(n-10,p-5),e.lineTo(n,p),e.lineTo(n-10,p+5),e.fill(),e.beginPath(),e.moveTo(c-5,10),e.lineTo(c,0),e.lineTo(c+5,10),e.fill(),e.font="12px -apple-system, sans-serif",e.textAlign="center",e.fillStyle="#8892b0",e.fillText("σ (Real)",n-30,p-10),e.fillText("jω (Imag)",c+35,15),e.strokeStyle="#0f3460",e.lineWidth=1,e.setLineDash([5,5]),e.beginPath(),e.moveTo(c,0),e.lineTo(c,i),e.stroke(),e.setLineDash([]),e.fillStyle="#ff6b6b",e.strokeStyle="#ff6b6b",e.lineWidth=3,l){const h=c+s*k,M=p-r*w,S=p+r*w;V(e,h,M),V(e,h,S),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(s/1e3).toFixed(1)}k + j${(r/1e3).toFixed(1)}k`,h+15,M-5),e.fillText(`p₂ = ${(s/1e3).toFixed(1)}k - j${(r/1e3).toFixed(1)}k`,h+15,S+15)}else if(f){const h=c+s*k;V(e,h,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁,₂ = ${(s/1e3).toFixed(1)}k (double)`,h+15,p-10)}else{const h=s+o*Math.sqrt(a*a-1),M=s-o*Math.sqrt(a*a-1),S=c+h*k,ae=c+M*k;V(e,S,p),V(e,ae,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`p₁ = ${(h/1e3).toFixed(1)}k`,S+15,p-10),e.fillText(`p₂ = ${(M/1e3).toFixed(1)}k`,ae+15,p+20)}if(e.fillStyle="#16c79a",e.strokeStyle="#16c79a",e.lineWidth=3,y==="series")ce(e,c,p),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText("z = 0",c+15,p+25);else if(y==="parallel"){const h=p-o*w,M=p+o*w;ce(e,c,h),ce(e,c,M),e.font="11px Courier New, monospace",e.textAlign="left",e.fillText(`z₁ = +j${(o/1e3).toFixed(1)}k`,c+15,h-5),e.fillText(`z₂ = -j${(o/1e3).toFixed(1)}k`,c+15,M+15)}e.fillStyle="rgba(22, 33, 62, 0.9)",e.fillRect(10,10,220,100),e.strokeStyle="#0f3460",e.lineWidth=1,e.strokeRect(10,10,220,100),e.fillStyle="#e0e0e0",e.font="11px Courier New, monospace",e.textAlign="left";const $=l?"Underdamped":f?"Critically Damped":"Overdamped";e.fillText(`ω₀ = ${(o/1e3).toFixed(2)}k rad/s`,20,30),e.fillText(`ζ = ${a.toFixed(4)} (${$})`,20,50),e.fillText(`Q = ${C.toFixed(2)}`,20,70),e.fillText(`f₀ = ${b} Hz`,20,90),e.fillStyle="rgba(22, 33, 62, 0.9)",e.fillRect(n-120,10,110,60),e.strokeStyle="#0f3460",e.strokeRect(n-120,10,110,60),e.font="11px -apple-system, sans-serif",e.fillStyle="#ff6b6b",e.fillText("✕ Poles",n-110,30),e.fillStyle="#16c79a",e.fillText("○ Zeros",n-110,50)}function V(t,n,i){t.beginPath(),t.moveTo(n-8,i-8),t.lineTo(n+8,i+8),t.stroke(),t.beginPath(),t.moveTo(n+8,i-8),t.lineTo(n-8,i+8),t.stroke()}function ce(t,n,i){t.beginPath(),t.arc(n,i,8,0,2*Math.PI),t.stroke()}function de(){j!==null&&clearTimeout(j),j=window.setTimeout(()=>{Ve(),j=null},150)}function Ve(){if(!K)return;const t=K.canvas,n=t.width,i=t.height,e=K;if(e.fillStyle="#0a0e27",e.fillRect(0,0,n,i),y==="none"){e.fillStyle="#8892b0",e.font="14px -apple-system, sans-serif",e.textAlign="center",e.fillText("Select a circuit type to view 3D transfer function",n/2,i/2);return}const o=2*Math.PI*b,a=1/(2*C),s=-a*o,r=o*Math.sqrt(Math.abs(1-a*a)),l=60,f=Math.abs(s)*4,d=o*2,T=.7,c=-.3,p=.8,k=n*.5,w=i*.6,$=[],h=[],M=[];for(let u=0;u<=l;u++){const v=-f+u/l*f*1.2;h.push(v)}for(let u=0;u<=l;u++){const v=-d+u/l*d*2;M.push(v)}for(let u=0;u<=l;u++){$[u]=[];for(let v=0;v<=l;v++){const m=h[u],g=M[v];let P;if(y==="series"){const W=Math.sqrt(Math.pow(2*a*o*m,2)+Math.pow(2*a*o*g,2)),A=Math.sqrt(Math.pow(m-s,2)+Math.pow(g-r,2)),D=Math.sqrt(Math.pow(m-s,2)+Math.pow(g+r,2));P=W/(A*D+.001)}else{const W=Math.sqrt(Math.pow(m,2)+Math.pow(g-o,2)),A=Math.sqrt(Math.pow(m,2)+Math.pow(g+o,2)),D=W*A,le=Math.sqrt(Math.pow(m-s,2)+Math.pow(g-r,2)),X=Math.sqrt(Math.pow(m-s,2)+Math.pow(g+r,2));P=D/(le*X+.001)}P=Math.min(P,50),$[u][v]=Math.log10(P+1)*30}}function S(u,v,m){const g=(u/l-.5)*2,P=(v/l-.5)*2,W=m/50,A=Math.cos(c),D=Math.sin(c),le=g*A-P*D,X=g*D+P*A,ve=Math.cos(T),Te=Math.sin(T),Xe=X*ve-W*Te,ye=X*Te+W*ve,be=3,Me=be/(be+ye);return{x:k+le*Me*n*p*.4,y:w-Xe*Me*i*p*.4,depth:ye}}e.lineWidth=.5;for(let u=0;u<=l;u+=2){e.beginPath();let v=!0;for(let m=0;m<=l;m++){const g=S(m,u,$[m][u]);v?(e.moveTo(g.x,g.y),v=!1):e.lineTo(g.x,g.y)}e.strokeStyle=`rgba(22, 199, 154, ${.3+u/l*.4})`,e.stroke()}for(let u=0;u<=l;u+=2){e.beginPath();let v=!0;for(let m=0;m<=l;m++){const g=S(u,m,$[u][m]);v?(e.moveTo(g.x,g.y),v=!1):e.lineTo(g.x,g.y)}e.strokeStyle=`rgba(22, 199, 154, ${.3+u/l*.4})`,e.stroke()}if(e.fillStyle="#ff6b6b",e.strokeStyle="#ff6b6b",e.lineWidth=2,a<1){const u=(s+f)/(f*1.2)*l,v=(r+d)/(d*2)*l,m=(-r+d)/(d*2)*l,g=S(u,v,80),P=S(u,m,80);e.beginPath(),e.arc(g.x,g.y,6,0,2*Math.PI),e.fill(),e.beginPath(),e.arc(P.x,P.y,6,0,2*Math.PI),e.fill()}if(y==="series"){const u=f/(f*1.2)*l,v=d/(d*2)*l,m=S(u,v,0);e.strokeStyle="#16c79a",e.lineWidth=3,e.beginPath(),e.arc(m.x,m.y,8,0,2*Math.PI),e.stroke()}else if(y==="parallel"){const u=f/(f*1.2)*l,v=(o+d)/(d*2)*l,m=(-o+d)/(d*2)*l,g=S(u,v,0),P=S(u,m,0);e.strokeStyle="#16c79a",e.lineWidth=3,e.beginPath(),e.arc(g.x,g.y,8,0,2*Math.PI),e.stroke(),e.beginPath(),e.arc(P.x,P.y,8,0,2*Math.PI),e.stroke()}e.fillStyle="#8892b0",e.font="12px -apple-system, sans-serif",e.textAlign="center";const ge=S(l,l/2,0);e.fillText("σ (Real)",ge.x+30,ge.y);const he=S(l/2,l,0);e.fillText("jω (Imag)",he.x,he.y-10),e.fillText("|H(s)|",n-50,30),e.fillStyle="rgba(22, 33, 62, 0.9)",e.fillRect(10,10,180,50),e.strokeStyle="#0f3460",e.lineWidth=1,e.strokeRect(10,10,180,50),e.fillStyle="#e0e0e0",e.font="11px -apple-system, sans-serif",e.textAlign="left",e.fillText("3D Transfer Function Surface",20,30),e.fillStyle="#8892b0",e.fillText("Peaks at poles, valleys at zeros",20,48)}function ct(t){const e=Math.log10(20),o=Math.log10(2e3),a=e+t/100*(o-e);return Math.round(Math.pow(10,a))}function ut(t){const e=Math.log10(20),o=Math.log10(2e3);return(Math.log10(t)-e)/(o-e)*100}function dt(t){const e=Math.log10(20),o=Math.log10(1e4),a=e+t/100*(o-e);return Math.round(Math.pow(10,a))}function ft(t){const e=Math.log10(20),o=Math.log10(1e4);return(Math.log10(t)-e)/(o-e)*100}function pt(t){const e=Math.log10(.1),o=Math.log10(100),a=e+t/100*(o-e);return Math.pow(10,a)}function mt(t){const e=Math.log10(.1),o=Math.log10(100);return(Math.log10(t)-e)/(o-e)*100}function Oe(t){return 12*Math.log2(t/Ne())+He}function gt(t){return Ne()*Math.pow(2,(t-He)/12)}function Qe(t){const n=Math.round(Oe(t));return gt(n)}function fe(t){const n=Math.round(Oe(t)),i=(n%12+12)%12,e=Math.floor(n/12)-1;return`${je[i]}${e}`}function ht(t){var i;U=t;const n=(i=document.getElementById("overtones"))==null?void 0:i.parentElement;n&&(n.style.display=t==="sine"?"block":"none"),B&&(Q(),O())}function pe(t){R&&(t=Qe(t)),z=t,E&&"frequency"in E&&(E.frequency.value=t);const n=R?`${Math.round(t)} Hz (${fe(t)})`:`${t} Hz`;document.getElementById("freqValue").textContent=n}function vt(t){De=t,I&&(I.gain.value=t),document.getElementById("ampValue").textContent=t.toFixed(2)}function Tt(t){ee=t,document.getElementById("overtonesValue").textContent=t.toString(),B&&(Q(),O())}function yt(t){y=t,B&&(Q(),O()),se(),oe(),G(),ie(),de()}function bt(){te=!te,Mt(),B&&(Q(),O())}function Mt(){const t=document.getElementById("bypassBtn");t&&(te?(t.textContent="Enable Filter",t.classList.add("bypassed")):(t.textContent="Bypass",t.classList.remove("bypassed")))}function me(t){R&&(t=Qe(t)),b=t,x&&(x.frequency.value=t),se(),oe(),G(),ie(),de()}function St(t){C=t,x&&(x.Q.value=t),se(),oe(),G(),ie(),de()}function se(){const t=document.getElementById("circuitInfo");if(y==="none")t.textContent="No filter applied - direct signal path";else{const n=y==="series"?"Bandpass (passes resonant frequency)":"Notch (blocks resonant frequency)";t.innerHTML=`
      <strong>${y==="series"?"Series":"Parallel"} RLC Circuit</strong><br>
      ${n}
    `}}function G(){const t=document.querySelector(".formula-content");if(y==="none"){t.innerHTML="Select a circuit type to see formulas";return}if(document.getElementById("resFrequency")){Fe();return}t.innerHTML=`
    <div class="formula-grid">
      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Resonant Frequency</div>
        </div>
        <div class="formula-equation"><span class="formula-symbol">f₀</span> <span class="formula-equals">=</span> 1 / (2π√LC)</div>
        <div class="formula-result" id="resFreqResult">${R?`${Math.round(b)} Hz (${fe(b)})`:`${b} Hz`}</div>
        <input type="range" class="formula-slider" id="resFrequency" min="0" max="100" value="${ft(b)}" step="0.1">
      </div>

      <div class="formula">
        <div class="formula-header">
          <div class="formula-label">Q Factor</div>
        </div>
        <div class="formula-equation" id="qEquation"><span class="formula-symbol">Q</span> <span class="formula-equals">=</span> ${y==="series"?"ω₀L / R":"R / (ω₀L)"}</div>
        <div class="formula-result" id="qFactorResult">${C.toFixed(2)}</div>
        <input type="range" class="formula-slider" id="qFactor" min="0" max="100" value="${mt(C)}" step="0.1">
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
  `,Pt(),Fe()}function Fe(){const{R:t,L:n,C:i}=nt(),e=b/C,o=document.getElementById("resFreqResult"),a=document.getElementById("qFactorResult"),s=document.getElementById("inductanceResult"),r=document.getElementById("capacitanceResult"),l=document.getElementById("resistanceResult"),f=document.getElementById("resistanceEquation"),d=document.getElementById("bandwidthResult");o&&(o.textContent=R?`${Math.round(b)} Hz (${fe(b)})`:`${b} Hz`),a&&(a.textContent=C.toFixed(2)),s&&(s.textContent=re(n,"H")),r&&(r.textContent=re(i,"F")),l&&(l.textContent=re(t,"Ω")),f&&(f.innerHTML=y==="series"?"Q = ω₀L / R":"Q = R / (ω₀L)"),d&&(d.textContent=`${e.toFixed(2)} Hz`)}function Pt(){const t=document.getElementById("resFrequency"),n=document.getElementById("qFactor");t==null||t.addEventListener("input",i=>{const e=i.target,o=dt(parseFloat(e.value));me(o)}),n==null||n.addEventListener("input",i=>{const e=i.target,o=pt(parseFloat(e.value));St(o)})}function Ge(){const t=document.getElementById("startBtn");t&&(t.textContent=B?"Stop Signal":"Start Signal",B?t.classList.add("playing"):t.classList.remove("playing"))}document.querySelector("#app").innerHTML=`
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
          <input type="checkbox" id="useA432Tuning" ${ue?"checked":""}>
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
          <input type="range" id="frequency" min="0" max="100" value="${ut(z)}" step="0.1">
        </div>

        <div class="control-group">
          <label>Amplitude: <span id="ampValue">0.30</span></label>
          <input type="range" id="amplitude" min="0" max="1" value="0.3" step="0.01">
        </div>

        <div class="control-group">
          <label>Overtones: <span id="overtonesValue">${ee}</span></label>
          <input type="range" id="overtones" min="0" max="16" value="${ee}" step="1">
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
`;const ke=document.getElementById("inputWaveformCanvas"),qe=document.getElementById("outputWaveformCanvas"),Ce=document.getElementById("circuitDiagramCanvas"),Ie=document.getElementById("poleZeroCanvas");ke&&(H=ke.getContext("2d"),ne(H));qe&&(N=qe.getContext("2d"),ne(N));Ce&&(Y=Ce.getContext("2d"),oe());Ie&&(_=Ie.getContext("2d"),ie());const xe=document.getElementById("sPlane3DCanvas");xe&&(K=xe.getContext("2d"),Ve());se();G();var we;(we=document.getElementById("startBtn"))==null||we.addEventListener("click",Ke);var ze;(ze=document.getElementById("signalType"))==null||ze.addEventListener("change",t=>{const n=t.target;ht(n.value)});var Ee;(Ee=document.getElementById("frequency"))==null||Ee.addEventListener("input",t=>{const n=t.target,i=ct(parseFloat(n.value));pe(i)});var Be;(Be=document.getElementById("amplitude"))==null||Be.addEventListener("input",t=>{const n=t.target;vt(parseFloat(n.value))});var Re;(Re=document.getElementById("overtones"))==null||Re.addEventListener("input",t=>{const n=t.target;Tt(parseInt(n.value))});var Le;(Le=document.getElementById("circuitType"))==null||Le.addEventListener("change",t=>{const n=t.target;yt(n.value)});var $e;($e=document.getElementById("bypassBtn"))==null||$e.addEventListener("click",bt);var We;(We=document.getElementById("autoMusicalMode"))==null||We.addEventListener("change",t=>{if(R=t.target.checked,R)pe(z),me(b);else{const i=`${z} Hz`;document.getElementById("freqValue").textContent=i,G()}});var Ae;(Ae=document.getElementById("useA432Tuning"))==null||Ae.addEventListener("change",t=>{ue=t.target.checked,R&&(pe(z),me(b))});
