import {pianoPins,noteNames} from './lessons.ts';
import type {Lesson} from './lessons.ts';
// Board functions: https://docs.espressif.com/projects/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html
export const descriptions:Record<string,[string,string]>={
 ranger:['HC-SR04 用独立 5 V 供电。TRIG 发出触发脉冲，ECHO 脉宽给出超声波往返时间；距离 = 时间 × 声速 ÷ 2。ECHO 必须经过 2.2 kΩ / 3.3 kΩ 分压再进入 ESP32。','Power HC-SR04 from 5 V. TRIG starts a measurement; ECHO reports the sound round-trip time. Divide 5 V ECHO through 2.2 kΩ / 3.3 kΩ before the ESP32 input.'],
 obstacle:['左右或上下拖动障碍物改变测距输入。超声波测量的是反射物距离；超时必须作为无效测量处理，不能当作 0 cm。','Drag the obstacle to change range. An echo timeout is an invalid measurement, not zero centimetres.'],
 driver:['TB6612FNG 用 AIN1/AIN2、BIN1/BIN2 控制方向，PWM_A/PWM_B 控制占空比。逻辑 VCC 接 3.3 V，电机 VM 接独立 5 V，STBY 拉高运行；电机电流经过驱动器，不能经过 ESP32 GPIO。','TB6612FNG uses direction inputs plus PWM. Logic VCC is 3.3 V; motor VM uses a separate 5 V rail. STBY enables the bridge. Motor current goes through the driver, not ESP32 GPIO.'],
 motor:['直流电机把电能变成旋转。PWM 影响驱动力，负载变化会改变实际转速；编码器提供旋转反馈。模型中的电机参数是教学示例，真实电机需要标定。','A DC motor converts power to rotation. PWM sets drive effort; load affects actual RPM. An encoder measures rotation. Model parameters are illustrative and need hardware calibration.'],
 chassis:['左右轮速决定车体运动：同速前进、不同速转弯、反向转动原地旋转。台面显示局部运动轨迹，12 个场景单位代表 1 m；车身居中、轨迹随实际位移滚动。','Wheel speeds determine motion: equal speeds go straight, unequal speeds turn, opposite speeds pivot. The local trace uses 12 scene units per metre; the body stays centred as its path scrolls.'],
 computer:['上位机通过 3.3 V USB-UART 适配器与 ESP32 通信：TX 接对方 RX、RX 接对方 TX，并共地。命令逐行解析、校验后执行；没有持续收到有效速度命令时停止电机。','The host connects through a 3.3 V USB-UART adapter: cross TX/RX and share GND. Parse and validate complete lines. Stop the motors when valid speed commands time out.'],
 phone:['BLE 手机遥控器先连接 ESP32 的 GATT 服务，再写入控制特征值。回传特征值通知设备状态；断连或命令超时应让电机停止。这里的手机是教学模型。','A BLE controller connects to the ESP32 GATT service and writes command characteristics. Notifications return device status. Disconnects or command timeout stop the motors. This phone is a teaching model.'],
 peer:['另一块 ESP32 通过 ESP-NOW 传递控制数据，双方必须使用相同 Wi-Fi 信道，并配置正确的对端 MAC。回执用于确认应用实际收到；链路失联后停止电机。','A second ESP32 sends ESP-NOW control packets. Both devices need the same Wi-Fi channel and the correct peer MAC. Application acknowledgements confirm reception. Link timeout stops the motors.'],
 'echo-resistor-upper':['2.2 kΩ 上臂电阻：ECHO → 2.2 kΩ → ESP32 输入取样点。与下臂 3.3 kΩ 电阻串联，将 5 V 高电平分压到约 3.0 V。','The 2.2 kΩ upper resistor connects ECHO to the sample point. Together with the 3.3 kΩ lower resistor, it reduces 5 V to about 3.0 V.'],
 'echo-resistor-lower':['3.3 kΩ 下臂电阻：ESP32 输入取样点 → 3.3 kΩ → GND。输出 = 5 × 3.3 / (2.2 + 3.3) ≈ 3.0 V，不能把 5 V ECHO 直接接 GPIO。','The 3.3 kΩ lower resistor connects the sample point to GND. Output is 5 × 3.3 / (2.2 + 3.3) ≈ 3.0 V. Never wire 5 V ECHO directly to GPIO.'],
 'encoder-disc':['编码器 A/B 两相信号相差四分之一个周期，先后顺序表示方向；单位时间脉冲数换算转速。本课使用 3.3 V 推挽输出编码器；若换成开集电极输出，GPIO34/35 没有内置上拉，必须外接 3.3 V 上拉。分清每转脉冲数、解码倍频和减速比。','Quadrature A/B signals differ by a quarter-cycle; order indicates direction. Pulses per time determine RPM. This lesson uses 3.3 V push-pull encoder outputs. Open-collector replacements need external 3.3 V pull-ups on GPIO34/35. Distinguish PPR, decoding multiplier and gear ratio.'],
 'encoder-left':['左轮编码器提供左轮实际转速反馈。A/B 相位判断旋转方向；与右轮分别计数，才能闭环控制差速底盘。','The left encoder measures actual left-wheel speed. Decode its A/B phases independently from the right wheel for closed-loop differential drive.'],
 'encoder-right':['右轮编码器提供右轮实际转速反馈。左右轮必须独立计数与调速，不能用相同 PWM 假定两轮速度相同。','The right encoder measures actual right-wheel speed. Count and regulate each wheel independently; equal PWM does not guarantee equal speed.'],
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
 supply:['独立稳压 5 V 电源，按本课连接给舵机、电机驱动 VM 或测距模块供电，负端与 ESP32 GND 相连。电机供电需要满足堵转电流。','A separate regulated 5 V supply for the connected servo, motor VM or range sensor. Share ESP32 GND and size motor power for stall current.'],
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
