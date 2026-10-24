import './style.css';
import wechatQr from './assets/wechat-qr.jpg?inline';
import {lessons,defaults,normalize} from './lessons.ts';
import type {Lesson,Values,Param} from './lessons.ts';
import {template,source,codeValue} from './firmware.ts';
import {Simulation} from './simulation.ts';
import type {Snapshot} from './simulation.ts';
import {Workbench} from './scene.ts';
import {icon,thumb} from './icons.ts';
import {connections,circuitSvg} from './circuit.ts';
import {componentDescription} from './component-info.ts';

const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const esc=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const load=<T>(key:string,value:T):T=>{try{return JSON.parse(localStorage.getItem('learn-esp32:'+key)??'null')??value;}catch{return value;}};
function store(key:string,value:unknown){try{localStorage.setItem('learn-esp32:'+key,JSON.stringify(value));}catch{toast(english?'Local storage unavailable':'本地存储不可用，刷新后参数不会保留');}}
const languages=[['zh','简体中文'],['en','English'],['es','Español'],['pt','Português'],['fr','Français'],['de','Deutsch'],['it','Italiano'],['tr','Türkçe'],['id','Bahasa Indonesia'],['ja','日本語'],['ko','한국어'],['hi','हिन्दी'],['he','עברית']];
let language=load('language','zh');
const english=language!=='zh';
document.documentElement.lang=language==='zh'?'zh-CN':language;
const packs:Record<string,string[]>={
zh:['ESP32 入门','探索 · 理解 · 动手','首页','课程','元件','运行模拟','设置','语言','概览','引脚图','示例','规格','动手试试','串口监视器','已停止','运行中','基础','复制代码','运行程序','停止程序'],
en:['LEARN ESP32','Explore · Understand · Build','Home','Lessons','Components','Simulator','Settings','Language','Overview','Pinout','Example','Specifications','Try it yourself','Serial monitor','Stopped','Running','Basics','Copy code','Run sketch','Stop sketch'],
es:['APRENDE ESP32','Explora · Comprende · Construye','Inicio','Lecciones','Componentes','Simulador','Ajustes','Idioma','Resumen','Pines','Ejemplo','Especificaciones','Pruébalo','Monitor serie','Detenido','En ejecución','Básico','Copiar código','Ejecutar','Detener'],
pt:['APRENDA ESP32','Explore · Entenda · Construa','Início','Aulas','Componentes','Simulador','Configurações','Idioma','Visão geral','Pinos','Exemplo','Especificações','Experimente','Monitor serial','Parado','Executando','Básico','Copiar código','Executar','Parar'],
fr:['APPRENDRE ESP32','Explorer · Comprendre · Construire','Accueil','Leçons','Composants','Simulateur','Réglages','Langue','Aperçu','Brochage','Exemple','Spécifications','À vous de jouer','Moniteur série','Arrêté','En cours','Bases','Copier le code','Exécuter','Arrêter'],
de:['ESP32 LERNEN','Entdecken · Verstehen · Bauen','Start','Lektionen','Bauteile','Simulator','Einstellungen','Sprache','Übersicht','Pinbelegung','Beispiel','Daten','Ausprobieren','Serieller Monitor','Gestoppt','Läuft','Grundlagen','Code kopieren','Starten','Stoppen'],
it:['IMPARA ESP32','Esplora · Comprendi · Costruisci','Home','Lezioni','Componenti','Simulatore','Impostazioni','Lingua','Panoramica','Pin','Esempio','Specifiche','Prova tu','Monitor seriale','Fermo','In esecuzione','Basi','Copia codice','Esegui','Ferma'],
tr:['ESP32 ÖĞREN','Keşfet · Anla · Yap','Ana sayfa','Dersler','Bileşenler','Simülatör','Ayarlar','Dil','Genel bakış','Pinler','Örnek','Özellikler','Kendin dene','Seri monitör','Durdu','Çalışıyor','Temel','Kodu kopyala','Çalıştır','Durdur'],
id:['BELAJAR ESP32','Jelajahi · Pahami · Buat','Beranda','Pelajaran','Komponen','Simulator','Pengaturan','Bahasa','Ringkasan','Pin','Contoh','Spesifikasi','Coba sendiri','Monitor serial','Berhenti','Berjalan','Dasar','Salin kode','Jalankan','Hentikan'],
ja:['ESP32 入門','探索 · 理解 · 実践','ホーム','レッスン','部品','シミュレータ','設定','言語','概要','ピン配置','例','仕様','試してみよう','シリアルモニタ','停止中','実行中','基礎','コードをコピー','実行','停止'],
ko:['ESP32 입문','탐색 · 이해 · 만들기','홈','강의','부품','시뮬레이터','설정','언어','개요','핀 배치','예제','사양','직접 해보기','시리얼 모니터','정지','실행 중','기초','코드 복사','실행','정지'],
hi:['ESP32 सीखें','खोजें · समझें · बनाएँ','होम','पाठ','घटक','सिम्युलेटर','सेटिंग','भाषा','परिचय','पिन','उदाहरण','विवरण','स्वयं आज़माएँ','सीरियल मॉनिटर','रुका','चल रहा है','बुनियाद','कोड कॉपी करें','चलाएँ','रोकें'],
he:['ללמוד ESP32','לגלות · להבין · לבנות','בית','שיעורים','רכיבים','סימולטור','הגדרות','שפה','סקירה','פינים','דוגמה','מפרט','נסו בעצמכם','צג טורי','נעצר','פועל','יסודות','העתקת קוד','הפעלה','עצירה']
};
const ui=packs[language]??packs.zh;
const text=(zh:string,en:string)=>english?en:zh;
let done=new Set(load<string[]>('done',[]).filter(id=>lessons.some(l=>l.id===id)));
let saved=load<Record<string,Values>>('values',{});
let settings={labels:true,flow:true,grid:true,autoRotate:false,sound:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,schematic:true,...load<Record<string,boolean>>('settings',{})};
let lesson:Lesson=lessons.find(l=>l.id===location.hash.slice(1))??lessons[0];
let values=normalize(lesson,saved[lesson.id]??{}),activeTab='overview',inspected='',menu='',status:'stopped'|'loading'|'running'='stopped',runToken=0;
let model:Simulation|undefined,snapshot:Snapshot|undefined,lastFrame=0,toastTimer:ReturnType<typeof setTimeout>;
let activeLine=-1;
let heldInput=false;
function inputButton(held:boolean){heldInput=held;if(status==='stopped'&&held)void run();model?.input(held);}
let audio:AudioContext|undefined,oscillator:OscillatorNode|undefined,gain:GainNode|undefined;
const lessonArtwork:Record<string,string>={board:'board',blink:'led',serial:'serial',button:'button',knob:'pot',pwm:'rgb',temperature:'sensor',timing:'clock',display:'oled',sound:'buzzer',servo:'servo',alarm:'alarm',wifi:'router',http:'browser',web:'browser',project:'project'};
const navs=[['home',ui[2]],['chip',ui[4]],['play',ui[5]],['settings',ui[6]],['globe',ui[7]]];
$('#app').innerHTML='<aside class="rail" aria-label="'+ui[2]+'"><button id="rail-toggle" aria-expanded="false" aria-label="'+text('展开侧边栏','Expand sidebar')+'">'+icon('right')+'</button>'+navs.map(([name,label])=>'<button data-nav="'+name+'" title="'+label+'" aria-label="'+label+'">'+icon(name,22)+'<span>'+label+'</span></button>').join('')+'<button id="wechat-follow" class="wechat-follow" aria-label="关注公众号极客行动" title="关注公众号 · 极客行动">'+icon('message',21)+'<span>极客行动</span></button><section class="rail-wechat" aria-label="微信公众号 极客行动"><p>微信公众号</p><h2>极客行动</h2><img src="'+wechatQr+'" width="258" height="258" alt="微信公众号极客行动关注二维码"></section><a class="rail-credit" href="https://github.com/aigeekops/learn-esp32" target="_blank" rel="noopener noreferrer" aria-label="GitHub · aigeekops/learn-esp32">GitHub<br>aigeekops/learn-esp32</a></aside>'+
'<main class="main"><header class="masthead"><div class="brand-symbol">'+icon('chip',48)+'</div><div><h1>'+ui[0]+'</h1><p>'+ui[1]+'</p></div></header>'+
'<section class="workbench" aria-label="3D ESP32"><div class="view-hint">'+text('拖动或 WASD 平移 · Q / E 旋转 · 滚轮缩放','Drag or WASD to pan · Q / E to rotate · Scroll to zoom')+'</div><div class="toolbar" role="toolbar" aria-label="3D">'+[['rotateLeft','向左转','Rotate left'],['rotateRight','向右转','Rotate right'],['minus','缩小','Zoom out'],['plus','放大','Zoom in'],['reset','重置视图','Reset view'],['flow','显示电流流动','Show current flow'],['schematic','显示原理图','Show schematic']].map(([name,zh,en])=>'<button class="tool" data-view="'+name+'" aria-label="'+text(zh,en)+'" title="'+text(zh,en)+'" '+(['flow','schematic'].includes(name)?'role="checkbox" aria-checked="'+settings[name as 'flow'|'schematic']+'"':'')+'>'+icon(name)+'</button>').join('')+'</div><div class="readout" hidden></div><div class="inspector" aria-label="'+text('元件检查器','Component inspector')+'" hidden></div><div class="schematic" hidden></div><div class="minimap" aria-label="'+text('小地图：点击移动视图','Minimap: click to pan')+'" hidden></div></section>'+
'<div class="progress-block"><div class="progress-inner">'+icon('book',27)+'<div class="progress-copy">'+ui[16]+'<div class="progress-bottom"><div class="track" role="progressbar" aria-valuemin="0" aria-valuemax="16"><div id="progress-fill"></div></div><span id="progress-count">0/16</span></div></div></div><div class="clock"></div></div>'+
'<aside class="learning"><section class="panel info-panel"><div class="tabs" role="tablist">'+['overview','pinout','example','specs'].map((id,i)=>'<button role="tab" id="tab-'+id+'" aria-controls="info-content" aria-selected="'+(i===0)+'" data-tab="'+id+'">'+ui[8+i]+'</button>').join('')+'</div><button class="info-expand" title="'+text('展开面板','Expand panel')+'" aria-label="'+text('展开面板','Expand panel')+'">'+icon('expand')+'</button><div class="info-body" role="tabpanel" id="info-content"></div></section>'+
'<section class="panel code-panel"><div class="code-head"><h2>'+ui[12]+'</h2><button class="small-btn" id="expand-code" aria-label="'+text('展开代码','Expand code')+'">'+icon('expand')+'</button><button class="small-btn" id="copy-code" aria-label="'+ui[17]+'">'+icon('copy')+'</button><button class="small-btn run" id="run" aria-label="'+ui[18]+'">'+icon('play')+'</button></div><div class="code-body" aria-label="Arduino C++"></div><section class="serial"><button class="serial-grip" role="separator" aria-orientation="horizontal" aria-label="'+text('调整串口监视器大小','Resize serial monitor')+'"></button><div class="serial-head"><i></i><span>'+ui[13]+'</span><span class="serial-status">'+ui[14]+'</span><button id="stop" aria-label="'+ui[19]+'">×</button></div><div class="serial-logs" role="log" aria-live="off"></div></section></section></aside>'+
'<section class="courses"><h2>'+ui[3]+'</h2><div class="course-track" role="group" aria-label="'+ui[3]+'"></div><button class="course-arrow prev" aria-label="'+text('前面的课程','Previous lessons')+'">'+icon('left')+'</button><button class="course-arrow next" aria-label="'+text('更多课程','More lessons')+'">'+icon('right')+'</button></section></main><section class="flyout" hidden></section><div class="toast" role="status" hidden></div><dialog class="wechat-dialog" aria-labelledby="wechat-title"><button class="wechat-close" aria-label="关闭公众号二维码">'+icon('close')+'</button><p class="wechat-eyebrow">一起学 AI X 机器人</p><h2 id="wechat-title">关注「极客行动」</h2><p>微信扫码关注，一起学 AI X 机器人。</p><img src="'+wechatQr+'" width="258" height="258" alt="微信公众号极客行动关注二维码"><p class="wechat-tip">微信扫一扫 · 手机端可长按识别二维码</p></dialog>';
const followDialog=$<HTMLDialogElement>('.wechat-dialog');
$('#wechat-follow').onclick=()=>followDialog.showModal();
$('.wechat-close').onclick=()=>followDialog.close();
followDialog.addEventListener('click',e=>{if(e.target===followDialog){const r=followDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)followDialog.close();}});
const stage=new Workbench($('.workbench'),{select:id=>openInspector(id),input:(key,v)=>updateParam(key,Math.round(v)),button:inputButton});
function toast(message:string){const el=$('.toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,2500);}
function title(l=lesson){return english?l.en:l.title;}
function save(){saved[lesson.id]={...values};store('values',saved);}
function updateParam(key:string,value:number|string){
 const p=lesson.params.find(p=>p.key===key);if(!p)return;
 const next=p.options?String(value):Math.max(p.min!,Math.min(p.max!,Math.round(Number(value)/(p.step??1))*(p.step??1)));
 if(p.options&&!p.options.some(o=>o[0]===next))return;values[key]=next;save();renderCode();if(settings.schematic)schematic();
 document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-param="'+key+'"]').forEach(el=>{if(el!==document.activeElement)el.value=String(next);});
 document.querySelectorAll<HTMLElement>('[data-swatch]').forEach(el=>el.setAttribute('aria-checked',String(el.dataset.swatch===String(values.color))));
 document.querySelectorAll<HTMLOutputElement>('[data-output="'+key+'"]').forEach(el=>el.value=String(next)+(p.unit?' '+p.unit:''));
}
function renderCards(){
 const track=$('.course-track'),scroll=track.scrollLeft;
 track.innerHTML=lessons.map((l,i)=>'<button class="course-card '+(l.id===lesson.id?'active':'')+'" data-lesson="'+l.id+'" aria-label="'+text('第 '+(i+1)+' 课：','Lesson '+(i+1)+': ')+title(l)+'">'+thumb(lessonArtwork[l.id])+'<span>'+(i+1)+'. '+title(l)+'</span>'+icon('right')+(done.has(l.id)?'<i class="done-mark">✓</i>':'')+'</button>').join('');
 document.querySelectorAll<HTMLButtonElement>('.course-card').forEach(b=>b.onclick=()=>setLesson(b.dataset.lesson!));
 track.scrollLeft=scroll;
 $('#progress-count').textContent=done.size+'/16';$('#progress-fill').style.width=done.size/16*100+'%';$('.track').setAttribute('aria-valuenow',String(done.size));
}
function renderInfo(){
 document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String((b as HTMLElement).dataset.tab===activeTab)));
 const content=$('.info-body');content.scrollTop=0;
 if(activeTab==='overview')content.innerHTML='<h2>'+title()+'</h2><p>'+(english?lesson.english:lesson.summary)+'</p><ul class="features">'+(english?[lesson.english,'Click a component to inspect or adjust it.','Run the sketch and watch the scene and serial monitor.']:lesson.features).map((s,i)=>'<li><span class="feature-icon">'+icon(['chip','bulb','clock'][i],21)+'</span><span>'+s+'</span></li>').join('')+'</ul>';
 if(activeTab==='pinout')content.innerHTML='<h2>'+ui[9]+'</h2><p>'+text('这个电路是怎样接线的。所有 GPIO 按 ESP32 编号。','How this circuit is wired. GPIO numbers refer to the ESP32.')+'</p><table class="pin-table"><thead><tr><th>'+text('引脚','Pin')+'</th><th>'+text('连接到','Connection')+'</th></tr></thead><tbody>'+lesson.pins.map(p=>'<tr data-part="'+p.target+'"><td style="color:'+p.color+'">'+(Number.isFinite(Number(p.pin))?'GPIO'+p.pin:p.pin)+'</td><td>'+esc(english?p.en:p.text)+'</td></tr>').join('')+connections(lesson).filter(c=>c.from==='board.3V3'||c.from==='supply.positive').map(c=>'<tr><td>'+ (c.from==='board.3V3'?'3V3':text('独立 5 V','External 5 V'))+'</td><td>'+({pot:text('电位器一端','Potentiometer end'),sensor:'TMP36 +VS',oled:'OLED VCC',servo:'Servo VCC'}[c.to.split('.')[0]]??c.to)+'</td></tr>').join('')+(lesson.parts.some(p=>!['router','browser'].includes(p))?'<tr><td>GND</td><td>'+text('所有器件和外部电源的公共地','Common ground for components and external supply')+'</td></tr>':'')+'</tbody></table>';
 if(activeTab==='example')content.innerHTML='<h2>'+text('代码怎样工作','How the code works')+'</h2><ol class="step-list">'+exampleSteps().map(s=>'<li>'+s+'</li>').join('')+'</ol><p>'+text('点击代码中带下划线的数值，可打开对应元件检查器。这里运行的是教学模型；真机需在 Arduino IDE 中编译并烧录。','Click an underlined code value to inspect its parameter. This runs a teaching model. Compile and flash the code in Arduino IDE for real hardware.')+'</p>';
 if(activeTab==='specs')content.innerHTML='<h2>'+ui[11]+'</h2><dl class="spec-list">'+lesson.specs.map(([a,b])=>'<dt>'+esc(english?a.split(' / ').at(-1):a.split(' / ')[0])+'</dt><dd>'+esc(b)+'</dd>').join('')+'</dl>';
 content.querySelectorAll<HTMLElement>('[data-part]').forEach(el=>el.onclick=()=>{stage.select(el.dataset.part!);openInspector(el.dataset.part!);});
}
function exampleSteps(){
 const steps:Record<string,string[]>={
 board:['Arduino IDE 安装 esp32 3.3.12，选择 ESP32 Dev Module，串口 115200。','setup() 在复位后运行一次，loop() 持续重复。','Serial.begin(115200) 打开串口；USB 既供电也传数据。','EN 重置程序；BOOT 与 EN 配合进入下载模式。'],
 blink:['pinMode(23, OUTPUT) 配置 GPIO23。','HIGH 点亮 LED，LOW 熄灭；电阻限制电流。','两个 delay 的总和就是一个完整周期。'],
 serial:['用 Serial.begin(115200) 设置与监视器一致的速率。','每次翻转灯时，输出递增计数和电平。','日志帮助区分程序没有运行和接线没有响应。'],
 button:['INPUT_PULLUP 使松开时为 HIGH。','按下后 GPIO27 接地，读数为 LOW。','if/else 将输入状态转换成 GPIO23 的输出。'],
 knob:['电位器滑动端电压在 0–3.3 V 之间变化。','analogRead(34) 返回 12 位原始值，不是精确的电压。','量程由衰减决定；这里的理想模型在约 3.1 V 饱和。'],
 pwm:['ledcAttach(pin, 5000, 8) 设置 5 kHz、8 位 PWM。','ledcWrite(pin, duty) 设置 0–255 的占空比计数。','RGB 各用一只电阻，独立调节三个通道。'],
 temperature:['analogReadMilliVolts(35) 取得校准毫伏值。','TMP36 输出 = 500 + 10 × 温度（mV）。','温度达到或超过阈值时，GPIO23 输出 HIGH。'],
 timing:['millis() 持续增加，不必停下来等待。','用无符号差值判断每项任务是否到期。','每轮读取按钮，让采样和闪灯互不阻塞。'],
 display:['库管理器安装 Adafruit SSD1306 2.5.17、GFX 1.13.0 和 BusIO 1.17.4。','Wire.begin(21, 22) 指定 SDA 和 SCL。','实际屏幕先扫描地址；本例用 0x3C。','把文字写入缓冲区，再用 display() 更新屏幕。'],
 sound:['只使用适合 GPIO 信号驱动的低负载压电器件。','ledcWriteTone(25, frequency) 设置音调。','频率为 0 时静音，用 millis() 控制节奏。'],
 servo:['外部稳压 5 V 只给舵机供电，并连接公共地。','20 ms 周期对应 50 Hz；1000–2000 µs 控制课程行程。','1500 µs 对应中位；实物端点和角度需要标定。'],
 alarm:['按钮状态稳定 30 ms 后才产生一次按下事件。','温度低于阈值为 NORMAL；超温进入 ALARM。','ALARM 时按键进入 ACK，只静音；降温后复位。'],
 wifi:['在本地代码填写自己的 SSID 和密码，不要提交到网站。','WiFi.begin() 发起 STA 连接，循环检查状态。','串口取得 IP 后，在同一局域网访问设备。'],
 http:['ESP32 的 WebServer 根据方法和路径选择处理函数。','GET /api/state 返回传感器值和 JSON。','不知道的路径返回 404；这里的请求在模型内演示。'],
 web:['GET / 返回由 ESP32 自己提供的网页。','POST /api/led 只接受 value=0 或 1。','控制后 GET /api/state 回读；真实页面用相对路径保持同源。'],
 project:['安装 Adafruit SSD1306 2.5.17、GFX 1.13.0、BusIO 1.17.4，并在本地填写 Wi-Fi 配置。','200 ms 采样温度，500 ms 刷新 OLED。','每轮处理稳定按钮事件和告警状态。','网页校验阈值后更新状态，再返回同一份 JSON。']
 };
 return english?[lesson.english,'Inspect the GPIO wiring in the Pinout tab. '+lesson.pins.map(p=>(Number.isFinite(Number(p.pin))?'GPIO':'')+p.pin+' → '+p.en).join('; '),'Adjust underlined constants, run the model, and observe the serial output.','Real board: ESP32 Dev Module, Arduino-ESP32 3.3.12, serial 115200 baud.']:(steps[lesson.id]??[]);
}
function renderCode(){
 activeLine=-1;
 const el=$('.code-body'),scroll=el.scrollTop;
 const code=template(lesson).replaceAll("\\'","'");
 const token=/\/\/[^\n]*|"(?:\\.|[^"\\])*"|\b(?:void|const|int|float|bool|static|unsigned|long|if|else|return|while|enum|switch|case|true|false|uint32_t|String)\b|\b\d+(?:\.\d+)?\b/g;
 function highlight(chunk:string){let out='',at=0;for(const m of chunk.matchAll(token)){out+=esc(chunk.slice(at,m.index));out+='<span class="'+(m[0].startsWith('//')?'comment':m[0].startsWith('"')?'str':/^\d/.test(m[0])?'num':'kw')+'">'+esc(m[0])+'</span>';at=m.index!+m[0].length;}return out+esc(chunk.slice(at));}
 el.innerHTML=code.split('\n').map((line,i)=>{
  let out='',at=0;for(const match of line.matchAll(/@@(\w+)@@/g)){out+=highlight(line.slice(at,match.index));const key=match[1];out+='<button class="code-param" data-code-param="'+key+'" title="'+text('点击修改','Click to change')+'">'+esc(codeValue(key,values))+'</button>';at=match.index!+match[0].length;}out+=highlight(line.slice(at));
  return '<div class="code-line"><span class="line-no">'+(i+1)+'</span><span class="code-text">'+out+'</span></div>';
 }).join('');
 el.scrollTop=scroll;el.querySelectorAll<HTMLButtonElement>('[data-code-param]').forEach(b=>b.onclick=()=>{const key=b.dataset.codeParam!;const p=lesson.params.find(p=>p.key===key);if(p){openInspector(p.key==='ohms'?'resistor':p.part);$('.inspector [data-param="'+key+'"]')?.focus();}});
}
function showExecution(s:Snapshot){
 document.querySelectorAll<SVGPathElement>('.schematic .switch-lever').forEach(el=>el.setAttribute('d',el.dataset[s.pressed?'closed':'open']!));
 document.querySelectorAll<SVGPathElement>('.schematic .led-emitter').forEach(el=>el.setAttribute('fill',s.led?String(values.color??'#df554b'):'none'));
 document.querySelectorAll<SVGTextElement>('.schematic [data-signal]').forEach(row=>{const pin=row.dataset.signal!;row.setAttribute('data-active',String(pin==='23'?s.led:pin==='27'?s.pressed:true));row.querySelector('[data-level]')!.textContent=pin==='23'?(s.led?'HIGH':'LOW'):pin==='27'?(s.pressed?'LOW':'HIGH'):pin==='34'?s.volts.toFixed(1)+'V':pin==='35'?s.mv+'mV':pin==='25'?s.frequency+'Hz':'';});
 const patterns:Record<string,string>={board:'delay(1000)',blink:s.led?'delay(@@on@@)':'delay(@@off@@)',serial:'Serial.printf',button:'digitalWrite(23, lit)',knob:'int raw =',pwm:'ledcWrite(23',temperature:'digitalWrite(23, temperatureC',timing:'unsigned long now',display:'display.display()',sound:'ledcWriteTone',servo:'ledcWrite(18',alarm:'updateAlarm(millis())',wifi:'WiFi.status() ==',http:'server.handleClient()',web:'server.handleClient()',project:'updateAlarm(now)'};
 const index=template(lesson).split('\n').findIndex(line=>line.includes(patterns[lesson.id]));
 if(index!==activeLine){const el=$('.code-body');el.querySelector('.active')?.classList.remove('active');const line=el.children[index] as HTMLElement|undefined;if(line){line.classList.add('active');if(line.offsetTop-el.offsetTop<el.scrollTop||line.offsetTop-el.offsetTop+line.offsetHeight>el.scrollTop+el.clientHeight)el.scrollTop=line.offsetTop-el.offsetTop-el.clientHeight/2;}activeLine=index;}
}
function syncSchematicSelection(){document.querySelectorAll<SVGElement>('[data-circuit-part]').forEach(el=>{const selected=el.dataset.circuitPart===inspected||(el.dataset.circuitPart==='power'&&/^pin-(GND|3V3|5V)/.test(inspected));el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));});}
function schematic(){
 $('.schematic').innerHTML='<div class="schematic-head"><b>'+text('原理图','Schematic')+'</b><small>'+title()+'</small><button aria-label="'+text('关闭原理图','Close schematic')+'" id="close-schematic">'+icon('close')+'</button></div>'+circuitSvg(lesson,values,english);
 $('.schematic').insertAdjacentHTML('beforeend','<p class="schematic-hint">'+text('点击元件或引脚，查看 3D 与参数','Select a component or pin to inspect it in 3D')+'</p>');
 $('.schematic').querySelectorAll<SVGElement>('[data-circuit-part]').forEach(el=>{const activate=()=>openInspector(el.dataset.circuitPart!);el.onclick=e=>{e.stopPropagation();activate();};el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();activate();}};});syncSchematicSelection();
 $('#close-schematic').onclick=()=>setSetting('schematic',false);
}
function openInspector(id:string){
 const entry=stage.entries.get(id);if(!entry)return;inspected=id;const relevant=lesson.params.filter(p=>id==='resistor'?p.key==='ohms':p.part===id&&p.key!=='ohms');stage.select(id);syncSchematicSelection();
 const el=$('.inspector');el.hidden=false;el.innerHTML='<h3>'+(entry?(english?entry.en:entry.label):id)+'</h3><button class="inspector-close" aria-label="'+text('关闭检查器','Close inspector')+'">'+icon('close')+'</button><p>'+esc(componentDescription(id,lesson,english))+'</p>'+relevant.map(paramHtml).join('')+
 (id==='button'?'<button class="action-btn primary hold-btn" aria-pressed="false">'+text('按住按钮','Hold button')+'</button>':'')+
 '<div class="inspector-actions"><button class="action-btn" data-action="focus">'+icon('focus',14)+text('放大查看','Focus')+'</button>'+(id==='browser'?'<button class="action-btn primary" data-action="send">'+icon('send',14)+text(lesson.id==='project'?'设置阈值':'发送请求',lesson.id==='project'?'Set threshold':'Send request')+'</button>':id==='reset'?'<button class="action-btn" data-action="reset">'+text('复位程序','Reset sketch')+'</button>':(lesson.parts.includes(id as never)||id==='resistor'||id.startsWith('rgb-resistor-'))?'<button class="action-btn" data-action="run">'+text(status==='running'?'停止程序':'运行后可见',status==='running'?'Stop':'Run sketch')+'</button>':'')+'</div>';
 $('.inspector-close').onclick=()=>{el.hidden=true;inspected='';syncSchematicSelection();stage.reset();};
 el.querySelectorAll<HTMLButtonElement>('[data-swatch]').forEach((b,i,all)=>{b.onclick=()=>updateParam('color',b.dataset.swatch!);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const next=all[(i+(['ArrowLeft','ArrowUp'].includes(e.key)?all.length-1:1))%all.length];next.focus();updateParam('color',next.dataset.swatch!);}};});
 el.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-param]').forEach(input=>input.oninput=()=>{const p=lesson.params.find(p=>p.key===input.dataset.param)!;updateParam(p.key,p.options?input.value:Number(input.value));});
 const hold=el.querySelector<HTMLButtonElement>('.hold-btn');if(hold){hold.onpointerdown=e=>{e.preventDefault();hold.setPointerCapture(e.pointerId);inputButton(true);hold.setAttribute('aria-pressed','true');};hold.onpointerup=hold.onpointercancel=()=>{inputButton(false);hold.setAttribute('aria-pressed','false');};hold.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();inputButton(true);hold.setAttribute('aria-pressed','true');}};hold.onkeyup=e=>{if(e.key===' '||e.key==='Enter'){inputButton(false);hold.setAttribute('aria-pressed','false');}};}
 stage.showSelection(id);
 el.querySelector<HTMLButtonElement>('[data-action="focus"]')!.onclick=()=>stage.focus(id);
 const action=el.querySelector<HTMLButtonElement>('[data-action="run"]');if(action)action.onclick=()=>{if(status==='running')stop();else void run();openInspector(id);};
 const reset=el.querySelector<HTMLButtonElement>('[data-action="reset"]');if(reset)reset.onclick=()=>{stop();void run();};
 const send=el.querySelector<HTMLButtonElement>('[data-action="send"]');if(send)send.onclick=async()=>{if(status!=='running')await run();model?.request();if(lesson.id==='project')updateParam('threshold',values.threshold);};
}
function paramHtml(p:Param){const v=values[p.key];if(p.key==='color')return '<div class="param"><div class="param-head"><span>'+text('颜色','Colour')+'</span></div><div class="color-swatches" role="radiogroup" aria-label="'+text('LED 颜色','LED colour')+'">'+p.options!.map(([c,zh,en])=>'<button role="radio" data-swatch="'+c+'" aria-label="'+text(zh,en)+'" aria-checked="'+(v===c)+'" style="--swatch:'+c+'"><i></i></button>').join('')+'</div></div>';return '<label class="param"><span class="param-head"><span>'+esc(english?p.en:p.label)+'</span><output data-output="'+p.key+'">'+esc(v)+(p.unit?' '+p.unit:'')+'</output></span>'+(p.options?'<select data-param="'+p.key+'" aria-label="'+esc(english?p.en:p.label)+'">'+p.options.map(([v1,zh,en])=>'<option value="'+esc(v1)+'" '+(String(v)===v1?'selected':'')+'>'+esc(english?en:zh)+'</option>').join('')+'</select>':'<input data-param="'+p.key+'" aria-label="'+esc(english?p.en:p.label)+'" type="range" min="'+p.min+'" max="'+p.max+'" step="'+(p.step??1)+'" value="'+esc(v)+'">')+'</label>';}
function appendLog(s:string){const el=$('.serial-logs');const line=document.createElement('div');line.innerHTML='<span class="log-time">'+((model?.time??0)/1000).toFixed(2).padStart(5,'0')+'</span>'+esc(s);el.append(line);while(el.children.length>160)el.firstElementChild!.remove();el.scrollTop=el.scrollHeight;}
function updateNav(){document.querySelectorAll<HTMLElement>('[data-nav]').forEach(b=>{const selected=menu===b.dataset.nav||(b.dataset.nav==='play'&&status!=='stopped')||(b.dataset.nav==='home'&&!menu&&status==='stopped');b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});}
function setStatus(s:typeof status){status=s;updateNav();const send=document.querySelector<HTMLButtonElement>('[data-action=send]');if(send)send.disabled=s==='loading';const action=document.querySelector<HTMLElement>('[data-action=run]');if(action)action.textContent=text(s==='stopped'?'运行后可见':'停止程序',s==='stopped'?'Run sketch':'Stop');$('#run').innerHTML=icon(s==='stopped'?'play':'stop');$('#run').classList.toggle('running',s!=='stopped');$('#run').setAttribute('aria-label',s==='stopped'?ui[18]:ui[19]);$('.serial-status').textContent=s==='loading'?text('模拟上传中','Simulating upload'):s==='running'?ui[15]:ui[14];$('.serial-head i').classList.toggle('live',s==='running');}
async function run(){
 if(status!=='stopped')return;
 const token=++runToken;setStatus('loading');$('.serial-logs').replaceChildren();appendLog(text('模拟编译程序…','Simulating compilation…'));
 if(!audio)try{audio=new AudioContext();gain=audio.createGain();gain.gain.value=0;gain.connect(audio.destination);oscillator=audio.createOscillator();oscillator.type='sine';oscillator.connect(gain);oscillator.start();}catch{}
 await audio?.resume();
 await new Promise(r=>setTimeout(r,settings.reducedMotion?30:600));if(token!==runToken)return;
 appendLog(text('模拟上传至 ESP32…','Simulating upload to ESP32…'));
 await new Promise(r=>setTimeout(r,settings.reducedMotion?30:600));if(token!==runToken)return;
 model=new Simulation(lesson.id,values,appendLog);model.input(heldInput);setStatus('running');appendLog(text('教学模拟运行中。','Teaching simulation running.'));
 if(!done.has(lesson.id)){done.add(lesson.id);store('done',[...done]);renderCards();}
}
function stop(){++runToken;heldInput=false;gain?.gain.setTargetAtTime(0,audio!.currentTime,.015);if(status!=='stopped')appendLog(text('已停止。','Stopped.'));model=undefined;snapshot=undefined;setStatus('stopped');if(settings.schematic)schematic();$('.code-line.active')?.classList.remove('active');activeLine=-1;$('.readout').hidden=true;}
function setLesson(id:string,updateHash=true){const l=lessons.find(l=>l.id===id);if(!l)return;save();stop();lesson=l;values=normalize(l,saved[l.id]??{});activeTab='overview';document.querySelectorAll('.expanded-panel').forEach(el=>el.classList.remove('expanded-panel'));$('.code-body').scrollTop=0;$('.serial').style.removeProperty('--serial-height');$('.inspector').hidden=true;Object.assign(stage.settings,settings);stage.setLesson(l,values);inspected='';renderCards();const card=$('.course-card.active');$('.course-track').scrollLeft=Math.max(0,card.offsetLeft-($('.course-track').clientWidth-card.clientWidth)/2);renderInfo();renderCode();schematic();$('.schematic').hidden=!settings.schematic;stage.updateCamera();$('.serial-logs').replaceChildren();document.title=title()+' · '+ui[0];if(updateHash)history.replaceState(null,'','#'+l.id);menu='';$('.flyout').hidden=true;updateNav();}
function setSetting(key:string,value:boolean){(settings as Record<string,boolean>)[key]=value;store('settings',settings);Object.assign(stage.settings,settings);if(key==='schematic'){$('.schematic').hidden=!value;schematic();stage.updateCamera();}document.querySelector('[data-view="'+key+'"]')?.setAttribute('aria-checked',String(value));}
function openMenu(kind:string){
 const el=$('.flyout');if(menu===kind&&!el.hidden){el.hidden=true;menu='';updateNav();return;}menu=kind;el.hidden=false;updateNav();
 let body='',heading='';
 if(kind==='chip'){heading=ui[4];body=[...stage.entries].map(([id,e])=>'<button class="menu-row" data-component="'+id+'">'+icon('focus',20)+'<span>'+(english?e.en:e.label)+'<small>'+esc(componentDescription(id,lesson,english))+'</small></span></button>').join('');}
 if(kind==='settings'){heading=ui[6];body=[['labels','标注','Callout labels','3D 视图中的热点和文字','Cards and pointers around the view'],['flow','电流流动','Current flow','沿导线显示信号与电流方向','Moving dots on the wires'],['grid','地面网格','Floor grid','开发板下方的浅色网格','Faint grid under the board'],['autoRotate','空闲旋转','Turntable','空闲时缓慢转动视角','Rotate the view while idle'],['sound','声音','Sound','让蜂鸣器发出声音','Let the piezo play out loud'],['reducedMotion','减弱动画','Reduce motion','缩短场景和启动过渡','Near-instant transitions']].map(([key,zh,en,desc,descEn])=>'<label class="setting-row"><span>'+text(zh,en)+'<small>'+text(desc,descEn)+'</small></span><input type="checkbox" data-setting="'+key+'" '+((settings as Record<string,boolean>)[key]?'checked':'')+'></label>').join('')+'<button class="reset-progress">'+text('重置进度','Reset progress')+'</button>';}
 if(kind==='globe'){heading=ui[7];body=languages.map(([code,name])=>'<button class="menu-row '+(code===language?'active':'')+'" data-language="'+code+'"><span style="width:30px">'+code.toUpperCase()+'</span>'+name+(code===language?' ✓':'')+'</button>').join('');}
 el.innerHTML='<h2>'+heading+'</h2><button class="flyout-close" aria-label="'+text('关闭菜单','Close menu')+'">'+icon('close')+'</button>'+body;
 $('.flyout-close').onclick=()=>{el.hidden=true;menu='';updateNav();};
 el.querySelectorAll<HTMLElement>('[data-component]').forEach(b=>b.onclick=()=>{el.hidden=true;menu='';stage.select(b.dataset.component!);openInspector(b.dataset.component!);});
 el.querySelectorAll<HTMLInputElement>('[data-setting]').forEach(b=>b.onchange=()=>setSetting(b.dataset.setting!,b.checked));
 const reset=el.querySelector<HTMLButtonElement>('.reset-progress');if(reset)reset.onclick=()=>{done.clear();store('done',[]);renderCards();toast(text('学习进度已重置','Progress reset'));};
 el.querySelectorAll<HTMLButtonElement>('[data-language]').forEach(b=>b.onclick=()=>{store('language',b.dataset.language);location.reload();});
}
function resetView(){$('.inspector').hidden=true;inspected='';syncSchematicSelection();stage.reset();}
document.querySelectorAll<HTMLElement>('[data-nav]').forEach(b=>b.onclick=()=>{const kind=b.dataset.nav!;if(kind==='home'){resetView();$('.flyout').hidden=true;menu='';}else if(kind==='play'){if(status==='stopped')void run();else stop();}else openMenu(kind);});
$('#rail-toggle').onclick=()=>{const expanded=$('.rail').classList.toggle('expanded');$('#rail-toggle').setAttribute('aria-expanded',String(expanded));$('#rail-toggle').setAttribute('aria-label',expanded?text('收起侧边栏','Collapse sidebar'):text('展开侧边栏','Expand sidebar'));};
document.querySelectorAll<HTMLElement>('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab!;renderInfo();});
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{const id=b.dataset.view!;if(id==='rotateLeft')stage.turn(-1);if(id==='rotateRight')stage.turn(1);if(id==='plus')stage.magnify(1.18);if(id==='minus')stage.magnify(1/1.18);if(id==='reset')resetView();if(id==='flow'||id==='schematic')setSetting(id,!(settings as Record<string,boolean>)[id]);$('.minimap').hidden=!stage.focused&&Math.abs(stage.zoom-1)<.05&&stage.pan.length()<1;});
$('.course-arrow.next').onclick=()=>$('.course-track').scrollBy({left:440,behavior:'smooth'});
$('.course-arrow.prev').onclick=()=>$('.course-track').scrollBy({left:-440,behavior:'smooth'});
$('#run').onclick=()=>{if(status==='stopped')void run();else stop();};
$('#stop').onclick=stop;
$('#copy-code').onclick=async()=>{try{await navigator.clipboard.writeText(source(lesson,values));toast(text('代码已复制','Code copied'));}catch{toast(text('复制失败，请选择代码手动复制','Copy failed. Select the code to copy.'));}};
$('#expand-code').onclick=()=>{const el=$('.code-panel');el.classList.toggle('expanded-panel');$('#expand-code').setAttribute('aria-expanded',String(el.classList.contains('expanded-panel')));};
$('.info-expand').onclick=()=>$('.info-panel').classList.toggle('expanded-panel');
let serialDrag:{y:number;height:number}|undefined;
$('.serial-grip').onpointerdown=e=>{serialDrag={y:e.clientY,height:$('.serial-logs').clientHeight};$('.serial-grip').setPointerCapture(e.pointerId);};
$('.serial-grip').onpointermove=e=>{if(serialDrag){$('.serial').style.setProperty('--serial-height',Math.min(240,Math.max(35,serialDrag.height+serialDrag.y-e.clientY))+'px');}};
$('.serial-grip').onpointerup=()=>serialDrag=undefined;
$('.minimap').innerHTML='<svg viewBox="0 0 100 65"><path d="M8 8h84v49H8z" fill="none" stroke="#d4d1bd"/><rect x="23" y="15" width="19" height="36" rx="2" fill="#577475"/><rect x="52" y="14" width="29" height="37" rx="2" fill="#dfddcb"/><rect class="map-viewport" x="13" y="9" width="65" height="46" rx="3" fill="none" stroke="#739b92" stroke-dasharray="3 2"/></svg>';
let mapHeld=false;function panMinimap(e:PointerEvent){const box=$('.minimap').getBoundingClientRect(),center=stage.center();stage.pan.set((e.clientX-box.left)/box.width*120-50-center.x,0,(e.clientY-box.top)/box.height*100-40-center.z);stage.updateCamera();}$('.minimap').onpointerdown=e=>{mapHeld=true;$('.minimap').setPointerCapture(e.pointerId);panMinimap(e);};$('.minimap').onpointermove=e=>{if(mapHeld)panMinimap(e);};$('.minimap').onpointerup=$('.minimap').onpointercancel=()=>{mapHeld=false;};
window.addEventListener('hashchange',()=>setLesson(location.hash.slice(1),false));
window.addEventListener('keydown',e=>{
 if(followDialog.open)return;
 if((e.target as HTMLElement).closest('input,select,textarea'))return;
 if(e.key===' '&&(e.target as HTMLElement).closest('button'))return;
 const key=e.key.toLowerCase();if(key===' '){e.preventDefault();if(status==='stopped')void run();else stop();}
 if(key==='q')stage.turn(-1);if(key==='e')stage.turn(1);if(key==='r')resetView();if(key==='+'||key==='=')stage.magnify(1.15);if(key==='-')stage.magnify(1/1.15);
 if(key==='w')stage.panBy(0,3);if(key==='s')stage.panBy(0,-3);if(key==='a')stage.panBy(3,0);if(key==='d')stage.panBy(-3,0);
 if(key==='c')setSetting('schematic',!settings.schematic);if(key==='f')setSetting('flow',!settings.flow);
 if(key==='escape'){if(!$('.inspector').hidden){$('.inspector').hidden=true;inspected='';syncSchematicSelection();stage.reset();}else if(!$('.flyout').hidden){$('.flyout').hidden=true;menu='';}else if(document.querySelector('.expanded-panel'))document.querySelectorAll('.expanded-panel').forEach(el=>el.classList.remove('expanded-panel'));else resetView();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)gain?.gain.setTargetAtTime(0,audio!.currentTime,.01);lastFrame=0;});
function frame(now:number){
 requestAnimationFrame(frame);
 const dt=lastFrame?Math.min(1000,now-lastFrame):0;lastFrame=now;
 if(document.hidden)return;
 if(model&&status==='running')snapshot=model.tick(dt);
 if(gain&&audio&&oscillator){oscillator.frequency.setTargetAtTime(snapshot?.frequency||1000,audio.currentTime,.02);gain.gain.setTargetAtTime(settings.sound&&snapshot?.frequency ? .035 : 0,audio.currentTime,.02);}
 const readout=$('.readout');readout.hidden=!snapshot;
 if(snapshot){const s=snapshot;showExecution(s);let textValue='';
  if(['knob','timing'].includes(lesson.id))textValue='<strong>'+s.raw+' / 4095</strong>'+s.volts.toFixed(2)+' V · ADC1 GPIO34';
  else if(lesson.id==='pwm')textValue='<strong>R '+s.rgb[0]+' · G '+s.rgb[1]+' · B '+s.rgb[2]+'</strong>LEDC · 5 kHz · 8 bit';
  else if(['temperature','display','alarm','project'].includes(lesson.id))textValue='<strong>'+s.temperature.toFixed(1)+' °C</strong>'+s.mv+' mV'+(lesson.id==='alarm'||lesson.id==='project'?' · '+s.alarm:'');
  else if(lesson.id==='servo')textValue='<strong>'+values.pulse+' µs</strong>50 Hz · 20 ms';
  else if(['wifi','http','web'].includes(lesson.id))textValue='<strong>'+s.network+'</strong>'+s.ip;
  else if(lesson.id==='sound')textValue='<strong>'+s.frequency+' Hz</strong>GPIO25';
  else if(lesson.id==='board')textValue='<strong>ESP32 ready</strong>setup() → loop()';
  else textValue='<strong>GPIO23 · '+(s.led?'HIGH':'LOW')+'</strong>'+text('教学模拟','Teaching simulation');
  if(readout.innerHTML!==textValue)readout.innerHTML=textValue;
 }
 $('.minimap').hidden=!stage.focused&&Math.abs(stage.zoom-1)<.05&&stage.pan.length()<1;
 const viewport=$('.map-viewport');viewport.setAttribute('x',String(18+stage.pan.x*.65));viewport.setAttribute('y',String(9+stage.pan.z*.55));viewport.setAttribute('width',String(65/stage.zoom));viewport.setAttribute('height',String(46/stage.zoom));
 stage.draw(now,snapshot,english);
}
setLesson(lesson.id);
function clock(){const date=new Date();$('.clock').innerHTML=date.toLocaleDateString(language==='zh'?'zh-CN':language,{year:'numeric',month:'long',day:'numeric'})+'<br>'+date.toLocaleTimeString('en-GB',{hour12:false});}
clock();setInterval(clock,1000);requestAnimationFrame(frame);
