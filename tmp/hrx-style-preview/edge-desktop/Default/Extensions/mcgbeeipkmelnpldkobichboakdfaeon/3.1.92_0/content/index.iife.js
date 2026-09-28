var Co=Object.defineProperty;var Eo=(U,Y,G)=>Y in U?Co(U,Y,{enumerable:!0,configurable:!0,writable:!0,value:G}):U[Y]=G;var S=(U,Y,G)=>Eo(U,typeof Y!="symbol"?Y+"":Y,G);(function(){"use strict";var U=(o=>(o.Local="local",o.Sync="sync",o.Managed="managed",o.Session="session",o))(U||{}),Y=(o=>(o.ExtensionPagesOnly="TRUSTED_CONTEXTS",o.ExtensionPagesAndContentScripts="TRUSTED_AND_UNTRUSTED_CONTEXTS",o))(Y||{}),G=(o,t,e)=>new Promise((n,a)=>{var r=c=>{try{i(e.next(c))}catch(l){a(l)}},s=c=>{try{i(e.throw(c))}catch(l){a(l)}},i=c=>c.done?n(c.value):Promise.resolve(c.value).then(r,s);i((e=e.apply(o,t)).next())});const j=globalThis.chrome;function me(o,t){return G(this,null,function*(){function e(a){return typeof a=="function"}function n(a){return a instanceof Promise}return e(o)?(n(o),o(t)):o})}let ue=!1;function he(o){if(j&&j.storage[o]===void 0)throw new Error(`Check your storage permission in manifest.json: ${o} is not defined`)}function en(o,t,e){var n,a,r,s,i,c;let l=null,p=!1,m=[];const d=(n=e==null?void 0:e.storageEnum)!=null?n:U.Local,h=(a=e==null?void 0:e.liveUpdate)!=null?a:!1,g=(s=(r=e==null?void 0:e.serialization)==null?void 0:r.serialize)!=null?s:E=>E,u=(c=(i=e==null?void 0:e.serialization)==null?void 0:i.deserialize)!=null?c:E=>E;ue===!1&&d===U.Session&&(e==null?void 0:e.sessionAccessForContentScripts)===!0&&(he(d),j==null||j.storage[d].setAccessLevel({accessLevel:Y.ExtensionPagesAndContentScripts}).catch(E=>{console.warn(E),console.warn("Please call setAccessLevel into different context, like a background script.")}),ue=!0);const v=()=>G(this,null,function*(){var E;he(d);const O=yield j==null?void 0:j.storage[d].get([o]);return O&&(E=u(O[o]))!=null?E:t}),f=()=>{m.forEach(E=>E())},A=E=>G(this,null,function*(){p||(l=yield v()),l=yield me(E,l),yield j==null?void 0:j.storage[d].set({[o]:g(l)}),f()}),ot=E=>(m=[...m,E],()=>{m=m.filter(O=>O!==E)}),lt=()=>l;v().then(E=>{l=E,p=!0,f()});function it(E){return G(this,null,function*(){if(E[o]===void 0)return;const O=u(E[o].newValue);l!==O&&(l=yield me(O,l),f())})}return h&&(j==null||j.storage[d].onChanged.addListener(it)),{get:v,set:A,getSnapshot:lt,subscribe:ot}}var nn=Object.defineProperty,on=Object.defineProperties,rn=Object.getOwnPropertyDescriptors,be=Object.getOwnPropertySymbols,an=Object.prototype.hasOwnProperty,sn=Object.prototype.propertyIsEnumerable,ge=(o,t,e)=>t in o?nn(o,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):o[t]=e,ln=(o,t)=>{for(var e in t||(t={}))an.call(t,e)&&ge(o,e,t[e]);if(be)for(var e of be(t))sn.call(t,e)&&ge(o,e,t[e]);return o},cn=(o,t)=>on(o,rn(t)),pn=(o,t,e)=>new Promise((n,a)=>{var r=c=>{try{i(e.next(c))}catch(l){a(l)}},s=c=>{try{i(e.throw(c))}catch(l){a(l)}},i=c=>c.done?n(c.value):Promise.resolve(c.value).then(r,s);i((e=e.apply(o,t)).next())});const Ut=en("theme-storage-key","light",{storageEnum:U.Local,liveUpdate:!0}),dn=cn(ln({},Ut),{toggle:o=>pn(void 0,null,function*(){if(o){yield Ut.set(o);return}yield Ut.set(t=>t==="light"?"dark":"light")})}),mn="useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";let fe=(o=21)=>{let t="",e=crypto.getRandomValues(new Uint8Array(o|=0));for(;o--;)t+=mn[e[o]&63];return t};async function un(){console.log("initial theme:",await dn.get())}let yt=!1,Yt=0,jt=0,z=null;chrome.runtime.onMessage.addListener((o,t,e)=>{o.action==="startSelection"?bn():o.action==="copyToClipboard"&&hn(o.text)});async function hn(o){try{if(await navigator.clipboard.writeText(o),!document.getElementById("toast-styles")){const e=document.createElement("style");e.id="toast-styles",e.textContent=`
        .toast {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #333;
          color: white;
          padding: 12px 24px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,document.head.appendChild(e)}const t=document.createElement("div");t.className="toast",t.textContent="Copied to clipboard!",document.body.appendChild(t),setTimeout(()=>{t.style.animation="fadeIn 0.3s ease reverse",setTimeout(()=>t.remove(),300)},3e3)}catch(t){console.error("Failed to copy text:",t);const e=document.createElement("div");e.className="toast",e.style.backgroundColor="#dc3545",e.textContent="Failed to copy to clipboard",document.body.appendChild(e),setTimeout(()=>{e.style.animation="fadeIn 0.3s ease reverse",setTimeout(()=>e.remove(),300)},3e3)}}function bn(){document.body.style.cursor="crosshair",document.addEventListener("mousedown",xe),document.addEventListener("mousemove",we),document.addEventListener("mouseup",ye)}function xe(o){yt=!0,Yt=o.clientX,jt=o.clientY,z=document.createElement("div"),z.style.position="fixed",z.style.border="1px solid #00a8ff",z.style.backgroundColor="rgba(0, 168, 255, 0.1)",z.style.pointerEvents="none",z.style.zIndex="10000",document.body.appendChild(z)}function we(o){if(!yt||!z)return;const t=o.clientX-Yt,e=o.clientY-jt;z.style.left=t<0?`${o.clientX}px`:`${Yt}px`,z.style.top=e<0?`${o.clientY}px`:`${jt}px`,z.style.width=`${Math.abs(t)}px`,z.style.height=`${Math.abs(e)}px`}async function ye(o){if(!yt||!z)return;document.body.style.cursor="default";const t=z.getBoundingClientRect();z.remove(),z=null,yt=!1,document.removeEventListener("mousedown",xe),document.removeEventListener("mousemove",we),document.removeEventListener("mouseup",ye);try{const e={x:t.left,y:t.top,width:t.width,height:t.height,dpr:window.devicePixelRatio};chrome.runtime.sendMessage({action:"captureArea",area:e})}catch(e){console.error("Error capturing area:",e)}}function Zt(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}let et=Zt();function ke(o){et=o}const dt={exec:()=>null};function w(o,t=""){let e=typeof o=="string"?o:o.source;const n={replace:(a,r)=>{let s=typeof r=="string"?r:r.source;return s=s.replace($.caret,"$1"),e=e.replace(a,s),n},getRegex:()=>new RegExp(e,t)};return n}const $={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceTabs:/^\t+/,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] /,listReplaceTask:/^\[[ xX]\] +/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,unescapeTest:/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:o=>new RegExp(`^( {0,3}${o})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:o=>new RegExp(`^ {0,${Math.min(3,o-1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`),hrRegex:o=>new RegExp(`^ {0,${Math.min(3,o-1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),fencesBeginRegex:o=>new RegExp(`^ {0,${Math.min(3,o-1)}}(?:\`\`\`|~~~)`),headingBeginRegex:o=>new RegExp(`^ {0,${Math.min(3,o-1)}}#`),htmlBeginRegex:o=>new RegExp(`^ {0,${Math.min(3,o-1)}}<(?:[a-z].*>|!--)`,"i")},gn=/^(?:[ \t]*(?:\n|$))+/,fn=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,xn=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,mt=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,wn=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,Gt=/(?:[*+-]|\d{1,9}[.)])/,ve=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Se=w(ve).replace(/bull/g,Gt).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),yn=w(ve).replace(/bull/g,Gt).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),Wt=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,kn=/^[^\n]+/,Qt=/(?!\s*\])(?:\\.|[^\[\]\\])+/,vn=w(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",Qt).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),Sn=w(/^( {0,3}bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g,Gt).getRegex(),kt="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",Vt=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Cn=w("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",Vt).replace("tag",kt).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Ce=w(Wt).replace("hr",mt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",kt).getRegex(),Jt={blockquote:w(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Ce).getRegex(),code:fn,def:vn,fences:xn,heading:wn,hr:mt,html:Cn,lheading:Se,list:Sn,newline:gn,paragraph:Ce,table:dt,text:kn},Ee=w("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",mt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",kt).getRegex(),En={...Jt,lheading:yn,table:Ee,paragraph:w(Wt).replace("hr",mt).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Ee).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)]) ").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",kt).getRegex()},Ln={...Jt,html:w(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",Vt).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:dt,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:w(Wt).replace("hr",mt).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Se).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Tn=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Rn=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Le=/^( {2,}|\\)\n(?!\s*$)/,zn=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,vt=/[\p{P}\p{S}]/u,Kt=/[\s\p{P}\p{S}]/u,Te=/[^\s\p{P}\p{S}]/u,$n=w(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,Kt).getRegex(),Re=/(?!~)[\p{P}\p{S}]/u,An=/(?!~)[\s\p{P}\p{S}]/u,In=/(?:[^\s\p{P}\p{S}]|~)/u,_n=/\[[^[\]]*?\]\((?:\\.|[^\\\(\)]|\((?:\\.|[^\\\(\)])*\))*\)|`[^`]*?`|<[^<>]*?>/g,ze=/^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/,Mn=w(ze,"u").replace(/punct/g,vt).getRegex(),Bn=w(ze,"u").replace(/punct/g,Re).getRegex(),$e="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Pn=w($e,"gu").replace(/notPunctSpace/g,Te).replace(/punctSpace/g,Kt).replace(/punct/g,vt).getRegex(),qn=w($e,"gu").replace(/notPunctSpace/g,In).replace(/punctSpace/g,An).replace(/punct/g,Re).getRegex(),On=w("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,Te).replace(/punctSpace/g,Kt).replace(/punct/g,vt).getRegex(),Nn=w(/\\(punct)/,"gu").replace(/punct/g,vt).getRegex(),Hn=w(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),Dn=w(Vt).replace("(?:-->|$)","-->").getRegex(),Fn=w("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",Dn).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),St=/(?:\[(?:\\.|[^\[\]\\])*\]|\\.|`[^`]*`|[^\[\]\\`])*?/,Xn=w(/^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/).replace("label",St).replace("href",/<(?:\\.|[^\n<>\\])+>|[^\s\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),Ae=w(/^!?\[(label)\]\[(ref)\]/).replace("label",St).replace("ref",Qt).getRegex(),Ie=w(/^!?\[(ref)\](?:\[\])?/).replace("ref",Qt).getRegex(),Un=w("reflink|nolink(?!\\()","g").replace("reflink",Ae).replace("nolink",Ie).getRegex(),te={_backpedal:dt,anyPunctuation:Nn,autolink:Hn,blockSkip:_n,br:Le,code:Rn,del:dt,emStrongLDelim:Mn,emStrongRDelimAst:Pn,emStrongRDelimUnd:On,escape:Tn,link:Xn,nolink:Ie,punctuation:$n,reflink:Ae,reflinkSearch:Un,tag:Fn,text:zn,url:dt},Yn={...te,link:w(/^!?\[(label)\]\((.*?)\)/).replace("label",St).getRegex(),reflink:w(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",St).getRegex()},ee={...te,emStrongRDelimAst:qn,emStrongLDelim:Bn,url:w(/^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,"i").replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\.|[^\\])*?(?:\\.|[^\s~\\]))\1(?=[^~]|$)/,text:/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/},jn={...ee,br:w(Le).replace("{2,}","*").getRegex(),text:w(ee.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},Ct={normal:Jt,gfm:En,pedantic:Ln},ut={normal:te,gfm:ee,breaks:jn,pedantic:Yn},Zn={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},_e=o=>Zn[o];function Z(o,t){if(t){if($.escapeTest.test(o))return o.replace($.escapeReplace,_e)}else if($.escapeTestNoEncode.test(o))return o.replace($.escapeReplaceNoEncode,_e);return o}function Me(o){try{o=encodeURI(o).replace($.percentDecode,"%")}catch{return null}return o}function Be(o,t){var r;const e=o.replace($.findPipe,(s,i,c)=>{let l=!1,p=i;for(;--p>=0&&c[p]==="\\";)l=!l;return l?"|":" |"}),n=e.split($.splitPipe);let a=0;if(n[0].trim()||n.shift(),n.length>0&&!((r=n.at(-1))!=null&&r.trim())&&n.pop(),t)if(n.length>t)n.splice(t);else for(;n.length<t;)n.push("");for(;a<n.length;a++)n[a]=n[a].trim().replace($.slashPipe,"|");return n}function ht(o,t,e){const n=o.length;if(n===0)return"";let a=0;for(;a<n&&o.charAt(n-a-1)===t;)a++;return o.slice(0,n-a)}function Gn(o,t){if(o.indexOf(t[1])===-1)return-1;let e=0;for(let n=0;n<o.length;n++)if(o[n]==="\\")n++;else if(o[n]===t[0])e++;else if(o[n]===t[1]&&(e--,e<0))return n;return-1}function Pe(o,t,e,n,a){const r=t.href,s=t.title||null,i=o[1].replace(a.other.outputLinkReplace,"$1");if(o[0].charAt(0)!=="!"){n.state.inLink=!0;const c={type:"link",raw:e,href:r,title:s,text:i,tokens:n.inlineTokens(i)};return n.state.inLink=!1,c}return{type:"image",raw:e,href:r,title:s,text:i}}function Wn(o,t,e){const n=o.match(e.other.indentCodeCompensation);if(n===null)return t;const a=n[1];return t.split(`
`).map(r=>{const s=r.match(e.other.beginningSpace);if(s===null)return r;const[i]=s;return i.length>=a.length?r.slice(a.length):r}).join(`
`)}class Et{constructor(t){S(this,"options");S(this,"rules");S(this,"lexer");this.options=t||et}space(t){const e=this.rules.block.newline.exec(t);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(t){const e=this.rules.block.code.exec(t);if(e){const n=e[0].replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:e[0],codeBlockStyle:"indented",text:this.options.pedantic?n:ht(n,`
`)}}}fences(t){const e=this.rules.block.fences.exec(t);if(e){const n=e[0],a=Wn(n,e[3]||"",this.rules);return{type:"code",raw:n,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:a}}}heading(t){const e=this.rules.block.heading.exec(t);if(e){let n=e[2].trim();if(this.rules.other.endingHash.test(n)){const a=ht(n,"#");(this.options.pedantic||!a||this.rules.other.endingSpaceChar.test(a))&&(n=a.trim())}return{type:"heading",raw:e[0],depth:e[1].length,text:n,tokens:this.lexer.inline(n)}}}hr(t){const e=this.rules.block.hr.exec(t);if(e)return{type:"hr",raw:ht(e[0],`
`)}}blockquote(t){const e=this.rules.block.blockquote.exec(t);if(e){let n=ht(e[0],`
`).split(`
`),a="",r="";const s=[];for(;n.length>0;){let i=!1;const c=[];let l;for(l=0;l<n.length;l++)if(this.rules.other.blockquoteStart.test(n[l]))c.push(n[l]),i=!0;else if(!i)c.push(n[l]);else break;n=n.slice(l);const p=c.join(`
`),m=p.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");a=a?`${a}
${p}`:p,r=r?`${r}
${m}`:m;const d=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(m,s,!0),this.lexer.state.top=d,n.length===0)break;const h=s.at(-1);if((h==null?void 0:h.type)==="code")break;if((h==null?void 0:h.type)==="blockquote"){const g=h,u=g.raw+`
`+n.join(`
`),v=this.blockquote(u);s[s.length-1]=v,a=a.substring(0,a.length-g.raw.length)+v.raw,r=r.substring(0,r.length-g.text.length)+v.text;break}else if((h==null?void 0:h.type)==="list"){const g=h,u=g.raw+`
`+n.join(`
`),v=this.list(u);s[s.length-1]=v,a=a.substring(0,a.length-h.raw.length)+v.raw,r=r.substring(0,r.length-g.raw.length)+v.raw,n=u.substring(s.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:a,tokens:s,text:r}}}list(t){let e=this.rules.block.list.exec(t);if(e){let n=e[1].trim();const a=n.length>1,r={type:"list",raw:"",ordered:a,start:a?+n.slice(0,-1):"",loose:!1,items:[]};n=a?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=a?n:"[*+-]");const s=this.rules.other.listItemRegex(n);let i=!1;for(;t;){let l=!1,p="",m="";if(!(e=s.exec(t))||this.rules.block.hr.test(t))break;p=e[0],t=t.substring(p.length);let d=e[2].split(`
`,1)[0].replace(this.rules.other.listReplaceTabs,A=>" ".repeat(3*A.length)),h=t.split(`
`,1)[0],g=!d.trim(),u=0;if(this.options.pedantic?(u=2,m=d.trimStart()):g?u=e[1].length+1:(u=e[2].search(this.rules.other.nonSpaceChar),u=u>4?1:u,m=d.slice(u),u+=e[1].length),g&&this.rules.other.blankLine.test(h)&&(p+=h+`
`,t=t.substring(h.length+1),l=!0),!l){const A=this.rules.other.nextBulletRegex(u),ot=this.rules.other.hrRegex(u),lt=this.rules.other.fencesBeginRegex(u),it=this.rules.other.headingBeginRegex(u),E=this.rules.other.htmlBeginRegex(u);for(;t;){const O=t.split(`
`,1)[0];let V;if(h=O,this.options.pedantic?(h=h.replace(this.rules.other.listReplaceNesting,"  "),V=h):V=h.replace(this.rules.other.tabCharGlobal,"    "),lt.test(h)||it.test(h)||E.test(h)||A.test(h)||ot.test(h))break;if(V.search(this.rules.other.nonSpaceChar)>=u||!h.trim())m+=`
`+V.slice(u);else{if(g||d.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||lt.test(d)||it.test(d)||ot.test(d))break;m+=`
`+h}!g&&!h.trim()&&(g=!0),p+=O+`
`,t=t.substring(O.length+1),d=V.slice(u)}}r.loose||(i?r.loose=!0:this.rules.other.doubleBlankLine.test(p)&&(i=!0));let v=null,f;this.options.gfm&&(v=this.rules.other.listIsTask.exec(m),v&&(f=v[0]!=="[ ] ",m=m.replace(this.rules.other.listReplaceTask,""))),r.items.push({type:"list_item",raw:p,task:!!v,checked:f,loose:!1,text:m,tokens:[]}),r.raw+=p}const c=r.items.at(-1);if(c)c.raw=c.raw.trimEnd(),c.text=c.text.trimEnd();else return;r.raw=r.raw.trimEnd();for(let l=0;l<r.items.length;l++)if(this.lexer.state.top=!1,r.items[l].tokens=this.lexer.blockTokens(r.items[l].text,[]),!r.loose){const p=r.items[l].tokens.filter(d=>d.type==="space"),m=p.length>0&&p.some(d=>this.rules.other.anyLine.test(d.raw));r.loose=m}if(r.loose)for(let l=0;l<r.items.length;l++)r.items[l].loose=!0;return r}}html(t){const e=this.rules.block.html.exec(t);if(e)return{type:"html",block:!0,raw:e[0],pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:e[0]}}def(t){const e=this.rules.block.def.exec(t);if(e){const n=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),a=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",r=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:n,raw:e[0],href:a,title:r}}}table(t){var i;const e=this.rules.block.table.exec(t);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;const n=Be(e[1]),a=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),r=(i=e[3])!=null&&i.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],s={type:"table",raw:e[0],header:[],align:[],rows:[]};if(n.length===a.length){for(const c of a)this.rules.other.tableAlignRight.test(c)?s.align.push("right"):this.rules.other.tableAlignCenter.test(c)?s.align.push("center"):this.rules.other.tableAlignLeft.test(c)?s.align.push("left"):s.align.push(null);for(let c=0;c<n.length;c++)s.header.push({text:n[c],tokens:this.lexer.inline(n[c]),header:!0,align:s.align[c]});for(const c of r)s.rows.push(Be(c,s.header.length).map((l,p)=>({text:l,tokens:this.lexer.inline(l),header:!1,align:s.align[p]})));return s}}lheading(t){const e=this.rules.block.lheading.exec(t);if(e)return{type:"heading",raw:e[0],depth:e[2].charAt(0)==="="?1:2,text:e[1],tokens:this.lexer.inline(e[1])}}paragraph(t){const e=this.rules.block.paragraph.exec(t);if(e){const n=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:n,tokens:this.lexer.inline(n)}}}text(t){const e=this.rules.block.text.exec(t);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(t){const e=this.rules.inline.escape.exec(t);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(t){const e=this.rules.inline.tag.exec(t);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(t){const e=this.rules.inline.link.exec(t);if(e){const n=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(n)){if(!this.rules.other.endAngleBracket.test(n))return;const s=ht(n.slice(0,-1),"\\");if((n.length-s.length)%2===0)return}else{const s=Gn(e[2],"()");if(s>-1){const c=(e[0].indexOf("!")===0?5:4)+e[1].length+s;e[2]=e[2].substring(0,s),e[0]=e[0].substring(0,c).trim(),e[3]=""}}let a=e[2],r="";if(this.options.pedantic){const s=this.rules.other.pedanticHrefTitle.exec(a);s&&(a=s[1],r=s[3])}else r=e[3]?e[3].slice(1,-1):"";return a=a.trim(),this.rules.other.startAngleBracket.test(a)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(n)?a=a.slice(1):a=a.slice(1,-1)),Pe(e,{href:a&&a.replace(this.rules.inline.anyPunctuation,"$1"),title:r&&r.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(t,e){let n;if((n=this.rules.inline.reflink.exec(t))||(n=this.rules.inline.nolink.exec(t))){const a=(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal," "),r=e[a.toLowerCase()];if(!r){const s=n[0].charAt(0);return{type:"text",raw:s,text:s}}return Pe(n,r,n[0],this.lexer,this.rules)}}emStrong(t,e,n=""){let a=this.rules.inline.emStrongLDelim.exec(t);if(!a||a[3]&&n.match(this.rules.other.unicodeAlphaNumeric))return;if(!(a[1]||a[2]||"")||!n||this.rules.inline.punctuation.exec(n)){const s=[...a[0]].length-1;let i,c,l=s,p=0;const m=a[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(m.lastIndex=0,e=e.slice(-1*t.length+s);(a=m.exec(e))!=null;){if(i=a[1]||a[2]||a[3]||a[4]||a[5]||a[6],!i)continue;if(c=[...i].length,a[3]||a[4]){l+=c;continue}else if((a[5]||a[6])&&s%3&&!((s+c)%3)){p+=c;continue}if(l-=c,l>0)continue;c=Math.min(c,c+l+p);const d=[...a[0]][0].length,h=t.slice(0,s+a.index+d+c);if(Math.min(s,c)%2){const u=h.slice(1,-1);return{type:"em",raw:h,text:u,tokens:this.lexer.inlineTokens(u)}}const g=h.slice(2,-2);return{type:"strong",raw:h,text:g,tokens:this.lexer.inlineTokens(g)}}}}codespan(t){const e=this.rules.inline.code.exec(t);if(e){let n=e[2].replace(this.rules.other.newLineCharGlobal," ");const a=this.rules.other.nonSpaceChar.test(n),r=this.rules.other.startingSpaceChar.test(n)&&this.rules.other.endingSpaceChar.test(n);return a&&r&&(n=n.substring(1,n.length-1)),{type:"codespan",raw:e[0],text:n}}}br(t){const e=this.rules.inline.br.exec(t);if(e)return{type:"br",raw:e[0]}}del(t){const e=this.rules.inline.del.exec(t);if(e)return{type:"del",raw:e[0],text:e[2],tokens:this.lexer.inlineTokens(e[2])}}autolink(t){const e=this.rules.inline.autolink.exec(t);if(e){let n,a;return e[2]==="@"?(n=e[1],a="mailto:"+n):(n=e[1],a=n),{type:"link",raw:e[0],text:n,href:a,tokens:[{type:"text",raw:n,text:n}]}}}url(t){var n;let e;if(e=this.rules.inline.url.exec(t)){let a,r;if(e[2]==="@")a=e[0],r="mailto:"+a;else{let s;do s=e[0],e[0]=((n=this.rules.inline._backpedal.exec(e[0]))==null?void 0:n[0])??"";while(s!==e[0]);a=e[0],e[1]==="www."?r="http://"+e[0]:r=e[0]}return{type:"link",raw:e[0],text:a,href:r,tokens:[{type:"text",raw:a,text:a}]}}}inlineText(t){const e=this.rules.inline.text.exec(t);if(e){const n=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:n}}}}class P{constructor(t){S(this,"tokens");S(this,"options");S(this,"state");S(this,"tokenizer");S(this,"inlineQueue");this.tokens=[],this.tokens.links=Object.create(null),this.options=t||et,this.options.tokenizer=this.options.tokenizer||new Et,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};const e={other:$,block:Ct.normal,inline:ut.normal};this.options.pedantic?(e.block=Ct.pedantic,e.inline=ut.pedantic):this.options.gfm&&(e.block=Ct.gfm,this.options.breaks?e.inline=ut.breaks:e.inline=ut.gfm),this.tokenizer.rules=e}static get rules(){return{block:Ct,inline:ut}}static lex(t,e){return new P(e).lex(t)}static lexInline(t,e){return new P(e).inlineTokens(t)}lex(t){t=t.replace($.carriageReturn,`
`),this.blockTokens(t,this.tokens);for(let e=0;e<this.inlineQueue.length;e++){const n=this.inlineQueue[e];this.inlineTokens(n.src,n.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(t,e=[],n=!1){var a,r,s;for(this.options.pedantic&&(t=t.replace($.tabCharGlobal,"    ").replace($.spaceLine,""));t;){let i;if((r=(a=this.options.extensions)==null?void 0:a.block)!=null&&r.some(l=>(i=l.call({lexer:this},t,e))?(t=t.substring(i.raw.length),e.push(i),!0):!1))continue;if(i=this.tokenizer.space(t)){t=t.substring(i.raw.length);const l=e.at(-1);i.raw.length===1&&l!==void 0?l.raw+=`
`:e.push(i);continue}if(i=this.tokenizer.code(t)){t=t.substring(i.raw.length);const l=e.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=`
`+i.raw,l.text+=`
`+i.text,this.inlineQueue.at(-1).src=l.text):e.push(i);continue}if(i=this.tokenizer.fences(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.heading(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.hr(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.blockquote(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.list(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.html(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.def(t)){t=t.substring(i.raw.length);const l=e.at(-1);(l==null?void 0:l.type)==="paragraph"||(l==null?void 0:l.type)==="text"?(l.raw+=`
`+i.raw,l.text+=`
`+i.raw,this.inlineQueue.at(-1).src=l.text):this.tokens.links[i.tag]||(this.tokens.links[i.tag]={href:i.href,title:i.title});continue}if(i=this.tokenizer.table(t)){t=t.substring(i.raw.length),e.push(i);continue}if(i=this.tokenizer.lheading(t)){t=t.substring(i.raw.length),e.push(i);continue}let c=t;if((s=this.options.extensions)!=null&&s.startBlock){let l=1/0;const p=t.slice(1);let m;this.options.extensions.startBlock.forEach(d=>{m=d.call({lexer:this},p),typeof m=="number"&&m>=0&&(l=Math.min(l,m))}),l<1/0&&l>=0&&(c=t.substring(0,l+1))}if(this.state.top&&(i=this.tokenizer.paragraph(c))){const l=e.at(-1);n&&(l==null?void 0:l.type)==="paragraph"?(l.raw+=`
`+i.raw,l.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):e.push(i),n=c.length!==t.length,t=t.substring(i.raw.length);continue}if(i=this.tokenizer.text(t)){t=t.substring(i.raw.length);const l=e.at(-1);(l==null?void 0:l.type)==="text"?(l.raw+=`
`+i.raw,l.text+=`
`+i.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=l.text):e.push(i);continue}if(t){const l="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(l);break}else throw new Error(l)}}return this.state.top=!0,e}inline(t,e=[]){return this.inlineQueue.push({src:t,tokens:e}),e}inlineTokens(t,e=[]){var i,c,l;let n=t,a=null;if(this.tokens.links){const p=Object.keys(this.tokens.links);if(p.length>0)for(;(a=this.tokenizer.rules.inline.reflinkSearch.exec(n))!=null;)p.includes(a[0].slice(a[0].lastIndexOf("[")+1,-1))&&(n=n.slice(0,a.index)+"["+"a".repeat(a[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(a=this.tokenizer.rules.inline.anyPunctuation.exec(n))!=null;)n=n.slice(0,a.index)+"++"+n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);for(;(a=this.tokenizer.rules.inline.blockSkip.exec(n))!=null;)n=n.slice(0,a.index)+"["+"a".repeat(a[0].length-2)+"]"+n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);let r=!1,s="";for(;t;){r||(s=""),r=!1;let p;if((c=(i=this.options.extensions)==null?void 0:i.inline)!=null&&c.some(d=>(p=d.call({lexer:this},t,e))?(t=t.substring(p.raw.length),e.push(p),!0):!1))continue;if(p=this.tokenizer.escape(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.tag(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.link(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.reflink(t,this.tokens.links)){t=t.substring(p.raw.length);const d=e.at(-1);p.type==="text"&&(d==null?void 0:d.type)==="text"?(d.raw+=p.raw,d.text+=p.text):e.push(p);continue}if(p=this.tokenizer.emStrong(t,n,s)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.codespan(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.br(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.del(t)){t=t.substring(p.raw.length),e.push(p);continue}if(p=this.tokenizer.autolink(t)){t=t.substring(p.raw.length),e.push(p);continue}if(!this.state.inLink&&(p=this.tokenizer.url(t))){t=t.substring(p.raw.length),e.push(p);continue}let m=t;if((l=this.options.extensions)!=null&&l.startInline){let d=1/0;const h=t.slice(1);let g;this.options.extensions.startInline.forEach(u=>{g=u.call({lexer:this},h),typeof g=="number"&&g>=0&&(d=Math.min(d,g))}),d<1/0&&d>=0&&(m=t.substring(0,d+1))}if(p=this.tokenizer.inlineText(m)){t=t.substring(p.raw.length),p.raw.slice(-1)!=="_"&&(s=p.raw.slice(-1)),r=!0;const d=e.at(-1);(d==null?void 0:d.type)==="text"?(d.raw+=p.raw,d.text+=p.text):e.push(p);continue}if(t){const d="Infinite loop on byte: "+t.charCodeAt(0);if(this.options.silent){console.error(d);break}else throw new Error(d)}}return e}}class Lt{constructor(t){S(this,"options");S(this,"parser");this.options=t||et}space(t){return""}code({text:t,lang:e,escaped:n}){var s;const a=(s=(e||"").match($.notSpaceStart))==null?void 0:s[0],r=t.replace($.endingNewline,"")+`
`;return a?'<pre><code class="language-'+Z(a)+'">'+(n?r:Z(r,!0))+`</code></pre>
`:"<pre><code>"+(n?r:Z(r,!0))+`</code></pre>
`}blockquote({tokens:t}){return`<blockquote>
${this.parser.parse(t)}</blockquote>
`}html({text:t}){return t}heading({tokens:t,depth:e}){return`<h${e}>${this.parser.parseInline(t)}</h${e}>
`}hr(t){return`<hr>
`}list(t){const e=t.ordered,n=t.start;let a="";for(let i=0;i<t.items.length;i++){const c=t.items[i];a+=this.listitem(c)}const r=e?"ol":"ul",s=e&&n!==1?' start="'+n+'"':"";return"<"+r+s+`>
`+a+"</"+r+`>
`}listitem(t){var n;let e="";if(t.task){const a=this.checkbox({checked:!!t.checked});t.loose?((n=t.tokens[0])==null?void 0:n.type)==="paragraph"?(t.tokens[0].text=a+" "+t.tokens[0].text,t.tokens[0].tokens&&t.tokens[0].tokens.length>0&&t.tokens[0].tokens[0].type==="text"&&(t.tokens[0].tokens[0].text=a+" "+Z(t.tokens[0].tokens[0].text),t.tokens[0].tokens[0].escaped=!0)):t.tokens.unshift({type:"text",raw:a+" ",text:a+" ",escaped:!0}):e+=a+" "}return e+=this.parser.parse(t.tokens,!!t.loose),`<li>${e}</li>
`}checkbox({checked:t}){return"<input "+(t?'checked="" ':"")+'disabled="" type="checkbox">'}paragraph({tokens:t}){return`<p>${this.parser.parseInline(t)}</p>
`}table(t){let e="",n="";for(let r=0;r<t.header.length;r++)n+=this.tablecell(t.header[r]);e+=this.tablerow({text:n});let a="";for(let r=0;r<t.rows.length;r++){const s=t.rows[r];n="";for(let i=0;i<s.length;i++)n+=this.tablecell(s[i]);a+=this.tablerow({text:n})}return a&&(a=`<tbody>${a}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+a+`</table>
`}tablerow({text:t}){return`<tr>
${t}</tr>
`}tablecell(t){const e=this.parser.parseInline(t.tokens),n=t.header?"th":"td";return(t.align?`<${n} align="${t.align}">`:`<${n}>`)+e+`</${n}>
`}strong({tokens:t}){return`<strong>${this.parser.parseInline(t)}</strong>`}em({tokens:t}){return`<em>${this.parser.parseInline(t)}</em>`}codespan({text:t}){return`<code>${Z(t,!0)}</code>`}br(t){return"<br>"}del({tokens:t}){return`<del>${this.parser.parseInline(t)}</del>`}link({href:t,title:e,tokens:n}){const a=this.parser.parseInline(n),r=Me(t);if(r===null)return a;t=r;let s='<a href="'+t+'"';return e&&(s+=' title="'+Z(e)+'"'),s+=">"+a+"</a>",s}image({href:t,title:e,text:n}){const a=Me(t);if(a===null)return Z(n);t=a;let r=`<img src="${t}" alt="${n}"`;return e&&(r+=` title="${Z(e)}"`),r+=">",r}text(t){return"tokens"in t&&t.tokens?this.parser.parseInline(t.tokens):"escaped"in t&&t.escaped?t.text:Z(t.text)}}class ne{strong({text:t}){return t}em({text:t}){return t}codespan({text:t}){return t}del({text:t}){return t}html({text:t}){return t}text({text:t}){return t}link({text:t}){return""+t}image({text:t}){return""+t}br(){return""}}class q{constructor(t){S(this,"options");S(this,"renderer");S(this,"textRenderer");this.options=t||et,this.options.renderer=this.options.renderer||new Lt,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new ne}static parse(t,e){return new q(e).parse(t)}static parseInline(t,e){return new q(e).parseInline(t)}parse(t,e=!0){var a,r;let n="";for(let s=0;s<t.length;s++){const i=t[s];if((r=(a=this.options.extensions)==null?void 0:a.renderers)!=null&&r[i.type]){const l=i,p=this.options.extensions.renderers[l.type].call({parser:this},l);if(p!==!1||!["space","hr","heading","code","table","blockquote","list","html","paragraph","text"].includes(l.type)){n+=p||"";continue}}const c=i;switch(c.type){case"space":{n+=this.renderer.space(c);continue}case"hr":{n+=this.renderer.hr(c);continue}case"heading":{n+=this.renderer.heading(c);continue}case"code":{n+=this.renderer.code(c);continue}case"table":{n+=this.renderer.table(c);continue}case"blockquote":{n+=this.renderer.blockquote(c);continue}case"list":{n+=this.renderer.list(c);continue}case"html":{n+=this.renderer.html(c);continue}case"paragraph":{n+=this.renderer.paragraph(c);continue}case"text":{let l=c,p=this.renderer.text(l);for(;s+1<t.length&&t[s+1].type==="text";)l=t[++s],p+=`
`+this.renderer.text(l);e?n+=this.renderer.paragraph({type:"paragraph",raw:p,text:p,tokens:[{type:"text",raw:p,text:p,escaped:!0}]}):n+=p;continue}default:{const l='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(l),"";throw new Error(l)}}}return n}parseInline(t,e=this.renderer){var a,r;let n="";for(let s=0;s<t.length;s++){const i=t[s];if((r=(a=this.options.extensions)==null?void 0:a.renderers)!=null&&r[i.type]){const l=this.options.extensions.renderers[i.type].call({parser:this},i);if(l!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(i.type)){n+=l||"";continue}}const c=i;switch(c.type){case"escape":{n+=e.text(c);break}case"html":{n+=e.html(c);break}case"link":{n+=e.link(c);break}case"image":{n+=e.image(c);break}case"strong":{n+=e.strong(c);break}case"em":{n+=e.em(c);break}case"codespan":{n+=e.codespan(c);break}case"br":{n+=e.br(c);break}case"del":{n+=e.del(c);break}case"text":{n+=e.text(c);break}default:{const l='Token with "'+c.type+'" type was not found.';if(this.options.silent)return console.error(l),"";throw new Error(l)}}}return n}}class bt{constructor(t){S(this,"options");S(this,"block");this.options=t||et}preprocess(t){return t}postprocess(t){return t}processAllTokens(t){return t}provideLexer(){return this.block?P.lex:P.lexInline}provideParser(){return this.block?q.parse:q.parseInline}}S(bt,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens"]));class Qn{constructor(...t){S(this,"defaults",Zt());S(this,"options",this.setOptions);S(this,"parse",this.parseMarkdown(!0));S(this,"parseInline",this.parseMarkdown(!1));S(this,"Parser",q);S(this,"Renderer",Lt);S(this,"TextRenderer",ne);S(this,"Lexer",P);S(this,"Tokenizer",Et);S(this,"Hooks",bt);this.use(...t)}walkTokens(t,e){var a,r;let n=[];for(const s of t)switch(n=n.concat(e.call(this,s)),s.type){case"table":{const i=s;for(const c of i.header)n=n.concat(this.walkTokens(c.tokens,e));for(const c of i.rows)for(const l of c)n=n.concat(this.walkTokens(l.tokens,e));break}case"list":{const i=s;n=n.concat(this.walkTokens(i.items,e));break}default:{const i=s;(r=(a=this.defaults.extensions)==null?void 0:a.childTokens)!=null&&r[i.type]?this.defaults.extensions.childTokens[i.type].forEach(c=>{const l=i[c].flat(1/0);n=n.concat(this.walkTokens(l,e))}):i.tokens&&(n=n.concat(this.walkTokens(i.tokens,e)))}}return n}use(...t){const e=this.defaults.extensions||{renderers:{},childTokens:{}};return t.forEach(n=>{const a={...n};if(a.async=this.defaults.async||a.async||!1,n.extensions&&(n.extensions.forEach(r=>{if(!r.name)throw new Error("extension name required");if("renderer"in r){const s=e.renderers[r.name];s?e.renderers[r.name]=function(...i){let c=r.renderer.apply(this,i);return c===!1&&(c=s.apply(this,i)),c}:e.renderers[r.name]=r.renderer}if("tokenizer"in r){if(!r.level||r.level!=="block"&&r.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");const s=e[r.level];s?s.unshift(r.tokenizer):e[r.level]=[r.tokenizer],r.start&&(r.level==="block"?e.startBlock?e.startBlock.push(r.start):e.startBlock=[r.start]:r.level==="inline"&&(e.startInline?e.startInline.push(r.start):e.startInline=[r.start]))}"childTokens"in r&&r.childTokens&&(e.childTokens[r.name]=r.childTokens)}),a.extensions=e),n.renderer){const r=this.defaults.renderer||new Lt(this.defaults);for(const s in n.renderer){if(!(s in r))throw new Error(`renderer '${s}' does not exist`);if(["options","parser"].includes(s))continue;const i=s,c=n.renderer[i],l=r[i];r[i]=(...p)=>{let m=c.apply(r,p);return m===!1&&(m=l.apply(r,p)),m||""}}a.renderer=r}if(n.tokenizer){const r=this.defaults.tokenizer||new Et(this.defaults);for(const s in n.tokenizer){if(!(s in r))throw new Error(`tokenizer '${s}' does not exist`);if(["options","rules","lexer"].includes(s))continue;const i=s,c=n.tokenizer[i],l=r[i];r[i]=(...p)=>{let m=c.apply(r,p);return m===!1&&(m=l.apply(r,p)),m}}a.tokenizer=r}if(n.hooks){const r=this.defaults.hooks||new bt;for(const s in n.hooks){if(!(s in r))throw new Error(`hook '${s}' does not exist`);if(["options","block"].includes(s))continue;const i=s,c=n.hooks[i],l=r[i];bt.passThroughHooks.has(s)?r[i]=p=>{if(this.defaults.async)return Promise.resolve(c.call(r,p)).then(d=>l.call(r,d));const m=c.call(r,p);return l.call(r,m)}:r[i]=(...p)=>{let m=c.apply(r,p);return m===!1&&(m=l.apply(r,p)),m}}a.hooks=r}if(n.walkTokens){const r=this.defaults.walkTokens,s=n.walkTokens;a.walkTokens=function(i){let c=[];return c.push(s.call(this,i)),r&&(c=c.concat(r.call(this,i))),c}}this.defaults={...this.defaults,...a}}),this}setOptions(t){return this.defaults={...this.defaults,...t},this}lexer(t,e){return P.lex(t,e??this.defaults)}parser(t,e){return q.parse(t,e??this.defaults)}parseMarkdown(t){return(n,a)=>{const r={...a},s={...this.defaults,...r},i=this.onError(!!s.silent,!!s.async);if(this.defaults.async===!0&&r.async===!1)return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof n>"u"||n===null)return i(new Error("marked(): input parameter is undefined or null"));if(typeof n!="string")return i(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(n)+", string expected"));s.hooks&&(s.hooks.options=s,s.hooks.block=t);const c=s.hooks?s.hooks.provideLexer():t?P.lex:P.lexInline,l=s.hooks?s.hooks.provideParser():t?q.parse:q.parseInline;if(s.async)return Promise.resolve(s.hooks?s.hooks.preprocess(n):n).then(p=>c(p,s)).then(p=>s.hooks?s.hooks.processAllTokens(p):p).then(p=>s.walkTokens?Promise.all(this.walkTokens(p,s.walkTokens)).then(()=>p):p).then(p=>l(p,s)).then(p=>s.hooks?s.hooks.postprocess(p):p).catch(i);try{s.hooks&&(n=s.hooks.preprocess(n));let p=c(n,s);s.hooks&&(p=s.hooks.processAllTokens(p)),s.walkTokens&&this.walkTokens(p,s.walkTokens);let m=l(p,s);return s.hooks&&(m=s.hooks.postprocess(m)),m}catch(p){return i(p)}}}onError(t,e){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,t){const a="<p>An error occurred:</p><pre>"+Z(n.message+"",!0)+"</pre>";return e?Promise.resolve(a):a}if(e)return Promise.reject(n);throw n}}}const nt=new Qn;function y(o,t){return nt.parse(o,t)}y.options=y.setOptions=function(o){return nt.setOptions(o),y.defaults=nt.defaults,ke(y.defaults),y},y.getDefaults=Zt,y.defaults=et,y.use=function(...o){return nt.use(...o),y.defaults=nt.defaults,ke(y.defaults),y},y.walkTokens=function(o,t){return nt.walkTokens(o,t)},y.parseInline=nt.parseInline,y.Parser=q,y.parser=q.parse,y.Renderer=Lt,y.TextRenderer=ne,y.Lexer=P,y.lexer=P.lex,y.Tokenizer=Et,y.Hooks=bt,y.parse=y,y.options,y.setOptions,y.use,y.walkTokens,y.parseInline,q.parse,P.lex;function Vn(o){for(;o;){if(o.classList.contains("monaco-editor"))return!0;o=o.parentElement}return!1}function Jn(o){var t;for(;o;){const e=o;if((t=e._modelData)!=null&&t.model){const n={getModel:()=>e._modelData.model,getSelection:()=>{var a;return((a=e._modelData.cursor)==null?void 0:a.getSelection())||null},getValueInRange:a=>e._modelData.model.getValueInRange(a),_domElement:o,_modelData:e._modelData,_instance:e};return window.__BLACKBOX_MONACO_EDITOR__=n,n}o=o.parentElement}return null}function Kn(o){const t=o.getSelection();if(!t||!o._domElement)return null;const e=o._domElement.querySelectorAll(".view-line"),n=e[t.startLineNumber-1],a=e[t.endLineNumber-1];if(!n||!a)return null;const r=n.getBoundingClientRect(),s=a.getBoundingClientRect();return new DOMRect(r.left,r.top,s.right-r.left,s.bottom-r.top)}function to(o){const t=()=>{const e=Jn(o);if(!e)return;const n=e.getSelection();if(!n)return;const a=e.getValueInRange(n);if(!a)return;const r=Kn(e);if(!r)return;const s=new CustomEvent("monacoSelectionChange",{detail:{text:a,rect:{left:r.left+window.scrollX,top:r.top+window.scrollY,width:r.width,height:r.height},isMonacoEditor:!0,editor:e}});document.dispatchEvent(s)};o.addEventListener("mouseup",()=>{setTimeout(t,0)}),o.addEventListener("keyup",e=>{const n=e;(n.key==="Shift"||n.key==="ArrowLeft"||n.key==="ArrowRight")&&setTimeout(t,0)})}function eo(){return window.__BLACKBOX_MONACO_EDITOR__}window.getCurrentMonacoEditor=eo;function no(o){for(;o;){if(o.classList.contains("CodeMirror"))return!0;o=o.parentElement}return!1}function oo(o){for(;o;){const t=o.CodeMirror;if(t)return t;o=o.parentElement}return null}function io(o){o.getWrapperElement();const t=window.getSelection();return!t||t.rangeCount===0?null:t.getRangeAt(0).getBoundingClientRect()}function ro(o){const t=()=>{const e=oo(o);if(!e)return;const n=e.getSelection();if(!n)return;const a=io(e);if(!a)return;const r=new CustomEvent("codemirrorSelectionChange",{detail:{text:n,rect:{left:a.left+window.scrollX,top:a.top+window.scrollY,width:a.width,height:a.height},isCodeMirrorEditor:!0,editor:e}});document.dispatchEvent(r)};o.addEventListener("mouseup",()=>{setTimeout(t,0)}),o.addEventListener("keyup",e=>{const n=e;(n.key==="Shift"||n.key==="ArrowLeft"||n.key==="ArrowRight")&&setTimeout(t,0)})}var Tt=(o=>(o.Local="local",o.Sync="sync",o.Managed="managed",o.Session="session",o))(Tt||{}),qe=(o=>(o.ExtensionPagesOnly="TRUSTED_CONTEXTS",o.ExtensionPagesAndContentScripts="TRUSTED_AND_UNTRUSTED_CONTEXTS",o))(qe||{});const _=globalThis.chrome;async function Oe(o,t){function e(a){return typeof a=="function"}function n(a){return a instanceof Promise}return e(o)?(n(o),o(t)):o}let Ne=!1;function He(o){if(_&&_.storage[o]===void 0)throw new Error(`Check your storage permission in manifest.json: ${o} is not defined`)}function ao(o,t,e){var u,v;let n=null,a=!1,r=[];const s=(e==null?void 0:e.storageEnum)??Tt.Local,i=((u=e==null?void 0:e.serialization)==null?void 0:u.serialize)??(f=>f),c=((v=e==null?void 0:e.serialization)==null?void 0:v.deserialize)??(f=>f);Ne===!1&&s===Tt.Session&&(e==null?void 0:e.sessionAccessForContentScripts)===!0&&(He(s),_==null||_.storage[s].setAccessLevel({accessLevel:qe.ExtensionPagesAndContentScripts}).catch(f=>{console.warn(f),console.warn("Please call setAccessLevel into different context, like a background script.")}),Ne=!0);const l=async()=>{He(s);const f=await(_==null?void 0:_.storage[s].get([o]));return f?c(f[o])??t:t},p=()=>{r.forEach(f=>f())},m=async f=>{a||(n=await l()),n=await Oe(f,n),await(_==null?void 0:_.storage[s].set({[o]:i(n)})),p()},d=f=>(r=[...r,f],()=>{r=r.filter(A=>A!==f)}),h=()=>n;l().then(f=>{n=f,a=!0,p()});async function g(f){if(f[o]===void 0)return;const A=c(f[o].newValue);n!==A&&(n=await Oe(A,n),p())}return _==null||_.storage[s].onChanged.addListener(g),{get:l,set:m,getSnapshot:h,subscribe:d}}const Rt=ao("user-id-key",void 0,{storageEnum:Tt.Local}),so={...Rt,reset:async()=>{await Rt.set(fe())},generate:async()=>{await Rt.get()||await Rt.set(fe())}};let W=null,C;const lo=[{icon:"↻",text:"Explain"},{icon:"✓",text:"Summarize"},{icon:"⟂",text:"Translate"},{icon:"≡",text:"Make it longer"}],co=[{icon:"↻",text:"Optimize code"},{icon:"✓",text:"Refactor code"},{icon:"⟂",text:"Explain code"},{icon:"≡",text:"Debug code"}],po=o=>{var n;const t=o.querySelector(".ace_text-input");if(!t)return;t.addEventListener("select",a=>{console.log("select of toltip");const r=a.target,s=r.value.substring(r.selectionStart,r.selectionEnd),i=r.getBoundingClientRect(),c={left:i.left+r.selectionStart/r.value.length*i.width,top:i.top,width:(r.selectionEnd-r.selectionStart)/r.value.length*i.width,height:i.height};W={target:r,text:s,rect:c},s.trim()!==""?(C.style.left=`${c.left+c.width/2}px`,C.style.top=`${c.top-60}px`,C.style.transform="translateX(-50%)",C.classList.add("show")):C.classList.remove("show")}),["mouseup","keyup"].forEach(a=>{t.addEventListener(a,r=>{const s=r.target;s.selectionStart!==s.selectionEnd&&t.dispatchEvent(new Event("select"))})});const e=(n=window.ace)==null?void 0:n.edit(o);console.log({aceEditor:e}),e&&e.on("aceSelectionChange",()=>{console.log("changeSelection");const a=e.getSelection();if(!a)return;const r=e.session.getTextRange(a.getRange());if(!r)return;const s=a.getRange(),i=e.renderer.textToScreenCoordinates(s.start.row,s.start.column),c=e.renderer.textToScreenCoordinates(s.end.row,s.end.column),l={left:Math.min(i.pageX,c.pageX),top:Math.min(i.pageY,c.pageY),width:Math.abs(c.pageX-i.pageX),height:Math.abs(c.pageY-i.pageY)};document.dispatchEvent(new CustomEvent("aceSelectionChange",{detail:{text:r,rect:l}}))})},De=o=>{try{if(!o||o.length<3)return!1;const t=[/\b(function|class|interface|enum|namespace|module|import|export|require|from|package|using)\b/,/\b(const|let|var|val|def|dim|public|private|protected|static|final|void)\b/,/\b(if|else|for|while|do|switch|case|break|continue|return|try|catch|throw|throws|finally)\b/,/\b(async|await|yield|extends|implements|instanceof|typeof|new|this|super)\b/,/(const|let|var|val|def|dim)\s+[\w$]+\s*[=:]/,/^[\w$]+\s*[=:]\s*(?:function|\(.*\)\s*=>|\{|\[|"|'|`|\d+|true|false|null|undefined)/m,/(?:^|\s)(?:function\s+[\w$]+\s*\(|\(.*\)\s*(?:=>|{))/m,/\b\w+\s*\([^)]*\)\s*{/,/\{[\s\S]*?:\s*[\s\S]*?\}/,/\[[^\]]*\]\s*(?:[=;]|(?:\s*\.\s*\w+))/,/\b(true|false|null|undefined|None|nil|NULL|TRUE|FALSE)\b/,/(?:[\w$]+\.)+[\w$]+\s*\(/,/(?:\/\/|\/\*|\*\/|#).*/,/[;{}()][\s\S]*[;{}()]/,/\b\d+\.\d*[fFdD]?\b/,/(?:<<|>>|&&|\|\||===|!==|\+=|-=|\*=|\/=)/,/(?:@[\w]+|#[\w]+)/,/\b(?:int|string|bool|float|double|char|byte|long|short)\b/,/(?:`[^`]*`|\$\{[^}]+\})/,/(?:SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s+(?:FROM|INTO|TABLE|DATABASE)/i,/^[ \t]*def\s+\w+\s*\([^)]*\):/m,/^\s*@\w+\s*$/m],e=m=>{const d=m.split(/\s+/).filter(f=>f.length>0),h=d.reduce((f,A)=>f+A.length,0)/d.length,g=/[A-Z][^!?.]+ ?[.!?]/.test(m),u=(m.match(/[.,!?;]/g)||[]).length/m.length,v=(m.match(/[{}()\[\]+\-*/%=<>]/g)||[]).length/m.length;return{wordCount:d.length,avgWordLength:h,hasProperSentenceStructure:g,punctuationDensity:u,symbolDensity:v,containsURL:/https?:\/\/[^\s]+/.test(m),containsEmail:/\S+@\S+\.\S+/.test(m),hasNaturalLanguage:[/\b(the|and|or|but|because|therefore|however|in|on|at|to|for|with|by|over|under|about|into|through|after|before|between|during|without|within|among|around|behind|beside|from)\b/i,/\b(this|that|these|those|here|there|where|when|why|how|what|who|which|whom|whose|any|many|few|several|some|all|both|each|every|other|another|such|same|different|next|last|much|more|most|own|while)\b/i].every(f=>f.test(m)),hasMarketingLanguage:/\b(free|now|best|most|popular|trusted|expert|master|complete|enroll|learn|course|skill|experience|package|student|over)\b/i.test(m),hasHumanNumbers:/\b(one|two|three|hundred|thousand|million|billion|\d{1,3}(?:[,\.]\d{2,3})*(?:\.\d+)?[k+]?)\b/i.test(m)}},n=[/<[a-zA-Z][^>]*>[\s\S]*<\/[a-zA-Z][^>]*>/m,/<[^>]+\s+(?:class|id|style|type|name|value|href|src|action|method)=["'][^"']*["']/m,/<form\b[^>]*>[\s\S]*<\/form>/i,/<input\b[^>]*>/i,/<label\b[^>]*>[\s\S]*<\/label>/i,/<select\b[^>]*>[\s\S]*<\/select>/i,/<textarea\b[^>]*>[\s\S]*<\/textarea>/i,/<(?:div|span|p)\b[^>]*>[\s\S]*<\/(?:div|span|p)>/i,/<(?:img|br|hr|input|link|meta|source)\b[^>]*\/?>/i,/<(?:header|footer|nav|main|article|section|aside)\b[^>]*>[\s\S]*<\/(?:header|footer|nav|main|article|section|aside)>/i,/\s+(?:class|id|style|type|name|value|href|src|action|method|for|placeholder|required|disabled|readonly|autofocus)=["'][^"']*["']/i],a=[/^[ \t]+\S+.*\n[ \t]+\S+/m,/(?:^|\s);.+;|[{][^}]+[}]|^\s*[\[\({].*[\]\)}]\s*$/m,/\b\w+\([^)]+\)\s*[{;]|new\s+\w+\(/,/(const|let|var|val|def)\s+\w+\s*=/g,/^(if|for|while|switch|try|catch|class|function)\s*\([^)]*\)\s*{/m],r=n.some(m=>m.test(o));if(r)return!0;const s=t.reduce((m,d)=>m+(d.test(o)?1:0),0),i=e(o),c=i.hasNaturalLanguage&&i.wordCount>6||i.hasProperSentenceStructure&&i.punctuationDensity<.15||i.hasMarketingLanguage&&i.hasHumanNumbers||i.symbolDensity<.05&&i.avgWordLength>3.5||i.wordCount>10&&i.hasProperSentenceStructure,l=a.some(m=>m.test(o)),p=o.split(`
`).some(m=>/^[ \t]*[{}()\[\];]/.test(m)||/^[ \t]*(if|for|while|function|class|try|catch)\b/.test(m)||/^[ \t]*<[a-zA-Z][^>]*>/.test(m));return r?!0:c&&!l&&!r?!1:!!(l&&s>=2||i.symbolDensity>.15||s>=3&&p)}catch(t){return console.error("Error in isCode function:",t),!1}},mo=()=>{if(document.querySelector("#bbai-menu-wrapper")){const t=window.getSelection();if(t&&N){t.removeAllRanges();const e=N.cloneRange();t.addRange(e)}}},Fe=o=>["BUTTON","A","INPUT","SELECT","TEXTAREA"].includes(o.tagName)||o.hasAttribute("onclick")||o.hasAttribute("role"),uo=o=>{var t;return(o==null?void 0:o.type)==="textarea"||(o==null?void 0:o.type)==="text"||((t=o==null?void 0:o.classList)==null?void 0:t.contains("ace_text-input"))};let oe="",st=null,Q=0,zt=0,N,$t=!1;const ie=()=>{var t;const o=document.querySelector("#bbai-menu-wrapper");return!!((t=o==null?void 0:o.shadowRoot)!=null&&t.querySelector(".bbai-menu-popup"))},gt=()=>{var t;const o=document.querySelector("#bbai-shadow-wrapper");return!!((t=o==null?void 0:o.shadowRoot)!=null&&t.querySelector(".bbai-tooltip-content"))},ho=()=>{const o=window.getSelection();o&&o.rangeCount>0&&(st=o,o.getRangeAt(0),oe=o.toString().trim())};document.addEventListener("selectionchange",ho);const At="blackbox-selection",It=()=>{try{const o=sessionStorage.getItem(At);return o?JSON.parse(o):null}catch(o){return console.error("Error restoring selection:",o),null}},Xe=()=>{var t,e;sessionStorage.removeItem(At),Ye(),console.log("Cleared stored selection");const o=(e=(t=document.querySelector("#bbai-shadow-wrapper"))==null?void 0:t.shadowRoot)==null?void 0:e.querySelector(".bbai-tooltip");o&&o.classList.remove("show")};document.addEventListener("selectionchange",()=>{st=window.getSelection(),st&&st.rangeCount>0&&(st.getRangeAt(0),oe=st.toString().trim())});const re=()=>{const o=document.querySelector("#bbai-menu-wrapper");o!=null&&o.shadowRoot&&o.shadowRoot.addEventListener("click",t=>{var n;const e=t.target;if(e&&e.className==="bbai-copy-button-code"){t.preventDefault(),t.stopPropagation();const a=e.dataset.codeId,r=(n=o.shadowRoot)==null?void 0:n.querySelector(`#${a}`);if(!r)return;bo(r,e)}})},bo=(o,t)=>{if(!o||!t)return;const e=o.textContent||"",n=document.createElement("textarea");n.value=e,n.style.position="fixed",n.style.opacity="0",document.body.appendChild(n),n.select();try{document.execCommand("copy"),t.textContent="Copied!"}catch(a){console.error("Failed to copy:",a),t.textContent="Failed!"}document.body.removeChild(n),setTimeout(()=>{t.textContent="Copy"},2e3)},Ue=(o,t,e)=>{const n=t.querySelector(".bbai-copy-button-code");n&&n.remove();const a=document.createElement("button");a.className="bbai-copy-button-code",a.id=`copy-button-${e}`,a.dataset.codeId=o.id||`code-block-${e}`,a.textContent="Copy",o.id||(o.id=`code-block-${e}`),t.appendChild(a),re()};re();const go=o=>o.replace(/```[\s\S]*?```/g,"").replace(/`([^`]+)`/g,"$1").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/\*([^*]+)\*/g,"$1").replace(/\[([^\]]+)\]\([^\)]+\)/g,"$1").replace(/#{1,6}\s+/g,"").replace(/^\s*[-*+]\s+/gm,"").replace(/^\s*\d+\.\s+/gm,"").trim(),ae=o=>{var t;try{const e=((t=window.DOMPurify)==null?void 0:t.sanitize)||(i=>i),n=y(o),a=e(n),r=document.createElement("div");r.innerHTML=a;let s=0;return r.querySelectorAll("pre code").forEach(i=>{const c=i.parentElement;if(!c)return;const l=`code-block-${s}`;i.id=l;const p=Array.from(i.classList).find(d=>d.startsWith("language-")),m=p?p.replace("language-",""):"";m&&c.setAttribute("data-language",m),Ue(i,c,s),s++}),r.innerHTML}catch(e){return console.error("Error parsing markdown:",e),o}};function fo(){let o=document.getElementById("bbai-shadow-wrapper");if(!o){o=document.createElement("div"),o.id="bbai-shadow-wrapper",document.body.appendChild(o);const t=o.attachShadow({mode:"open"}),e=document.createElement("style");e.textContent=`
      :host {
        all: initial !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
      }
      * {
        box-sizing: border-box !important;
      }
      .bbai-tooltip {
        position: fixed !important;
        z-index: 999999 !important;
        background: white !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
        padding: 8px 12px !important;
        font-size: 13px !important;
        line-height: 1.4 !important;
        color: #1a1a1a !important;
        pointer-events: all !important;
        cursor: pointer !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: translateY(4px) !important;
        transition: all 0.2s ease !important;
      }
      .bbai-tooltip.show {
        opacity: 1 !important;
        visibility: visible !important;
        transform: translateY(0) !important;
      }
      .bbai-tooltip-content {
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        white-space: nowrap !important;
      }
      .bbai-tooltip-content span {
        font-weight: 500 !important;
      }
    `,t.appendChild(e)}return o}function se(){const t=fo().shadowRoot;let e=t.querySelector(".bbai-tooltip");if(!e){const n=`
      <div class="bbai-tooltip">
        <div class="bbai-tooltip-content">
          <svg width="16" height="16" viewBox="0 0 469 469" fill="none" xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            <path
              d="M237.092 62.3004L266.754 71.4198C267.156 71.5285 267.51 71.765 267.765 72.0934C268.02 72.4218 268.161 72.8243 268.166 73.2399C268.172 73.6555 268.042 74.0616 267.796 74.3967C267.55 74.7318 267.201 74.9777 266.803 75.097L237.141 84.3145C236.84 84.4058 236.566 84.5699 236.344 84.7922C236.121 85.0146 235.957 85.2883 235.866 85.5893L226.747 115.252C226.638 115.653 226.401 116.008 226.073 116.263C225.745 116.517 225.342 116.658 224.926 116.664C224.511 116.669 224.105 116.539 223.77 116.293C223.435 116.047 223.189 115.699 223.069 115.301L213.852 85.6383C213.761 85.3374 213.597 85.0636 213.374 84.8412C213.152 84.6189 212.878 84.4548 212.577 84.3635L182.914 75.2441C182.513 75.1354 182.158 74.8989 181.904 74.5705C181.649 74.2421 181.508 73.8396 181.503 73.424C181.497 73.0084 181.627 72.6023 181.873 72.2672C182.119 71.9321 182.467 71.6863 182.865 71.5669L212.528 62.3494C212.829 62.2582 213.103 62.0941 213.325 61.8717C213.547 61.6494 213.712 61.3756 213.803 61.0747L222.922 31.4121C223.031 31.0109 223.267 30.656 223.596 30.4013C223.924 30.1465 224.327 30.0057 224.742 30.0002C225.158 29.9946 225.564 30.1247 225.899 30.3706C226.234 30.6165 226.48 30.9649 226.599 31.363L235.817 61.0257C235.908 61.3266 236.072 61.6003 236.295 61.8227C236.517 62.0451 236.791 62.2091 237.092 62.3004Z"
              fill="currentColor"
            />
            <path
              d="M155.948 155.848L202.771 168.939C203.449 169.131 204.045 169.539 204.47 170.101C204.895 170.663 205.125 171.348 205.125 172.052C205.125 172.757 204.895 173.442 204.47 174.004C204.045 174.566 203.449 174.974 202.771 175.166L155.899 188.06C155.361 188.209 154.87 188.496 154.475 188.891C154.079 189.286 153.793 189.777 153.644 190.316L140.553 237.138C140.361 237.816 139.953 238.413 139.391 238.838C138.829 239.262 138.144 239.492 137.44 239.492C136.735 239.492 136.05 239.262 135.488 238.838C134.927 238.413 134.519 237.816 134.327 237.138L121.432 190.267C121.283 189.728 120.997 189.237 120.601 188.842C120.206 188.446 119.715 188.16 119.177 188.011L72.3537 174.92C71.676 174.728 71.0795 174.32 70.6547 173.759C70.2299 173.197 70 172.512 70 171.807C70 171.103 70.2299 170.418 70.6547 169.856C71.0795 169.294 71.676 168.886 72.3537 168.694L119.226 155.799C119.764 155.65 120.255 155.364 120.65 154.969C121.046 154.573 121.332 154.082 121.481 153.544L134.572 106.721C134.764 106.043 135.172 105.447 135.734 105.022C136.295 104.597 136.981 104.367 137.685 104.367C138.389 104.367 139.075 104.597 139.637 105.022C140.198 105.447 140.606 106.043 140.798 106.721L153.693 153.593C153.842 154.131 154.128 154.622 154.524 155.018C154.919 155.413 155.41 155.699 155.948 155.848Z"
              fill="currentColor"
            />
            <path
              d="M386.827 289.992C404.33 292.149 403.84 305.828 386.876 307.299C346.623 310.829 298.869 316.271 282.199 360.005C274.844 379.192 269.942 403.2 267.49 432.029C267.427 432.846 267.211 433.626 266.856 434.319C266.501 435.012 266.015 435.602 265.431 436.05C254.988 444.041 251.212 434.186 250.183 425.606C239.2 332.353 214.588 316.909 124.668 306.122C123.892 306.031 123.151 305.767 122.504 305.35C121.857 304.933 121.322 304.375 120.942 303.72C116.399 295.679 119.324 291.038 129.718 289.796C224.688 278.47 236.062 262.83 250.183 169.331C252.177 156.355 257.259 154.083 265.431 162.516C266.51 163.593 267.202 165.099 267.392 166.782C279.257 258.564 293.328 278.617 386.827 289.992Z"
              fill="currentColor"
            />
          </svg>
          <span>Ask AI</span>
        </div>
      </div>
    `,a=document.createElement("div");a.innerHTML=n.trim(),e=a.firstChild,t.appendChild(e)}return e}const Ye=()=>{const o=window.getSelection();o&&(o.removeAllRanges(),N=o.getRangeAt(0).cloneRange())};function xo(){C=se(),document.addEventListener("mouseup",t=>{var a,r;const e=window.getSelection();if(!e||e.rangeCount===0)return;let n=e.toString().trim();if(W!=null&&W.text&&(W!=null&&W.target)&&(n=W.text),!!n){if(!ie()&&!gt()&&Ye(),ie()&&gt()){const s=(r=(a=document.querySelector("#bbai-shadow-wrapper"))==null?void 0:a.shadowRoot)==null?void 0:r.querySelector(".bbai-tooltip");if(s){s.classList.remove("show");return}}else se();if(n&&n.length>0&&e){const s=e.getRangeAt(0);N=s.cloneRange();const i=(()=>{let d=s.getBoundingClientRect(),h=s.startContainer.parentElement;for(;h;){const g=h.getRootNode();if(g instanceof ShadowRoot){const u=g.host,v=u.getBoundingClientRect();d=new DOMRect(d.x+v.x,d.y+v.y,d.width,d.height),h=u}else break}return d})(),c=s.cloneContents(),l=[],p=d=>{var h,g;if(d.nodeType===Node.TEXT_NODE&&((h=d.textContent)!=null&&h.trim())){const u=d.parentElement;u&&l.push({textContent:d.textContent.trim(),tagName:u.tagName,isInteractive:Fe(u)})}else if(d.nodeType===Node.ELEMENT_NODE){const u=d;u.childNodes.length===0&&((g=u.textContent)!=null&&g.trim())&&l.push({textContent:u.textContent.trim(),tagName:u.tagName,isInteractive:Fe(u)}),u.childNodes.forEach(p)}};c.childNodes.forEach(p);const m={text:n,rect:{left:i.left+window.scrollX,top:i.top+window.scrollY,width:i.width,height:i.height},elements:l,hasInteractiveElements:l.some(d=>d.isInteractive),elementTypes:[...new Set(l.map(d=>d.tagName))]};if(sessionStorage.setItem(At,JSON.stringify(m)),Vn(t.target)||no(t.target)||uo(t.target)){const d=e.getRangeAt(0);if(d.getBoundingClientRect()&&C){console.log({range:d,tooltip:C,e:t}),C.style.left=`${t.clientX}px`,C.style.top=`${t.clientY}px`,zt=t.clientX,Q=t.clientY,C.style.transform="translateX(-50%)",C.classList.add("show");return}}C.style.left=`${i.left+i.width/2}px`,C.style.top=`${i.top-40}px`,C.style.transform="translateX(-50%)",C.classList.add("show")}else setTimeout(()=>{C.matches(":hover")||C.classList.remove("show")},100)}}),document.addEventListener("mousedown",t=>{const e=t.target;C.contains(e)||C.classList.remove("show")});const o=t=>{var n;const e=document.querySelector(".bbai-menu-popup");e&&!e.contains(t.target)&&(document.removeEventListener("mousedown",o),(n=e.parentNode)==null||n.removeChild(e),Xe())};C.addEventListener("click",async t=>{const e=N.getBoundingClientRect().height;Q=t.clientY+e+40,zt=t.clientX;const n=It(),a=window.getSelection();a&&N&&(a.removeAllRanges(),a.addRange(N.cloneRange())),document.removeEventListener("mousedown",o);const r=document.querySelector("#bbai-menu-wrapper");r&&r.remove();const s=n==null?void 0:n.text;if(s)try{let i=document.querySelector(".bbai-menu-popup");if(!i){const c=De(s)?co:lo,l=`
            <div class="bbai-menu-popup">
              <div class="bbai-search-container">
                <div class="bbai-search-input-wrapper">
                  <span class="bbai-search-icon-left">⌕</span>
                  <input type="text" 
                    placeholder="Ask AI to edit or generate..." 
                    class="bbai-search-input"
                    title="Examples: 'translate to Spanish', 'explain this code', 'write a test case', 'convert to bullet points'"
                  >
                  <span class="bbai-search-icon">↑</span>
                </div>
                
              </div>
              <div class="bbai-menu-content">
                ${c.map(b=>`
                  <div class="bbai-menu-item" data-action="${b.text.toLowerCase()}">
                    <span data-icon="${b.icon}">${b.text}</span>
                  </div>
                `).join("")}
                
              </div>
            </div>
          `;if(!document.getElementById("menu-styles")){const b=document.createElement("style");b.id="menu-styles",b.textContent=`
              .bbai-menu-popup {
                position: fixed;
                z-index: 999999;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                width: min(250px, calc(100vw - 32px));
                opacity: 0;
                visibility: hidden;
                overflow: hidden;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                          top 0.2s ease-out,
                          max-height 0.2s ease-out;
                transform-origin: top center;
                margin: 0;
                display: flex;
                flex-direction: column;
                min-height: fit-content;
                border: none;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                transform: translate(0, -10px) scale(0.95);
                will-change: transform, top, max-height;
                pointer-events: none;
              }
              .bbai-menu-popup.show {
                opacity: 1;
                visibility: visible;
                transform: translate(0, 0) scale(1);
                pointer-events: all;
              }
              .bbai-menu-popup > * {
                overflow: hidden;
                border-radius: 8px;
              }
              .bbai-menu-popup.has-result {
                width: clamp(280px, 90vw, 400px);
                max-height: 80vh;
                overflow: hidden;
                overscroll-behavior: contain;
                display: flex;
                flex-direction: column;
              }

              .bbai-menu-popup.has-result .bbai-result-container {
                overflow: hidden;
                display: flex;
                flex-direction: column;
                height: 100%;
              }

              .bbai-menu-popup.has-result .bbai-result-content {
                flex: 1;
                overflow-y: auto;
                max-height: 400px;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent !important;
                scrollbar-width: thin;
              }

              /* Common scrollbar styles */
              .bbai-menu-popup.has-result .bbai-result-content::-webkit-scrollbar,
              .bbai-stream-content::-webkit-scrollbar {
                width: 6px;
              }
              
              .bbai-menu-popup.has-result .bbai-result-content::-webkit-scrollbar-track,
              .bbai-stream-content::-webkit-scrollbar-track {
                background: transparent;
              }
              
              .bbai-menu-popup.has-result .bbai-result-content::-webkit-scrollbar-thumb,
              .bbai-stream-content::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
              }
              .bbai-menu-popup.show {
                opacity: 1;
                visibility: visible;
                transform: translate(0, 0) scale(1);
              }
              .bbai-search-container {
                padding: 8px 12px !important;
                border-bottom: 1px solid #eee!important;
                display: flex!important;
                flex-direction: column!important;
                gap: 8px !important;
                position: relative !important;
              }
              .bbai-search-input-wrapper {
                display: flex!important;
                align-items: center!important;
                gap: 8px!important;
                position: relative!important;
              }
              .bbai-search-icon-left {
                position: absolute!important;
                left: 8px!important;
                color: #666!important;
                font-size: 24px!important;
                pointer-events: none!important;
                line-height: 1!important;
              }
              .bbai-search-input {
                flex: 1 !important;
                border: none!important;
                outline: none !important;
                font-size: 13px !important;
                color: #1a1a1a !important;
                padding: 6px 6px 6px 32px !important;
                background: transparent !important;
                margin: 0 !important;
                max-height: 31.5px !important;
                font-weight: 400 !important;
                position: static !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                min-height: unset !important;
                line-height: normal !important;
              }
              .bbai-search-input::placeholder {
                color: #666 !important;
                opacity: 1 !important;
              }
              .bbai-search-icon {
                font-size: 14px !important;
                width: 30px !important;
                height: 30px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: #000 !important;
                color: white !important;
                border-radius: 50% !important;
                margin-right: 4px !important;
                border: none !important;
                cursor: pointer !important;
                transition: background-color 0.2s !important;
                padding: 0 !important;
                min-width: unset !important;
                min-height: unset !important;
                line-height: 1 !important;
                box-shadow: none !important;
              }
              .bbai-search-icon:hover {
                background-color: #333 !important;
              }
              .bbai-search-input:focus ~ .bbai-search-suggestions {
                display: block !important;
              }
              .bbai-suggestion-item {
                padding: 8px 12px !important;
                font-size: 13px !important;
                color: #1a1a1a !important;
                cursor: pointer !important;
                transition: background-color 0.15s ease !important;
                background: white !important;
                border: none !important;
                margin: 0 !important;
                text-align: left !important;
                width: 100% !important;
                line-height: normal !important;
              }
              .bbai-suggestion-item:hover {
                background-color: #f5f5f5 !important;
              }
              .bbai-menu-popup {
                transform-origin: center bottom;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                          opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                          top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              }
              .bbai-menu-popup.menu-above {
                transform-origin: center bottom !important;
                transform: translate(0, 10px) scale(0.95) !important;
              }
              .bbai-menu-popup.menu-above.show {
                transform: translate(0, 0) scale(1) !important;
              }
              .bbai-menu-popup.menu-below {
                transform-origin: center top !important;
                transform: translate(0, -10px) scale(0.95) !important;
                z-index: 2147483647 !important;
              }
              .bbai-menu-popup.menu-below.show {
                transform: translate(0, 0) scale(1) !important;
              }
              .bbai-menu-popup.transitioning {
                transition: top 0.2s ease-out !important;
              }
              .bbai-menu-content {
                position: relative !important;
                background: white !important;
                display: flex !important;
                flex-direction: column !important;
                z-index: 2147483647 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                font-size: 13px !important;
                color: #1a1a1a !important;
              }
              .bbai-menu-item {
                padding: 8px 16px !important;
                display: flex !important;
                align-items: center !important;
                gap: 12px !important;
                cursor: pointer !important;
                transition: background-color 0.15s ease !important;
                user-select: none !important;
                width: 100% !important;
                margin: 0 !important;
                border: none !important;
                background: none !important;
                text-align: left !important;
              }
              .bbai-menu-item:hover {
                background-color: #f5f5f5 !important;
              }
              .bbai-menu-item span {
                font-size: 13px !important;
                color: #1a1a1a !important;
                font-weight: 400 !important;
                line-height: 1.4 !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              }
              .bbai-menu-item span::before {
                content: attr(data-icon) !important;
                font-size: 16px !important;
                color: #666 !important;
                width: 16px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                background: none !important;
              }
              .bbai-menu-footer {
                padding: 8px 16px !important;
                border-top: 1px solid #eee !important;
                color: #666 !important;
                font-size: 12px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                background: white !important;
              }
            `,document.head.appendChild(b)}const p=document.createElement("div");p.id="bbai-menu-wrapper",p.style.cssText="position: fixed; z-index: 999999;",document.body.appendChild(p);const m=p.attachShadow({mode:"open"}),d=document.createElement("style");d.textContent=`
            :host {
              all: initial !important;
              display: block !important;
              position: fixed !important;
              z-index: 999999 !important;
              pointer-events: none !important;
              width: 100% !important;
              height: 100% !important;
              top: 0 !important;
              left: 0 !important;
            }
            * {
              box-sizing: border-box !important;
            }
            .bbai-menu-popup {
              position: fixed !important;
              z-index: 999999 !important;
              background: white !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
              width: min(250px, calc(100vw - 32px)) !important;
              opacity: 0 !important;
              visibility: hidden !important;
              overflow: hidden !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              pointer-events: none !important;
              user-select: none !important;
              transform: translate(0, -10px) scale(0.95) !important;
              will-change: transform, top, max-height !important;
              margin-left: 0 !important;
              margin-top: 0 !important;
            }
            .bbai-drag-handle {
              width: 100% !important;
              height: 24px !important;
              cursor: grab !important;
              position: relative !important;
              background: transparent !important;
              border-top-left-radius: 8px !important;
              border-top-right-radius: 8px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              pointer-events: auto !important;
              margin-bottom: -24px !important;
              z-index: 1 !important;
            }
            .bbai-drag-handle::after {
              content: '' !important;
              width: 40px !important;
              height: 4px !important;
              background: #e5e5e5 !important;
              border-radius: 2px !important;
            }
            .bbai-drag-handle:active {
              cursor: grabbing !important;
            }
            .bbai-menu-popup.dragging {
              transition: none !important;
              cursor: grabbing !important;
            }
              .bbai-drag-handle {
                width: 100% !important;
                height: 24px !important;
                cursor: grab !important;
                position: relative !important;
                background: transparent !important;
                border-top-left-radius: 8px !important;
                border-top-right-radius: 8px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                pointer-events: auto !important;
              }
              .bbai-drag-handle::after {
                content: '' !important;
                width: 40px !important;
                height: 4px !important;
                background: #e5e5e5 !important;
                border-radius: 2px !important;
              }
              .bbai-drag-handle:active {
                cursor: grabbing !important;
              }
              .bbai-menu-popup.dragging {
                transition: none !important;
                cursor: grabbing !important;
            }
            .bbai-menu-popup.show {
              pointer-events: auto !important;
            }
            /* Enable pointer events only on interactive elements */
            .bbai-menu-popup .bbai-search-input,
            .bbai-menu-popup .bbai-search-icon,
            .bbai-menu-popup .bbai-menu-item,
            .bbai-menu-popup .bbai-back-button,
            .bbai-menu-popup .bbai-copy-button,
            .bbai-menu-popup .bbai-copy-button-code {
              pointer-events: auto !important;
            }
            .bbai-menu-popup.show {
              opacity: 1 !important;
              visibility: visible !important;
              transform: translate(0, 0) scale(1) !important;
            }
            .bbai-menu-popup.menu-above {
              transform-origin: center bottom !important;
              transform: translate(0, 10px) scale(0.95) !important;
            }
            .bbai-menu-popup.menu-above.show {
              transform: translate(0, 0) scale(1) !important;
            }
            .bbai-menu-popup.menu-below {
              transform-origin: center top !important;
              transform: translate(0, -10px) scale(0.95) !important;
            }
            .bbai-menu-popup.menu-below.show {
              transform: translate(0, 0) scale(1) !important;
            }
            .bbai-menu-popup.transitioning {
              transition: top 0.2s ease-out !important;
            }
            .bbai-menu-popup.has-result {
              width: clamp(280px, 90vw, 400px) !important;
              max-height: 80vh !important;
              overflow: hidden !important;
              overscroll-behavior: contain !important;
              display: flex !important;
              flex-direction: column !important;
            }
            .bbai-menu-content {
              position: relative !important;
              background: white !important;
              display: flex !important;
              flex-direction: column !important;
              font-size: 13px !important;
              color: #1a1a1a !important;
            }
            .bbai-menu-item {
              padding: 8px 16px !important;
              display: flex !important;
              align-items: center !important;
              gap: 12px !important;
              cursor: pointer !important;
              transition: background-color 0.15s ease !important;
              user-select: none !important;
              width: 100% !important;
              margin: 0 !important;
              border: none !important;
              background: none !important;
              text-align: left !important;
            }
            .bbai-menu-item:hover {
              background-color: #f5f5f5 !important;
            }
            .bbai-menu-item span {
              font-size: 13px !important;
              color: #1a1a1a !important;
              font-weight: 400 !important;
              line-height: 1.4 !important;
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
            }
            .bbai-menu-item span::before {
              content: attr(data-icon) !important;
              font-size: 16px !important;
              color: #666 !important;
              width: 16px !important;
              display: inline-flex !important;
              align-items: center !important;
              justify-content: center !important;
              background: none !important;
            }
            .bbai-search-container {
              padding: 8px 12px !important;
              border-bottom: 1px solid #eee !important;
              display: flex !important;
              flex-direction: column !important;
              gap: 8px !important;
              position: relative !important;
            }
            .bbai-search-input-wrapper {
              margin-top: 5px !important;
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
              position: relative !important;
            }
            .bbai-search-icon-left {
              position: absolute !important;
              left: 8px !important;
              color: #666 !important;
              font-size: 24px !important;
              pointer-events: none !important;
              line-height: 1 !important;
            }
            .bbai-search-input {
              flex: 1 !important;
              border: none !important;
              outline: none !important;
              font-size: 13px !important;
              color: #1a1a1a !important;
              padding: 6px 6px 6px 32px !important;
              background: transparent !important;
              margin: 0 !important;
              max-height: 31.5px !important;
              font-weight: 400 !important;
              position: static !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              min-height: unset !important;
              line-height: normal !important;
            }
            .bbai-search-input::placeholder {
              color: #666 !important;
              opacity: 1 !important;
            }
            .bbai-search-icon {
              font-size: 14px !important;
              width: 30px !important;
              height: 30px !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              background: #000 !important;
              color: white !important;
              border-radius: 50% !important;
              margin-right: 4px !important;
              border: none !important;
              cursor: pointer !important;
              transition: background-color 0.2s !important;
              padding: 0 !important;
              min-width: unset !important;
              min-height: unset !important;
              line-height: 1 !important;
              box-shadow: none !important;
            }
            .bbai-search-icon:hover {
              background-color: #333 !important;
            }
            .bbai-result-container {
              padding: 0 !important;
              width: 100% !important;
              max-width: 400px !important;
              margin: 0 auto !important;
              background: white !important;
              position: relative !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              box-sizing: border-box !important;
              border: none !important;
              border-radius: 8px !important;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
            }
            .bbai-result-header {
              padding: 12px 16px !important;
              border-bottom: 1px solid #eee !important;
              font-weight: 500 !important;
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
              white-space: nowrap !important;
              overflow: hidden !important;
              color: #24292E !important;
              font-size: 16px !important;
              background: white !important;
              margin: 0 !important;
              border-radius: 8px 8px 0 0 !important;
            }
            .bbai-result-header span {
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              flex: 1 !important;
              color: #24292E !important;
              font-size: 16px !important;
              font-weight: 500 !important;
            }
            .bbai-back-button {
              border: none !important;
              background: none !important;
              padding: 4px 8px !important;
              cursor: pointer !important;
              font-size: 16px !important;
              color: #666 !important;
              border-radius: 4px !important;
              transition: all 0.15s ease !important;
              margin: 0 !important;
            }
            .bbai-back-button:hover {
              background: #f5f5f5 !important;
              transform: translateX(-2px) !important;
            }
            .bbai-result-content {
              font-size: 13px !important;
              line-height: 1.5 !important;
              max-height: 400px !important;
              overflow-y: auto !important;
              width: 100% !important;
              scrollbar-color: rgba(0, 0, 0, 0.2) transparent !important;
              scrollbar-width: thin !important;
              transition: max-height 0.2s ease-out !important;
              will-change: max-height !important;
              padding-right: 4px !important;
              overscroll-behavior: contain !important;
              background: white !important;
              border-radius: 0 0 8px 8px !important;
            }
            .bbai-result-content::-webkit-scrollbar {
              width: 6px !important;
              height: 6px !important;
            }
            .bbai-result-content::-webkit-scrollbar-track {
              background: transparent !important;
              border-radius: 3px !important;
            }
            .bbai-result-content::-webkit-scrollbar-thumb {
              background-color: rgba(0, 0, 0, 0.2) !important;
              border-radius: 3px !important;
              border: none !important;
            }
            .bbai-result-content::-webkit-scrollbar-corner {
              background: transparent !important;
            }
            .bbai-improved-text {
              margin-bottom: 16px !important;
              padding: 12px !important;
              background: white !important;
              color: #24292E !important;
              font-size: 13px !important;
              line-height: 1.5 !important;
            }
            .bbai-copy-button {
              width: -webkit-fill-available !important;
              padding: 8px !important;
              background: #f5f5f5 !important;
              border: none !important;
              border-radius: 4px !important;
              cursor: pointer !important;
              color: #333 !important;
              font-size: 13px !important;
              transition: all 0.15s ease !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              gap: 6px !important;
              margin: 0 14px 14px 14px !important;
              font-weight: 400 !important;
              min-height: fit-content !important;
            }
            .bbai-copy-button:hover {
              background: #e5e5e5 !important;
              transform: translateY(-1px) !important;
            }
            .bbai-stream-content {
              min-height: 20px !important;
              opacity: 0 !important;
              transition: opacity 0.2s ease !important;
              height: auto !important;
              overflow: visible !important;
            }
            .bbai-stream-content.visible {
              opacity: 1 !important;
            }
            .bbai-stream-dot {
              display: inline !important;
              font-size: 14px !important;
              color: #666 !important;
              animation: blink 1s infinite !important;
              position: relative !important;
            }
            @keyframes blink {
              0%, 100% { opacity: 0 !important; }
              50% { opacity: 1 !important; }
            }
            .bbai-markdown-body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              line-height: 1.6 !important;
              color: #24292e !important;
            }
            .bbai-markdown-body pre {
              position: relative !important;
              padding: 0 !important;
              margin: 16px 0 !important;
              overflow: hidden !important;
              background-color: #1e1e1e !important;
              border-radius: 8px !important;
            }
            .bbai-markdown-body pre::before {
              content: attr(data-language) !important;
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              padding: 8px 16px !important;
              background-color: #2d2d2d !important;
              color: #e0e0e0 !important;
              font-size: 12px !important;
              font-weight: 500 !important;
              border-bottom: 1px solid #3d3d3d !important;
              min-height: 13px !important;
            }
            .bbai-markdown-body pre code {
              display: block !important;
              padding: 16px !important;
              padding-top: 40px !important;
              margin: 0 !important;
              background-color: transparent !important;
              color: #e0e0e0 !important;
              font-size: 14px !important;
              line-height: 1.5 !important;
              overflow-x: auto !important;
              font-family: Menlo, Monaco, Consolas, "Courier New", monospace !important;
              counter-reset: line !important;
            }
            .bbai-markdown-body pre code > span {
              display: block !important;
              position: relative !important;
              padding-left: 4em !important;
            }
            .bbai-markdown-body pre code > span::before {
              content: counter(line) !important;
              counter-increment: line !important;
              position: absolute !important;
              left: 0 !important;
              padding-right: 1em !important;
              color: #666 !important;
              text-align: right !important;
              width: 3em !important;
              user-select: none !important;
            }
            .bbai-markdown-body pre .bbai-copy-button-code {
              position: absolute !important;
              top: 3px !important;
              right: 5px !important;
              background-color: transparent !important;
              border: none !important;
              color: #e0e0e0 !important;
              cursor: pointer !important;
              padding: 4px !important;
              border-radius: 4px !important;
              opacity: 0.7 !important;
              transition: opacity 0.2s !important;
            }
            .bbai-markdown-body pre .bbai-copy-button-code:hover {
              opacity: 1 !important;
              background-color: rgba(255, 255, 255, 0.1) !important;
            }
            .bbai-markdown-body code {
              padding: 0.2em 0.4em !important;
              margin: 0 !important;
              background-color: #1e1e1e !important;
              border-radius: 4px !important;
              font-family: Menlo, Monaco, Consolas, "Courier New", monospace !important;
              color: #e0e0e0 !important;
              font-weight: 400 !important;
              font-size: 13px !important;
            }
            .bbai-markdown-body p {
              margin-top: 10px !important;
              margin-bottom: 10px !important;
              color: #24292e !important;
              font-size: 13px !important;
              font-weight: 400 !important;
            }
            .bbai-markdown-body ul {
              list-style-type: disc !important;
              margin-top: 16px !important;
              margin-bottom: 16px !important;
              padding-inline-start: 1.625em !important;
            }
            .bbai-markdown-body ol {
              list-style-type: decimal !important;
              margin-top: 16px !important;
              margin-bottom: 16px !important;
              padding-inline-start: 1.625em !important;
            }
            .bbai-markdown-body blockquote {
              padding: 0 1em !important;
              color: #6a737d !important;
              border-left: 0.25em solid #dfe2e5 !important;
              margin: 0 !important;
            }
          `,m.appendChild(d);const h=document.createElement("div");h.innerHTML=l.trim(),i=h.firstChild,m.appendChild(i);const g=document.createElement("div");g.className="bbai-drag-handle",i.insertBefore(g,i.firstChild);let u=!1,v=0,f=0,A=0,ot=0;const lt=b=>{if(b.target===g){u=!0,v=b.clientX,f=b.clientY;const T=i.getBoundingClientRect();A=T.left,ot=T.top,i.classList.add("dragging"),i.style.transition="none",$t&&(i.style.maxHeight=`${i.offsetHeight}px`)}},it=()=>{u&&(u=!1,i.classList.remove("dragging"),i.style.transition="",i.classList.add("position-fixed"))},E=b=>{if(u){b.preventDefault();const T=b.clientX-v,x=b.clientY-f,k=A+T,I=ot+x,M=i.getBoundingClientRect(),J=window.innerWidth-M.width,L=window.innerHeight-M.height,D=Math.max(0,Math.min(k,J)),B=Math.max(0,Math.min(I,L));i.style.left=`${D}px`,i.style.top=`${B}px`}};g.addEventListener("mousedown",lt,{passive:!1}),document.addEventListener("mousemove",E,{passive:!1}),document.addEventListener("mouseup",it);const O=()=>{document.removeEventListener("mousemove",E),document.removeEventListener("mouseup",it)},V=b=>{b.innerHTML=`
              ${c.map(T=>`
                <div class="bbai-menu-item" data-action="${T.text.toLowerCase()}">
                  <span data-icon="${T.icon}">${T.text}</span>
                </div>
              `).join("")}
              `,C.classList.remove("show"),b.querySelectorAll(".bbai-menu-item").forEach(T=>{T.addEventListener("click",je)})},H=async(b,T,x,k,I,M,J=.7)=>{var Pt,tt,ce,qt,Qe;const L=i.querySelector(".bbai-menu-content"),D=`
                  .bbai-markdown-body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                    line-height: 1.6 !important;
                    color: #24292e !important;
                  }
                  .bbai-markdown-body hr {
                    border: none !important;
                    margin: 0 !important;
                  }
                  .bbai-markdown-body h1, .bbai-markdown-body h2, .bbai-markdown-body h3,
                  .bbai-markdown-body h4, .bbai-markdown-body h5, .bbai-markdown-body h6 {
                    margin-top: 16px;
                    margin-bottom: 16px;
                    font-weight: 600 !important;
                    line-height: 1.25 !important;
                    border: none !important;
                    font-size: 13px !important;
                    color: #24292e !important;
                  }
                  .bbai-markdown-body h3, .bbai-markdown-body h4, .bbai-markdown-body h5, .bbai-markdown-body h6 {
                    font-size: 13px !important;
                  }
                  .bbai-markdown-body code {
                    padding: 0.2em 0.4em !important;
                    margin: 0 !important;
                    background-color: #1e1e1e !important;
                    border-radius: 4px !important;
                    font-family: Menlo, Monaco, Consolas, "Courier New", monospace!important;
                    color: #e0e0e0 !important;
                    font-weight: 400 !important;
                    font-size: 13px !important;
                  }
                  .bbai-markdown-body pre {
                    position: relative;
                    padding: 0;
                    margin: 16px 0;
                    overflow: hidden;
                    background-color: #1e1e1e;
                    border-radius: 8px;
                  }
                  .bbai-markdown-body pre::before {
                    content: attr(data-language);
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    padding: 8px 16px;
                    background-color: #2d2d2d;
                    color: #e0e0e0;
                    font-size: 12px;
                    font-weight: 500;
                    border-bottom: 1px solid #3d3d3d;
                  }
                  .bbai-markdown-body pre code {
                    display: block !important;
                    padding: 16px !important;
                    padding-top: 40px !important;
                    margin: 0;
                    background-color: transparent;
                    color: #e0e0e0 !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    overflow-x: auto !important;
                    counter-reset: line !important;
                  }
                  .bbai-markdown-body pre code > span {
                    display: block;
                    position: relative;
                    padding-left: 4em;
                  }
                  .bbai-markdown-body pre code > span::before {
                    content: counter(line);
                    counter-increment: line;
                    position: absolute;
                    left: 0;
                    padding-right: 1em;
                    color: #666;
                    text-align: right;
                    width: 3em;
                    user-select: none;
                  }
                  .bbai-markdown-body pre .bbai-copy-button-code {
                    position: absolute;
                    top: 3px;
                    right: 5px;
                    background-color: transparent;
                    border: none;
                    color: #e0e0e0;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                  }
                  .bbai-markdown-body pre .bbai-copy-button-code:hover {
                    opacity: 1;
                    background-color: rgba(255, 255, 255, 0.1);
                  }
                  .bbai-markdown-body ul {
                    list-style-type: disc;
                    margin-top: 16px;
                    margin-bottom: 16px;
                    padding-inline-start: 1.625em;
                  }
                  .bbai-markdown-body ol {
                    list-style-type: decimal;
                    margin-top: 16px;
                    margin-bottom: 16px;
                    padding-inline-start: 1.625em;
                  }
                  .bbai-markdown-body blockquote {
                    padding: 0 1em;
                    color: #6a737d;
                    border-left: 0.25em solid #dfe2e5;
                    margin: 0;
                  }
                  .bbai-markdown-body table {
                    border-spacing: 0;
                    border-collapse: collapse;
                    margin: 16px 0;
                  }
                  .bbai-markdown-body table th,
                  .bbai-markdown-body table td {
                    padding: 6px 13px;
                    border: 1px solid #dfe2e5;
                  }
                  .bbai-markdown-body table tr:nth-child(2n) {
                    background-color: #f6f8fa;
                  }
                  .bbai-markdown-body p {
                    margin-top: 10px;
                    margin-bottom: 10px;
                    color: #24292e !important;
                    font-size: 13px !important;
                    font-weight: 400 !important;
                  }
            `,B=()=>{if(!document.getElementById("markdown-styles")){const R=document.createElement("style");R.id="markdown-styles",R.textContent=D,document.head.appendChild(R)}if(!document.getElementById("stream-styles")){const R=document.createElement("style");R.id="stream-styles",R.textContent=`
                  .bbai-stream-content {
                    min-height: 20px;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    height: auto;
                    overflow: visible;
                  }
                  .bbai-stream-content.visible {
                    opacity: 1;
                  }
                  .bbai-stream-dot {
                    display: inline;
                    font-size: 14px;
                    color: #666;
                    animation: blink 1s infinite;
                    position: relative;
                  }
                  .bbai-stream-wrapper {
                    height: 100%;
                    overflow: hidden;
                  }
                  .bbai-result-container {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    max-height: inherit;
                  }
                  @keyframes blink {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                  }
                `,document.head.appendChild(R)}};if(B(),i&&(i.classList.add("has-result"),gt())){const R=(tt=(Pt=document.querySelector("#bbai-shadow-wrapper"))==null?void 0:Pt.shadowRoot)==null?void 0:tt.querySelector(".bbai-tooltip");R&&R.classList.remove("show")}L.innerHTML=`
              <div class="bbai-result-container">
                <div class="bbai-result-header">
                  <button class="bbai-back-button">←</button>
                  <span>${x}</span>
                </div>
                <div class="bbai-result-content">
                  <div class="bbai-stream-wrapper">
                    <div class="bbai-stream-content bbai-improved-text bbai-markdown-body"></div>
                  </div>
                </div>
              </div>
            `;const ft=L.querySelector(".bbai-result-content");if(ft&&(ft.scrollTop=0),!document.getElementById("wrapper-styles")){const R=document.createElement("style");R.id="wrapper-styles",R.textContent=`
              .bbai-stream-wrapper {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
                max-height: inherit;
                overflow: hidden;
              }
              .bbai-result-content {
                display: flex;
                flex-direction: column;
                min-height: 100px;
                overflow-y: auto !important;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent !important;
                scrollbar-width: thin;
                overscroll-behavior: contain;
              }
              .bbai-stream-content {
                overflow-y: auto !important;
                height: auto;
                max-height: 400px;
              }
                `,document.head.appendChild(R)}const xt=16,_t=()=>{const R=L.querySelector(".bbai-stream-content"),F=i;if(R){if(R.classList.add("visible"),$t=!0,u)return;const Ot=F.getBoundingClientRect(),Nt=window.innerHeight,K=F.offsetHeight;if(Ot.bottom>Nt-xt){const rt=Nt-Ot.top-xt;F.style.maxHeight=`${rt}px`}setTimeout(()=>{F.classList.remove("transitioning")},200);const Ht=L.querySelector(".bbai-result-content");Ht&&(Ht.style.overflowY="auto",Ht.style.maxHeight="100%")}};setTimeout(_t,50);const Mt=new MutationObserver(_t);Mt.observe(L,{childList:!0,subtree:!0,characterData:!0}),i._contentObserver=Mt,L.querySelector(".bbai-back-button").addEventListener("click",()=>V(L));try{const R=await so.get(),F=await fetch("https://oi-vscode-server-2.onrender.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",userid:R||""},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"system",content:I},{role:"user",content:M}],temperature:J,max_tokens:2048,stream:!0})});if(!document.getElementById("stream-styles")){const X=document.createElement("style");X.id="stream-styles",X.textContent=`
                  .bbai-stream-indicator {
                    color: #666;
                    font-style: italic;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                  }
                  .bbai-stream-indicator::after {
                    content: '';
                    width: 12px;
                    height: 12px;
                    border: 2px solid #ddd;
                    border-top-color: #666;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                  }
                `,document.head.appendChild(X)}if(!F.ok||!F.body)throw new Error(`Stream request failed: ${F.status} ${F.statusText}`);const Ot=F.body.getReader(),Nt=new TextDecoder;let K="";for(;;){const{value:X,done:pe}=await Ot.read();if(pe){const ct=L.querySelector(".bbai-stream-content.bbai-improved-text.bbai-markdown-body");if(ct){ct.innerHTML=ae(K);const pt=L.querySelector(".bbai-result-content");pt&&pt.scrollTo({top:pt.scrollHeight,behavior:"smooth"})}$t=!1;break}const ko=Nt.decode(X,{stream:!0}).split(`
`);for(const ct of ko)if(ct.trim()!==""&&ct.startsWith("data: ")){const pt=ct.slice(5);if(pt==="[DONE]")break;try{const wt=JSON.parse(pt),Ve=(Qe=(qt=(ce=wt==null?void 0:wt.choices)==null?void 0:ce[0])==null?void 0:qt.delta)==null?void 0:Qe.content;if(Ve){K+=Ve,B();const vo=ae(K),Je=L.querySelector(".bbai-stream-content.bbai-improved-text.bbai-markdown-body");if(Je){const de=document.createElement("div");de.innerHTML=vo,de.querySelectorAll("pre code").forEach(Dt=>{const Ft=Dt.parentElement;if(!Ft)return;const Ke=Array.from(Dt.classList).find(Xt=>Xt.startsWith("language-")),tn=Ke?Ke.replace("language-",""):"";if(tn&&Ft.setAttribute("data-language",tn),!Ft.querySelector(".bbai-copy-button-code")){const Xt=`stream-code-${Date.now()}-${Math.random().toString(36).substr(2,9)}`;Dt.id=Xt,Ue(Dt,Ft,parseInt(Xt.split("-")[2],36))}});const at=L.querySelector(".bbai-result-content"),So=at?at.scrollHeight-at.scrollTop===at.clientHeight:!1;Je.innerHTML=de.innerHTML+'<span class="bbai-stream-dot">•</span>',So&&at&&(at.scrollTop=at.scrollHeight)}}}catch(wt){console.error("Failed to parse streaming response:",wt)}}}if(K=K||"No changes suggested.",!document.getElementById("stream-styles")){const X=document.createElement("style");X.id="bbai-stream-styles",X.textContent=`
                  .bbai-stream-indicator {
                    color: #666;
                    font-style: italic;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 8px;
                  }
                  .bbai-stream-indicator::after {
                    content: '';
                    width: 12px;
                    height: 12px;
                    border: 2px solid #ddd;
                    border-top-color: #666;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                  }
                `,document.head.appendChild(X)}L.innerHTML=`
              <div class="bbai-result-container">
                <div class="bbai-result-header">
                  <button class="bbai-back-button">←</button>
                  <span>${x}</span>
                </div>
                <div class="bbai-result-content">
                  <div class="bbai-improved-text bbai-markdown-body">${ae(K)}</div>
                  <button class="bbai-copy-button">Copy</button>
                </div>
              </div>
            `,B(),L.querySelector(".bbai-back-button").addEventListener("click",()=>{i&&i.classList.remove("has-result"),Q=0,zt=0,V(L)});const rt=L.querySelector(".bbai-copy-button");rt.addEventListener("click",()=>{const X=go(b==="fix grammar"?K.split(`

Explanation`)[0].split(`

Changes`)[0].trim():K);navigator.clipboard.writeText(X).then(()=>{rt.textContent="Copied!",C.classList.remove("show"),setTimeout(()=>{rt.textContent="Copy"},2e3)}).catch(pe=>{console.error("Error copying text:",pe),rt.textContent="Copy failed",C.classList.remove("show"),setTimeout(()=>{rt.textContent="Copy"},2e3)})})}catch(R){console.error("Error processing text:",R),L.innerHTML=`
              <div class="bbai-result-container">
                <div class="bbai-result-header">
                  <button class="bbai-back-button">←</button>
                  <span>${x}</span>
                </div>
                <div class="bbai-result-content bbai-error">
                  Failed to process text. Please try again.
                </div>
              </div>
            `,L.querySelector(".bbai-back-button").addEventListener("click",()=>V(L))}},je=async b=>{var M;const x=b.currentTarget.dataset.action,k=(M=It())==null?void 0:M.text,I=De(k||"");console.log("handleMenuItemClick inner",x);try{I?I&&x==="optimize code"?await H("optimize code","↻","Optimize Code","","You are an expert software engineer focused on code optimization. Analyze the code and suggest optimizations for better performance, memory usage, and readability while maintaining the original functionality. Explain your optimizations.",`Please analyze and optimize this code while explaining the improvements: ${k}`,.3):I&&x==="refactor code"?await H("refactor code","✓","Refactor Code","","You are an expert software engineer focused on code refactoring. Improve the code structure, readability, and maintainability while preserving its functionality. Apply design patterns and best practices where appropriate. Explain your refactoring decisions.",`Please refactor this code to improve its structure and maintainability: ${k}`,.3):I&&x==="explain code"?await H("explain code","⟂","Explain Code","","You are an expert software engineer skilled at explaining code. Break down the code and explain its functionality, purpose, and how it works in a clear and understandable way. Include any important technical concepts or patterns used.",`Please explain this code in detail: ${k}`,.3):I&&x==="debug code"?await H("debug code","≡","Debug Code","","You are an expert software engineer focused on debugging. Analyze the code for potential issues, bugs, edge cases, or performance problems. Suggest fixes and improvements while explaining the problems and their solutions.",`Please analyze this code for potential issues and suggest fixes: ${k}`,.3):x&&await H("custom","","AI Edit","","You are a helpful AI code assistant",`${x}. Here is the code to work with: ${k}`,.7):x==="explain"?await H("explain","↻","Explain","","You are a helpful assistant skilled at explaining concepts clearly and thoroughly. Break down complex ideas into understandable parts while maintaining any markdown formatting in the text.",`Please explain this text in detail: ${k}`,.3):x==="summarize"?await H("summarize","✓","Summarize","","You are a professional editor skilled at creating concise summaries while preserving key information. Focus on the main points and important details while maintaining any markdown formatting.",`Please provide a clear summary of this text: ${k}`,.3):x==="translate"?await H("translate","⟂","Translate","","You are a skilled translator. Translate the text while preserving its meaning and any markdown formatting. If no target language is specified, translate to English.",`Please translate this text: ${k}`,.3):x==="make it longer"?await H("make it longer","≡","Make it Longer","","You are a professional writer skilled at expanding text with relevant details, examples, and explanations. Add depth while maintaining the original tone, purpose, and markdown formatting.",`Please expand this text by adding relevant details, examples, or explanations while maintaining its core message and any markdown formatting: ${k}`,.7):x&&await H("custom","","AI Edit","","You are a helpful AI assistant",`${x}. Here is the text to work with: ${k}`,.7)}catch(J){console.error("Error processing action:",J)}};i.querySelectorAll(".bbai-menu-item").forEach(b=>{b.addEventListener("click",je)});const le=i.querySelector(".bbai-search-input"),yo=i.querySelector(".bbai-search-icon"),Ze=b=>{var k;b.preventDefault();const T=(k=It())==null?void 0:k.text,x=le.value.trim();x&&T&&(H("custom","",x.length>30?x.substring(0,30)+"...":x,"","You are a helpful AI assistant skilled at following specific instructions for text editing and generation. Focus on providing accurate, relevant responses that directly address the user's request while maintaining any markdown formatting.",`${x}. Here is the text to work with: ${T}`,.7),le.value="")};le.addEventListener("keydown",b=>{b.key==="Enter"&&Ze(b)}),yo.addEventListener("click",Ze);const Ge=It();if(Ge&&i){const b=Ge.rect;if(b){const T=window.innerWidth,x=window.innerHeight,k=16,I=Math.min(400,T-k*2),M=i.offsetHeight||200,J=b.left+b.width/2,L=I/2;let B=zt-L;const ft=k,xt=T-I-k;B<ft?B=ft:B>xt&&(B=xt);const _t=x-Q,Mt=M+k;let Bt,Pt=!1;if(_t<Mt||Q>x-200){Bt=Q-M-k*2-20,Pt=!0;const tt=new ResizeObserver(()=>{if(i.getBoundingClientRect().bottom>window.innerHeight){i.classList.add("transitioning"),i.classList.remove("menu-below"),i.classList.add("menu-above");const qt=i.offsetHeight;i.style.top=`${Q-qt-k*2-20}px`,setTimeout(()=>{i.classList.remove("transitioning")},200)}});i._resizeObserver=tt,setTimeout(()=>{tt.observe(i)},100),i.classList.add("menu-above")}else Bt=Q+k-20,i.classList.add("menu-below");i.style.left=`${B}px`,i.style.top=`${Bt}px`,i.classList.add("show"),C.classList.remove("show"),setTimeout(()=>{const tt=i.querySelector(".bbai-search-input");tt&&(tt.focus(),mo())},50)}}const We=b=>{var x,k,I;!ie()&&!gt()&&se();const T=document.querySelector("#bbai-menu-wrapper");if(T&&!((x=T.shadowRoot)!=null&&x.contains(b.target))){const M=window.getSelection();M&&N&&(M.removeAllRanges(),M.addRange(N.cloneRange()));const J=i==null?void 0:i._resizeObserver;J&&J.disconnect();const L=i==null?void 0:i._contentObserver;if(L&&L.disconnect(),$t=!1,u=!1,T.remove(),gt()){const D=(I=(k=document.querySelector("#bbai-shadow-wrapper"))==null?void 0:k.shadowRoot)==null?void 0:I.querySelector(".bbai-tooltip");D&&D.classList.remove("show")}if(N){const D=window.getSelection();if(D)try{D.removeAllRanges(),D.addRange(N.cloneRange()),document.body.focus()}catch(B){console.error("Failed to restore selection:",B)}}Xe(),Q=0,document.removeEventListener("mousedown",We)}};if(i==null||i.addEventListener("mousedown",b=>{b.stopPropagation()}),document.addEventListener("mousedown",We),!document.getElementById("menu-result-styles")){const b=document.createElement("style");b.id="menu-result-styles",b.textContent=`
              .bbai-result-container {
                padding: 0 !important;
                width: 100% !important;
                max-width: 400px !important;
                margin: 0 auto !important;
                background: white !important;
                position: relative !important;
                z-index: 2147483647 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                box-sizing: border-box !important;
                border: none !important;
                border-radius: 8px !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
              }
              
              .bbai-result-container * {
                box-sizing: border-box !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              }
              .bbai-result-header {
                padding: 12px 16px !important;
                border-bottom: 1px solid #eee !important;
                font-weight: 500 !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                color: #24292E !important;
                font-size: 16px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                letter-spacing: normal !important;
                background: white !important;
                position: relative !important;
                z-index: 2147483647 !important;
                margin: 0 !important;
                border-radius: 8px 8px 0 0 !important;
              }
              .bbai-result-header span {
                overflow: hidden !important;
                text-overflow: ellipsis !important;
                flex: 1 !important;
                color: #24292E !important;
                font-size: 16px !important;
                font-weight: 500 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              }
              .bbai-back-button {
                border: none !important;
                background: none !important;
                padding: 4px 8px !important;
                cursor: pointer !important;
                font-size: 16px !important;
                color: #666 !important;
                border-radius: 4px !important;
                transition: all 0.15s ease !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                letter-spacing: normal !important;
                margin: 0 !important;
              }
              .bbai-back-button:hover {
                background: #f5f5f5 !important;
                transform: translateX(-2px) !important;
              }
              .bbai-result-content {
                font-size: 13px !important;
                line-height: 1.5 !important;
                max-height: 400px !important;
                overflow-y: auto !important;
                width: 100% !important;
                scrollbar-color: rgba(0, 0, 0, 0.2) transparent !important;
                scrollbar-width: thin !important;
                transition: max-height 0.2s ease-out !important;
                will-change: max-height !important;
                padding-right: 4px !important;
                overscroll-behavior: contain !important;
                background: white !important;
                position: relative !important;
                z-index: 2147483647 !important;
                border-radius: 0 0 8px 8px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
              }
              
              .bbai-result-content::-webkit-scrollbar {
                width: 6px !important;
                height: 6px !important;
              }
              
              .bbai-result-content::-webkit-scrollbar-track {
                background: transparent !important;
                border-radius: 3px !important;
              }
              
              .bbai-result-content::-webkit-scrollbar-thumb {
                background-color: rgba(0, 0, 0, 0.2) !important;
                border-radius: 3px !important;
                border: none !important;
              }
              
              .bbai-result-content::-webkit-scrollbar-corner {
                background: transparent !important;
              }
              .bbai-improved-text {
                margin-bottom: 16px !important;
                padding: 12px !important;
                background: white !important;
                color: #24292E !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                font-size: 13px !important;
                line-height: 1.5 !important;
                position: relative !important;
                z-index: 2147483647 !important;
              }
              .bbai-copy-button {
                width: -webkit-fill-available !important;
                padding: 8px !important;
                background: #f5f5f5 !important;
                border: none !important;
                border-radius: 4px !important;
                cursor: pointer !important;
                color: #333 !important;
                font-size: 13px !important;
                transition: all 0.15s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                margin: 0 14px 14px 14px !important;
                font-weight: 400 !important;
                min-height: fit-content !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                position: relative !important;
                z-index: 2147483647 !important;
                box-shadow: none !important;
                outline: none !important;
                text-transform: none !important;
                min-width: unset !important;
                max-width: none !important;
                text-align: center !important;
              }
              .bbai-copy-button:hover {
                background: #e5e5e5 !important;
                transform: translateY(-1px) !important;
                color: #333 !important;
                box-shadow: none !important;
                border: none !important;
              }
              .bbai-result-content.bbai-error {
                color: #dc2626 !important;
                padding: 12px !important;
                background: #fef2f2 !important;
                border-radius: 6px !important;
                border: 1px solid #fee2e2 !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                font-size: 13px !important;
                line-height: 1.5 !important;
                margin: 12px !important;
              }
              .bbai-loading {
                color: #666 !important;
                font-style: italic !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
                font-size: 13px !important;
                line-height: 1.5 !important;
                padding: 12px !important;
                background: white !important;
                position: relative !important;
                z-index: 2147483647 !important;
              }
              .bbai-loading::after {
                content: '' !important;
                width: 12px !important;
                height: 12px !important;
                border: 2px solid #ddd !important;
                border-top-color: #666 !important;
                border-radius: 50% !important;
                animation: bbai-spin 1s linear infinite !important;
                display: block !important;
                flex-shrink: 0 !important;
              }
              @keyframes bbai-spin {
                to {
                  transform: rotate(360deg) !important;
                }
              }
            `,document.head.appendChild(b)}}}catch(i){console.error("Error opening menu:",i)}})}function wo(){if(document.documentElement.getAttribute("bbai-tooltip-injected")==="true")return;document.documentElement.setAttribute("bbai-tooltip-injected","true");const o=()=>{xo(),re();const n=(r=document)=>{r.querySelectorAll(".monaco-editor").forEach(to),r.querySelectorAll(".CodeMirror").forEach(ro),r.querySelectorAll(".ace_editor").forEach(po)};n(),new MutationObserver(r=>{r.forEach(s=>{s.addedNodes.forEach(i=>{i instanceof Element&&n(i)})})}).observe(document.body,{childList:!0,subtree:!0})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",o):o();const t=(n,a)=>{const{text:r,rect:s}=n.detail;if(r&&s){const i={text:r,rect:s,elements:[],hasInteractiveElements:!1,elementTypes:[a]};sessionStorage.setItem(At,JSON.stringify(i));const c=document.querySelector(".bbai-tooltip");c&&(console.log("editorselection",W),c.style.left=`${s.left+s.width/2}px`,c.style.top=`${s.top-40}px`,c.style.transform="translateX(-50%)",c.classList.add("show"))}};(()=>{[{event:"monacoSelectionChange",type:"MONACO-EDITOR"},{event:"codemirrorSelectionChange",type:"CODEMIRROR-EDITOR"},{event:"aceSelectionChange",type:"ACE-EDITOR"}].forEach(({event:a,type:r})=>{document.addEventListener(a,s=>t(s,r))})})(),window.addEventListener("message",n=>{var a;n.data&&n.data.type==="BLACKBOX_READY"&&window.postMessage({type:"BLACKBOX_SELECTION",text:oe||((a=window.getSelection())==null?void 0:a.toString().trim())},"*")})}console.log("content script loaded"),un(),wo()})();
