import {pianoPins,noteNames} from './lessons.ts';
import type {Lesson} from './lessons.ts';
// Board functions: https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html
export const descriptions:Record<string,[string,string]>={
 ldr:['光敏电阻与固定 10 kΩ 电阻分压：3V3 → LDR → GPIO34 → 10 kΩ → GND。越亮，读数越高。','An LDR and 10 kΩ resistor divide 3.3 V into GPIO34. More light gives a higher reading.'],
 'light-resistor':['10 kΩ 下拉电阻连接 GPIO34 取样点与 GND，与光敏电阻一起分压，不能省略。','The 10 kΩ resistor connects the sample point to GND and completes the LDR voltage divider.'],
 lamp:['台灯代表环境光。调低亮度让光敏读数下降，低于阈值时 LED 夜灯亮起。','The lamp is an environment input. Dim it to lower the ADC reading and trigger the night light.'],
 piano:['八个琴键接 GPIO13/14/16/17/18/19/26/27，按下为 LOW。按住场景琴键或键盘 1–8，松开静音。','Eight active-low keys use GPIO13/14/16/17/18/19/26/27. Hold a scene key or keyboard 1–8, release to stop.'],
 soil:['电容式土壤传感器用 3.3 V 供电，AOUT 接 GPIO34；越湿读数越低。DRY/WET 必须用自己的传感器标定，百分比是相对读数。','Power the capacitive probe from 3.3 V; AOUT connects to GPIO34. Wetter reads lower. Calibrate DRY/WET for your probe; the percentage is relative.'],
 plant:['植物与土壤是环境。运行时会加速变干，阳光越强干得越快；叶片、土色、屏幕反映水分变化。','The plant and soil form the environment. The running demo accelerates drying; more sunlight dries it faster. Leaves, soil colour and screen respond.'],
 watering:['按住洒水壶给土壤加水，松开停止。它模拟手动浇水，不是由 ESP32 驱动的水泵。','Hold the can to add water, release to stop. This models manual watering, not a pump driven by ESP32.'],
 breadboard:['同排 a–e 五孔内部导通，f–j 五孔另成一组；不同排和中缝两侧彼此隔离。元件与跳线应各占一孔，用同组空余孔连接。','Each a–e row is one connected strip; f–j is a separate strip. Rows and the two sides of the trench are isolated. Use one lead per socket.'],
 antenna:['ESP32 模组上的 PCB 天线用于 2.4 GHz 无线通信。天线区域不要贴近金属或被屏蔽。','The module PCB antenna carries 2.4 GHz wireless signals. Keep metal and shielding away from this area.'],
 uart:['USB 转串口芯片在电脑 USB 与 ESP32 UART0 之间转换数据，用于下载程序和查看串口日志。','The USB-to-UART bridge carries programming data and serial logs between the computer and ESP32 UART0.'],
 regulator:['板载稳压器把 5 V 电源转换为 ESP32 使用的 3.3 V 电源。','The on-board regulator converts the 5 V supply to the 3.3 V rail used by ESP32.'],
 'power-led':['供电指示灯用于确认开发板已接入 USB 或 5 V 电源；它不是本课 GPIO23 控制的外接 LED。','The power indicator shows USB or 5 V power is present. It is separate from the external LED driven by GPIO23.'],
 board:['38 针 DevKitC V4。GPIO34–39 只能输入，6–11 接 Flash；0/2/5/12/15 是启动配置脚。课程避开这些脚作普通输出。','38-pin DevKitC V4. GPIO34–39 are input-only; 6–11 connect to flash; 0/2/5/12/15 are strapping pins.'],
 module:['ESP32-WROOM-32E 内含处理器、存储器接口与无线电路。','ESP32-WROOM-32E contains the processor, memory interface and radio.'],
 usb:['Micro-USB 用于供电与 USB-UART 通信，不是可编程 GPIO。','Micro-USB supplies power and communicates through USB-UART.'],
 power:['GPIO 按 3.3 V 逻辑工作，GND 是公共参考。不能把 5 V 直接输入 GPIO。','GPIO uses 3.3 V logic with a common GND. Do not apply 5 V directly to GPIO.'],
 reset:['EN 复位开发板，setup() 从头开始运行。','EN resets the board, starting setup() again.'],
 boot:['按住 BOOT 再复位，可进入固件下载模式。','Hold BOOT while resetting to enter firmware download mode.'],
 resistor:['电阻的两只脚插在中缝两侧的独立孔组，通过电阻本体限流。跳线和电阻插在同排同侧的不同孔，靠内部金属片连接。比较 220 Ω、330 Ω 和 1 kΩ。','A series resistor limits LED current. Compare 220 Ω, 330 Ω and 1 kΩ.'],
 led:['长脚为阳极，经独立限流电阻接 GPIO23；短脚接 GND。','The anode connects through a resistor to GPIO23; the cathode goes to GND.'],
 button:['GPIO27 使用内部上拉。按下接地为 LOW，松开为 HIGH。','GPIO27 uses an internal pull-up. Pressed is LOW; released is HIGH.'],
 pot:['两端接 3V3 与 GND，中间脚接 GPIO34。拖动旋钮试试。','Ends connect to 3V3 and GND; the wiper connects to GPIO34. Drag to turn.'],
 rgb:['R/G/B 经独立电阻接 GPIO23/19/18，共阴极接 GND。每孔只插一脚；同排 a–e、f–j 各自导通，中缝两侧隔离。','R/G/B use separate resistors on GPIO23/19/18; the common cathode goes to GND.'],
 sensor:['TMP36 用 10 mV 表示 1 °C，0 °C 对应 500 mV。','TMP36 produces 10 mV per °C, with 500 mV at 0 °C.'],
 oled:['I²C 连接：SDA21、SCL22；使用 3.3 V 供电与上拉。','I²C wiring: SDA21, SCL22, with 3.3 V power and pull-ups.'],
 buzzer:['低负载无源压电蜂鸣片，音高由 GPIO25 的信号频率决定。','A low-load passive piezo; GPIO25 frequency sets the pitch.'],
 servo:['信号接 GPIO18。独立 5 V 供电，与 ESP32 共地。','Signal on GPIO18. Separate 5 V servo supply, common GND.'],
 router:['课堂网络场景，不扫描或修改你的真实 Wi-Fi。','A classroom network model. It does not scan or change your actual Wi-Fi.'],
 supply:['只给舵机供电的独立稳压 5 V 电源，负端与 ESP32 GND 相连。','A separate regulated 5 V servo supply. Connect its negative terminal to ESP32 GND.'],
 browser:['请求在本地设备模型中演示。真机网页由 ESP32 提供。','Requests run in the local device model. Real hardware serves its own webpage.']
};

export function componentDescription(id:string,lesson:Lesson,english=false):string{
 const choose=(zh:string,en:string)=>english?en:zh;
 if(id.startsWith('key-')){const i=Number(id.slice(4));return choose(`${noteNames[i]} 琴键接 GPIO${pianoPins[i]}，使用内部上拉。按下读 LOW，松开读 HIGH；按住发声，松开静音。`,`${noteNames[i]} uses GPIO${pianoPins[i]} with an internal pull-up. Hold for LOW and sound; release for HIGH and silence.`);}
 if(descriptions[id])return descriptions[id][english?1:0];
 if(id.startsWith('rgb-resistor-')){
  const pin=id.slice('rgb-resistor-'.length),channel:Record<string,string>={'23':'R','19':'G','18':'B'};
  return choose(`330 Ω 限流电阻：GPIO${pin} → 电阻 → RGB ${channel[pin]} 通道。三个颜色通道各用一只电阻，避免相互影响。`,`330 Ω series resistor: GPIO${pin} → resistor → RGB ${channel[pin]}. Each colour has its own current-limiting resistor.`);
 }
 if(id.startsWith('capacitor-')||id.startsWith('board-capacitor-'))return choose('板载电容储存少量电荷，帮助滤除供电波动，让电路工作更稳定。','An on-board capacitor stores charge and filters supply fluctuations.');
 if(id.startsWith('board-resistor-'))return choose('板载贴片电阻用于电平偏置或限流；它属于开发板内部电路，与面包板上可调的 LED 限流电阻不同。','This on-board resistor provides biasing or current limiting within the development board.');
 if(id.startsWith('pin-')){
  const pin=id.slice(4).split('-')[0];
  if(pin==='GND')return choose('GND 公共地：为电源和信号提供共同的 0 V 参考。板上的 GND 引脚彼此相连。','GND is the common 0 V reference. All GND headers on the board are connected.');
  if(pin==='3V3')return choose('3V3：3.3 V 电源端。本课程用它给电位器、TMP36 和 OLED 等低压器件供电。','3V3 is the 3.3 V rail used by the potentiometer, TMP36 and OLED in these lessons.');
  if(pin==='5V')return choose('5V：开发板的 5 V 电源端，不是 GPIO。不要把它直接接入 3.3 V 信号输入。','5V is a power terminal, not a GPIO. Do not connect it directly to 3.3 V signal inputs.');
  if(pin==='EN')return choose('EN：芯片使能/复位输入，拉低会使 ESP32 复位；松开后重新启动程序。','EN is the chip-enable/reset input. Pulling it low resets ESP32.');
  const route=lesson.pins.find(p=>p.pin===pin);
  const used=route?choose(`本课连接：${route.text}。`,`This lesson: ${route.en}. `):'';
  const adc:Record<string,string>={'36':'ADC1_CH0','39':'ADC1_CH3','34':'ADC1_CH6','35':'ADC1_CH7','32':'ADC1_CH4','33':'ADC1_CH5'};
  if(['34','35','36','39'].includes(pin))return used+choose(`GPIO${pin} · ${adc[pin]}，只能输入，不能驱动 LED 或输出 PWM；没有内部上拉/下拉。ADC 默认读取 12 位原始值，实际电压量程由衰减设置决定。`,`GPIO${pin} · ${adc[pin]} is input-only, with no internal pull-up/down. ADC readings are 12-bit by default; voltage range depends on attenuation.`);
  if(['6','7','8','9','10','11'].includes(pin))return choose(`GPIO${pin} 用于模组内部 Flash 通信，本课程不将它用于外接元件。`,`GPIO${pin} is used for internal flash communication; leave it free of external connections.`);
  if(pin==='1'||pin==='3')return choose(`GPIO${pin} · UART0 ${pin==='1'?'TX 发送':'RX 接收'}，连接 USB 转串口芯片，用于下载程序与串口通信。`,`GPIO${pin} · UART0 ${pin==='1'?'TX':'RX'} connects to the USB-to-UART bridge for flashing and serial communication.`);
  let detail=choose(`GPIO${pin}：3.3 V 数字输入/输出，可配置为 PWM 或其他外设信号。`,`GPIO${pin} is a 3.3 V digital input/output, configurable for PWM and peripheral signals.`);
  if(adc[pin])detail+=choose(` 也支持 ${adc[pin]} 模拟采样。`,` Also supports ${adc[pin]} analog input.`);
  if(['0','2','5','12','15'].includes(pin))detail+=choose(' 这是启动配置引脚，上电时的电平会影响启动配置。',' This is a strapping pin; its level at reset affects boot configuration.');
  return used+detail;
 }
 throw new Error('Missing component description: '+id);
}
