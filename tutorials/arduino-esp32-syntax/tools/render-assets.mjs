import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';

// Install sharp in this tools directory, or point to an existing module locally.
const require = createRequire(import.meta.url);
const sharp = require(process.env.LEARN_ESP32_SHARP_MODULE || 'sharp');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'images');
await mkdir(out, { recursive: true });
const C = { bg: '#F5F4EE', ink: '#213743', muted: '#536C79', green: '#227C6D', pale: '#E2EDE7', orange: '#B56836', white: '#FFFFFF' };
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const font = 'PingFang SC,Noto Sans CJK SC,Microsoft YaHei,sans-serif';
const text = (x,y,value,size=38,color=C.ink,weight=400,anchor='start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`.replace('font-family=',`fill="${color}" font-family=`);
const rect = (x,y,w,h,fill=C.white,r=20,stroke='none') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
const path = d => `<path d="${d}" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow)"/>`;
const defs = `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 1 L8 5 L0 9" fill="none" stroke="${C.green}" stroke-width="2"/></marker></defs>`;
const svg = (w,h,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${defs}${rect(0,0,w,h,C.bg,0)}${body}</svg>`;
const heading = (title,subtitle) => text(64,83,title,50,C.ink,700)+text(64,137,subtitle,29,C.muted);
const footer = (value,y=642) => rect(48,y-46,1184,86,C.pale,16)+text(80,y+9,value,32,C.green,600);

// Text is kept inside the center square [540, 1340] for WeChat thumbnail crops.
let cover = rect(42,42,1796,716,C.white,32)
 + rect(800,110,280,62,C.green,31)
 + text(940,152,'编程入门 · 07',28,C.white,600,'middle')
 + text(940,255,'六个月学机器人',42,C.green,600,'middle')
 + text(940,393,'看懂 ESP32 程序',74,C.ink,700,'middle')
 + text(940,483,'语法 · 逻辑 · 实战',34,C.muted,400,'middle')
 + `<path d="M838 565H1042" stroke="${C.green}" stroke-width="5" stroke-linecap="round"/>`
 + text(940,655,'机器人自学笔记',28,C.muted,400,'middle');
// Small board and code symbols are decorative, not a physical pinout diagram.
cover += `<g opacity=".78">${rect(170,265,200,270,C.pale,16,C.green)}${rect(198,295,144,120,C.white,10,C.green)}${text(270,365,'ESP32',30,C.green,700,'middle')}`;
for(let i=0;i<8;i++) cover+=rect(148,280+i*30,22,9,C.green,2)+rect(370,280+i*30,22,9,C.green,2);
cover += `${rect(237,485,66,48,C.muted,5)}${text(1560,412,'{ }',120,C.green,400,'middle')}${text(1635,495,'();',68,C.orange,500,'middle')}</g>`;
const drawings = new Map([['cover-wide',svg(1880,800,cover)]]);

drawings.set('assignment',svg(1280,720,
 heading('赋值：先算出新值，再保存','示例：count 已经是 0，然后执行 count = count + 1;')
 + rect(64,206,330,280)+rect(475,206,330,280)+rect(886,206,330,280)
 + text(96,263,'① 取旧值',35,C.green,600)+text(507,263,'② 做计算',35,C.green,600)+text(918,263,'③ 保存结果',35,C.green,600)
 + text(229,369,'count = 0',44,C.ink,600,'middle')+text(640,369,'0 + 1 → 1',44,C.ink,600,'middle')+text(1051,369,'count = 1',44,C.ink,600,'middle')
 + path('M405 348H460')+path('M816 348H872')
 + footer('等号在这里表示赋值，不是数学中的相等方程。')));

drawings.set('function-result',svg(1280,760,
 heading('返回结果，和把结果显示出来，是两件事','示例：int total = add(3, 4); 然后 Serial.println(total);')
 + rect(65,211,325,250)+rect(477,211,325,250)+rect(889,211,325,250)
 + text(96,266,'① 调用函数',34,C.green,600)+text(508,266,'② 保存结果',34,C.green,600)+text(920,266,'③ 打印文字',34,C.green,600)
 + text(227,354,'add(3, 4)',42,C.ink,600,'middle')+text(640,354,'total = 7',42,C.ink,600,'middle')+text(1052,354,'串口显示 7',40,C.ink,600,'middle')
 + path('M403 334H462')+path('M815 334H874')
 + text(81,523,'return 7 只交回数值；Serial.println 才负责显示。',32,C.muted)
 + footer('只调用 add(3, 4);，不会自动在窗口中看见 7。',680)));

drawings.set('callback',svg(1280,760,
 heading('回调：先交出函数，何时执行由接收者决定','回调不自动表示异步、并行或另开线程。')
 + rect(64,207,1152,174)+text(96,260,'立即调用的例子',34,C.green,600)
 + text(96,323,'runAction(announce) → action() → 打印 ready',36,C.ink,500)
 + rect(64,411,1152,174)+text(96,464,'网页服务器的例子',34,C.green,600)
 + text(96,527,'注册处理函数 → 请求到达 → 调用函数 → 返回响应',36,C.ink,500)
 + footer('函数名 announce 是交出函数；announce() 是现在执行。',680)));

for (const [name,source] of drawings) {
 await writeFile(resolve(out,`${name}.svg`),source);
 await sharp(Buffer.from(source)).png().toFile(resolve(out,`${name}.png`));
}
await sharp(resolve(out,'cover-wide.png')).extract({left:540,top:0,width:800,height:800}).png().toFile(resolve(out,'cover-square.png'));
console.log(`Rendered ${drawings.size} SVG/PNG assets and a centered cover crop.`);
