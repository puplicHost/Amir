import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Curated category-specific real electronics & industrial photography URLs
const categoryImages = {
  'microcontrollers-embedded': [
    'https://images.unsplash.com/photo-1608555855762-2b657eb1c348?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=700&auto=format&fit=crop&q=80',
  ],
  'industrial-sensors': [
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
  ],
  'plc-automation-modules': [
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80',
  ],
  'motor-drives-vfd': [
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=700&auto=format&fit=crop&q=80',
  ],
  'power-supplies-protection': [
    'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608555855762-2b657eb1c348?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
  ],
  'pneumatic-components': [
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=700&auto=format&fit=crop&q=80',
  ],
  'iot-wireless-telemetry': [
    'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608555855762-2b657eb1c348?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1591488320449-011701bb6704?w=700&auto=format&fit=crop&q=80',
  ],
  'measurement-test-tools': [
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
  ],
  'relays-switching': [
    'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?w=700&auto=format&fit=crop&q=80',
  ],
  'cables-connectors': [
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=700&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555680202-c86f0e12f086?w=700&auto=format&fit=crop&q=80',
  ],
}

// 100 Products: 10 distinct products for each of the 10 categories
const catalogBlueprint = [
  // 1. Microcontrollers & Embedded Systems (10 products)
  {
    category: 'microcontrollers-embedded',
    items: [
      { slug: 'stm32f407-cortex-m4-dev-board', en: 'STM32F407VGT6 ARM Cortex-M4 Development Board', ar: 'لوحة تطوير STM32F407VGT6 بمعالج ARM Cortex-M4', price: 1250, compare: 1450 },
      { slug: 'esp32-s3-dual-core-module', en: 'ESP32-S3 Dual-Core Wi-Fi & BLE Development Module', ar: 'وحدة تطوير ESP32-S3 ثنائية النواة مع واي فاي وبلوتوث', price: 580, compare: 650 },
      { slug: 'raspberry-pi-cm4-compute-module', en: 'Raspberry Pi CM4 Compute Module 4GB RAM 32GB eMMC', ar: 'وحدة حوسبة Raspberry Pi CM4 بذاكرة 4 جيجا وسعة 32 جيجا', price: 4200, compare: null },
      { slug: 'arduino-mega-2560-r3-board', en: 'Arduino Mega 2560 R3 Atmega2560 Embedded Controller', ar: 'لوحة أردوينو ميجا 2560 R3 بمتحكم Atmega2560', price: 680, compare: 780 },
      { slug: 'rp2040-dual-cortex-m0-board', en: 'Raspberry Pi Pico RP2040 Dual ARM Cortex-M0+ Board', ar: 'لوحة تطوير Raspberry Pi Pico بمتحكم RP2040 ثنائي النواة', price: 290, compare: 350 },
      { slug: 'teensy-4-1-600mhz-arm-board', en: 'Teensy 4.1 600MHz ARM Cortex-M7 High Speed Controller', ar: 'متحكم فائق السرعة Teensy 4.1 بتردد 600 ميجاهرتز', price: 2450, compare: 2700 },
      { slug: 'stm32f103c8t6-blue-pill-module', en: 'STM32F103C8T6 ARM Cortex-M3 Minimal System Board', ar: 'لوحة STM32 بلو بيل بمعالج ARM Cortex-M3', price: 180, compare: 220 },
      { slug: 'esp8266-nodemcu-v3-iot-board', en: 'NodeMCU V3 ESP8266 Wi-Fi Development Board CH340', ar: 'لوحة NodeMCU V3 بـ Wi-Fi مدمج لمشاريع إنترنت الأشياء', price: 220, compare: 260 },
      { slug: 'atmel-attiny85-digispark-usb', en: 'Digispark ATTiny85 USB Miniature Development Board', ar: 'متحكم دقيق مصغر Digispark ATTiny85 بواجهة USB', price: 140, compare: 170 },
      { slug: 'jetson-nano-developer-kit-4gb', en: 'NVIDIA Jetson Nano 4GB AI Edge Computing Platform', ar: 'منصة حوسبة الذكاء الاصطناعي NVIDIA Jetson Nano سعة 4 جيجا', price: 9800, compare: 11000 },
    ],
  },
  // 2. Industrial Sensors (10 products)
  {
    category: 'industrial-sensors',
    items: [
      { slug: 'm18-inductive-proximity-sensor-npn', en: 'M18 Inductive Proximity Sensor NPN Normally Open', ar: 'حساس تقاربي حثي M18 نوع NPN مفتوح طبيعيا', price: 380, compare: 440 },
      { slug: 'pt100-rtd-temperature-sensor-stainless', en: 'PT100 RTD Temperature Sensor 3-Wire Stainless Steel Probe', ar: 'مستشعر حرارة مقاومي PT100 ثلاثي الأسلاك بمسبار استانلس', price: 490, compare: null },
      { slug: 'piezo-pressure-transmitter-0-10bar', en: '0-10 Bar Piezoelectric Pressure Transmitter 4-20mA', ar: 'محول ضغط بيزوكهربائي 0-10 بار بإشارة خرج 4-20 مللي أمبير', price: 1850, compare: 2100 },
      { slug: 'photoelectric-sensor-diffuse-reflect', en: 'Photoelectric Sensor Diffuse Reflection 30cm Infrared', ar: 'حساس كهروضوئي عاكس للأشعة تحت الحمراء مدى 30 سم', price: 460, compare: 520 },
      { slug: 'ultrasonic-distance-sensor-industrial', en: 'Industrial Ultrasonic Level Sensor 20cm-400cm 4-20mA', ar: 'حساس ألتراسونيك صناعي لقياس المسافة والمستوى 4-20 مللي أمبير', price: 2400, compare: 2650 },
      { slug: 'type-k-thermocouple-flange-probe', en: 'Type K Thermocouple High Temperature Sensor with Flange', ar: 'مزدوجة حرارية نوع K لقياس درجات الحرارة العالية حتى 800 مئوية', price: 390, compare: 450 },
      { slug: 'hall-effect-rotary-speed-sensor', en: 'Hall Effect Magnetic Gear Tooth Speed & RPM Sensor', ar: 'حساس تأثير هول لقياس سرعة دوران التروس والمحركات RPM', price: 540, compare: null },
      { slug: 'water-flow-hall-meter-g1-inch', en: 'Industrial Turbine Water Flow Sensor Meter G1 Inch Brass', ar: 'مستشعر تدفق السوائل توربيني نحاسي مقاس 1 بوصة', price: 890, compare: 980 },
      { slug: 'load-cell-weight-sensor-500kg', en: 'S-Type High Precision Load Cell Weight Sensor 500kg Alloy', ar: 'خلية وزن صناعية فئة S حمولة 500 كجم بدقة عالية', price: 2100, compare: 2350 },
      { slug: 'capacitive-proximity-sensor-liquid', en: 'M18 Capacitive Proximity Sensor for Liquid & Granular Detection', ar: 'حساس سعوي M18 للكشف عن السوائل والمواد الحبيبية عبر الجدران', price: 620, compare: 700 },
    ],
  },
  // 3. PLC & Automation Modules (10 products)
  {
    category: 'plc-automation-modules',
    items: [
      { slug: 'industrial-plc-controller-14di-10do', en: 'Industrial PLC Controller 14 DI / 10 DO Transistor Output', ar: 'وحدة تحكم PLC صناعية 14 دخل رقمي / 10 خرج ترانزستور', price: 5400, compare: 5900 },
      { slug: '7-inch-color-hmi-touchscreen-panel', en: '7-Inch Color TFT Touchscreen HMI Panel RS485 Ethernet', ar: 'شاشة لمس صناعية HMI ملونة 7 بوصة بمنافذ RS485 وإيثرنت', price: 7200, compare: 7800 },
      { slug: '8-channel-analog-input-rtd-tc-module', en: '8-Channel Analog Input RTD/TC Expansion Module', ar: 'كارت توسعة 8 قنوات دخل تماثلي لحساسات الحرارة RTD/TC', price: 2950, compare: null },
      { slug: 'plc-cpu-24di-16do-relay-ethernet', en: 'Advanced PLC CPU 24 DI / 16 DO Relay with Modbus TCP', ar: 'وحدة معالجة مركزية PLC مع 24 دخل و16 خرج ريليه وشبكة Modbus TCP', price: 8400, compare: 9200 },
      { slug: '4-channel-analog-output-0-10v-module', en: '4-Channel Isolated Analog Output Module 0-10V / 4-20mA', ar: 'كارت 4 مخارج تماثلية معزولة 0-10 فولت و4-20 مللي أمبير', price: 2100, compare: 2400 },
      { slug: '10-inch-industrial-hmi-touch-display', en: '10.1-Inch High-Resolution Industrial HMI Operator Panel', ar: 'شاشة HMI صناعية كبيرة 10.1 بوصة عالية السطوع', price: 12800, compare: 13900 },
      { slug: 'canopen-remote-io-slave-module', en: 'CANopen Remote I/O Bus Coupler with 16 Channel Expansion', ar: 'وحدة ربط كروت ومداخل بعيدة عبر شبكة CANopen الصناعية', price: 3600, compare: null },
      { slug: 'profinet-ethernet-gateway-bridge', en: 'PROFINET to Modbus RTU Protocol Converter Gateway', ar: 'بوابة تحويل بروتوكولات PROFINET إلى Modbus RTU الصناعية', price: 4900, compare: 5500 },
      { slug: 'high-speed-counter-encoder-card', en: 'Dual-Channel 200kHz High Speed Encoder Counter Module', ar: 'كارت عداد سريع ثنائي القناة بتردد 200 كيلوهرتز للإنكودر', price: 2300, compare: 2600 },
      { slug: 'programmable-safety-relay-controller', en: 'Industrial Programmable Safety Relay with Dual Channel E-Stop', ar: 'ريليه أمان صناعي قابل للبرمجة مع منافذ طوارئ مزدوجة القناة', price: 3800, compare: 4200 },
    ],
  },
  // 4. Motor Drives & VFD Inverters (10 products)
  {
    category: 'motor-drives-vfd',
    items: [
      { slug: 'vfd-inverter-2-2kw-3hp-single-to-3phase', en: '2.2 kW 3HP Single to 3-Phase Variable Frequency Drive VFD', ar: 'مغير سرعة VFD قدرة 2.2 كيلووات 3 حصان دخل أحادي وخرج ثلاثي', price: 4850, compare: 5300 },
      { slug: 'nema-34-closed-loop-stepper-8-5nm', en: 'NEMA 34 Closed Loop Stepper Motor 8.5N.m with Hybrid Driver', ar: 'محرك خطوي NEMA 34 مغلق الحلقة 8.5 نيوتن.متر مع درايفر هجين', price: 3600, compare: 3950 },
      { slug: 'vfd-inverter-7-5kw-10hp-3phase-heavy', en: '7.5 kW 10HP Heavy Duty 3-Phase 380V VFD Inverter Drive', ar: 'إنفرتر صناعي عالي التحمل 7.5 كيلووات 10 حصان ثلاثي الأوجه 380 فولت', price: 11800, compare: 12900 },
      { slug: 'ac-servo-motor-kit-750w-2-4nm', en: '750W AC Servo Motor & Precision Digital Driver Kit 2.4N.m', ar: 'طقم محرك سيرفو كهربائي 750 وات بعزم 2.4 نيوتن ودرايفر رقمي', price: 7900, compare: 8600 },
      { slug: 'nema-23-stepper-motor-3nm-dual-shaft', en: 'NEMA 23 High Torque Stepper Motor 3.0N.m with DM556 Driver', ar: 'محرك خطوي NEMA 23 عالي العزم 3 نيوتن مع درايفر DM556', price: 1750, compare: 1950 },
      { slug: 'vfd-inverter-1-5kw-2hp-compact-ac', en: '1.5 kW 2HP Compact Sensorless Vector Control VFD Drive', ar: 'مغير سرعة VFD مدمج 1.5 كيلووات 2 حصان للمضخات وسيور النقل', price: 3900, compare: 4300 },
      { slug: 'brushless-bldc-motor-driver-400w', en: '400W 36V-48V Industrial Brushless DC BLDC Motor Speed Controller', ar: 'درايفر تحكم في محركات التيار المستمر بدون شربون BLDC قدرة 400 وات', price: 1250, compare: 1400 },
      { slug: 'planetary-gearbox-ratio-10-1-nema34', en: 'Precision Planetary Reduction Gearbox 10:1 for NEMA 34 Motors', ar: 'صندوق تروس كوكبي دقيق نسبة تخفيض 1:10 لمحركات NEMA 34', price: 2800, compare: 3100 },
      { slug: 'servo-motor-brake-kit-1-5kw-flange', en: '1.5 kW 6.0N.m Industrial AC Servo Motor with Electromagnetic Brake', ar: 'محرك سيرفو كهربائي 1.5 كيلووات مع فرامل كهرومغناطيسية مدمجة', price: 12400, compare: 13500 },
      { slug: 'vfd-brake-resistor-box-1000w-50ohm', en: 'Heavy Duty Dynamic Braking Resistor Box 1000W 50 Ohm Aluminum', ar: 'مقاومة فرملة ديناميكية ألومنيوم للإنفرترات قدرة 1000 وات 50 أوم', price: 750, compare: 850 },
    ],
  },
  // 5. Industrial Power Supplies & Protection (10 products)
  {
    category: 'power-supplies-protection',
    items: [
      { slug: 'mean-well-24v-10a-din-rail-power-supply', en: 'Mean Well 24V 10A 240W DIN-Rail Switching Power Supply', ar: 'مزود طاقة صناعي Mean Well سكة DIN جهد 24 فولت تيار 10 أمبير', price: 1950, compare: 2200 },
      { slug: 'type-2-surge-protective-device-spd-40ka', en: 'Type 2 DIN-Rail Surge Protective Device SPD 40kA 3-Phase', ar: 'جهاز حماية من الصواعق وارتفاع الجهد SPD سعة 40 كيلو أمبير', price: 1100, compare: null },
      { slug: 'mean-well-12v-20a-din-rail-supply', en: 'Mean Well 12V 20A 240W Industrial DIN-Rail Power Supply', ar: 'باور سبلاي صناعي سكة DIN جهد 12 فولت تيار 20 أمبير بقدرة 240 وات', price: 1850, compare: 2050 },
      { slug: 'mean-well-48v-10a-480w-power-supply', en: 'Mean Well 48V 10A 480W High Efficiency Power Unit', ar: 'مزود طاقة عالي الكفاءة 48 فولت 10 أمبير قدرة 480 وات للمحركات', price: 3400, compare: 3800 },
      { slug: 'industrial-dc-ups-buffer-module-24v', en: '24V 20A DIN-Rail DC UPS Buffer Module with Supercapacitors', ar: 'وحدة تغذية مستمرة DC UPS بدون بطاريات لحماية الـ PLC من الانقطاع', price: 2900, compare: null },
      { slug: 'molded-case-circuit-breaker-mccb-100a', en: '3-Pole Molded Case Circuit Breaker MCCB 100A Adjustable', ar: 'قاطع دائرة مصبوب MCCB ثلاثي الأقطاب 100 أمبير بحماية حرارية مغناطيسية', price: 2600, compare: 2900 },
      { slug: 'miniature-circuit-breaker-mcb-16a-3p', en: 'DIN-Rail Miniature Circuit Breaker MCB 16A 3-Pole 6kA Curve C', ar: 'مفتاح قاطع فرعي ثلاثي 16 أمبير سكة DIN قدرة فصل 6 كيلو أمبير', price: 380, compare: 420 },
      { slug: 'voltage-monitoring-relay-3-phase-loss', en: '3-Phase Voltage Monitoring Relay Over/Under Voltage & Phase Loss', ar: 'ريليه حماية ثلاثي الأوجه ضد سقوط الفازات وارتفاع وانخفاض الجهد', price: 780, compare: 880 },
      { slug: 'redundancy-module-24v-40a-din-rail', en: 'Dual Redundancy Power Diode Module 24V 40A for Critical Loads', ar: 'وحدة موازنة ومضاعفة التغذية 24 فولت 40 أمبير للأحمال الحرجة', price: 1650, compare: 1850 },
      { slug: 'industrial-noise-emi-line-filter-30a', en: 'Three-Phase Industrial AC EMI/RFI Noise Filter 30A 440V', ar: 'فلتر تنقية الضوضاء الكهرومغناطيسية EMI ثلاثي الأوجه 30 أمبير للإنفرتر', price: 1200, compare: 1350 },
    ],
  },
  // 6. Pneumatics & Solenoid Valves (10 products)
  {
    category: 'pneumatic-components',
    items: [
      { slug: '5-2-way-24vdc-solenoid-pneumatic-valve', en: '5/2 Way 24V DC Single Solenoid Pneumatic Valve 1/4 Inch', ar: 'صمام نيوماتيك 5/2 كهربائي سولينويد 24 فولت مقاس 1/4 بوصة', price: 620, compare: 700 },
      { slug: 'sc-standard-pneumatic-cylinder-50x150', en: 'SC Standard ISO Pneumatic Cylinder 50mm Bore 150mm Stroke', ar: 'سلندر وبستم هواء هوائي قياسي SC قطر 50 مم ومشوار 150 مم', price: 1450, compare: null },
      { slug: 'pneumatic-air-filter-regulator-frl-unit', en: 'Pneumatic Air Filter Regulator Lubricator FRL Unit 3/8 Inch', ar: 'وحدة معالجة هواء مضغوط ثلاثية FRL فلتر ومنظم ومزيتة 3/8 بوصة', price: 980, compare: 1150 },
      { slug: 'compact-thin-air-cylinder-sda-32x25', en: 'SDA Compact Air Cylinder 32mm Bore 25mm Stroke Short Body', ar: 'سلندر هواء مدمج قصير SDA قطر 32 مم ومشوار 25 مم للمساحات الضيقة', price: 680, compare: 780 },
      { slug: '5-3-way-closed-center-solenoid-valve', en: '5/3 Way Double Solenoid Closed Center Pneumatic Valve 1/4"', ar: 'صمام نيوماتيك 5/3 بملفين مزدوجين مع مركز مغلق لتثبيت البستم في موضعه', price: 1150, compare: 1300 },
      { slug: 'pneumatic-finger-gripper-air-chuck', en: 'Parallel Pneumatic Angular Finger Gripper Air Chuck 20mm', ar: 'مقبض هواء نيوماتيكي متوازي للروبوتات وخطوط التجميع 20 مم', price: 1850, compare: 2100 },
      { slug: 'air-solenoid-valve-manifold-5-station', en: 'Aluminum Pneumatic Valve Manifold Base 5 Stations G1/4"', ar: 'قاعدة مانيفولد ألومنيوم لتجميع 5 صمامات هواء في بلوك واحد', price: 820, compare: 920 },
      { slug: 'quick-exhaust-pneumatic-valve-1-2', en: 'High Flow Quick Exhaust Valve G1/2 Inch for Fast Piston Return', ar: 'صمام تفريغ هواء سريع مقاس 1/2 بوصة لزيادة سرعة رجوع البستم', price: 340, compare: 390 },
      { slug: 'polyurethane-pneumatic-hose-100m-8x5', en: 'Flexible Polyurethane Pneumatic Air Tubing Hose 8mm x 5.5mm 100M', ar: 'لفة خرطوم بولي يوريثان هواء مضغوط عالي المرونة مقاس 8 مم طول 100 متر', price: 1250, compare: 1400 },
      { slug: 'digital-pressure-switch-pneumatic-sensor', en: 'Digital Vacuum & Air Pressure Switch with Dual NPN Output', ar: 'حساس ومفتاح ضغط هواء وتفريغ رقمي مع شاشة عرض مدمجة', price: 1650, compare: 1850 },
    ],
  },
  // 7. IoT Modules & Wireless Telemetry (10 products)
  {
    category: 'iot-wireless-telemetry',
    items: [
      { slug: 'industrial-4g-lte-cellular-gateway', en: 'Industrial 4G LTE Cellular Gateway RS485 Modbus to MQTT', ar: 'بوابة اتصالات صناعية 4G LTE لتحويل Modbus RS485 إلى MQTT', price: 3800, compare: 4200 },
      { slug: 'sx1262-lora-telemetry-transceiver', en: 'SX1262 LoRa Telemetry Transceiver 868/915MHz with Antenna', ar: 'موديول إرسال واستقبال LoRa طراز SX1262 مع هوائي عالي الكسب', price: 750, compare: null },
      { slug: 'lorawan-8-channel-outdoor-gateway', en: 'LoRaWAN 8-Channel Industrial Gateway IP67 with PoE and GPS', ar: 'بوابة LoRaWAN صناعية خارجية 8 قنوات مع حماية IP67 ونظام GPS', price: 14500, compare: 16000 },
      { slug: 'zigbee-3-0-coordinator-usb-gateway', en: 'Zigbee 3.0 Industrial USB Gateway Coordinator CC2652P +20dBm', ar: 'بوابة ومنسق شبكات Zigbee 3.0 صناعي بهوائي خارجي قوي', price: 850, compare: 950 },
      { slug: 'industrial-wifi-ethernet-serial-bridge', en: 'DIN-Rail Serial to Wi-Fi & Ethernet Server RS232/RS485 Bridge', ar: 'سيرفر ومحول تسلسلي RS232/RS485 إلى Wi-Fi وشبكة سلكية على سكة DIN', price: 1950, compare: 2200 },
      { slug: '4g-lte-remote-relay-controller-8ch', en: '4G LTE Cellular 8-Channel SMS / Call Remote Control Relay Switch', ar: 'لوحة تحكم عن بعد 8 ريليه عبر شريحة المحمول 4G والمكالمات والرسائل', price: 2900, compare: 3200 },
      { slug: 'ble-5-0-long-range-mesh-beacon', en: 'BLE 5.0 Industrial Long Range Location & Tracking Beacon IP68', ar: 'منارة تتبع موقع وبلوتوث 5.0 صناعية بمدى طويل وبطارية 5 سنوات', price: 420, compare: 480 },
      { slug: 'modbus-rtu-wireless-rf-transceiver-pair', en: 'Point-to-Point Wireless Modbus RS485 RF Transceiver Pair 2km', ar: 'زوج وحدات نقل بيانات Modbus RS485 لاسلكياً حتى 2 كم بدون كابلات', price: 2200, compare: 2500 },
      { slug: 'satellite-iot-tracker-modem-module', en: 'Satellite IoT Communication Transceiver Module for Extreme Remote Areas', ar: 'موديول اتصال سحابي عبر الأقمار الصناعية للمناطق النائية والصحراوية', price: 6800, compare: null },
      { slug: 'industrial-vpn-router-dual-sim-4g', en: 'Industrial VPN Router Dual SIM 4G LTE with 4 Ethernet Ports', ar: 'راوتر صناعي 4G LTE مع شريحتي اتصال ودعم شبكات VPN الآمنة', price: 5400, compare: 5900 },
    ],
  },
  // 8. Measurement & Calibration Tools (10 products)
  {
    category: 'measurement-test-tools',
    items: [
      { slug: 'true-rms-industrial-digital-multimeter', en: 'True-RMS Industrial Digital Multimeter 6000 Counts Cat III', ar: 'ملتيميتر رقمي صناعي True-RMS دقة 6000 قراءة مع حماية Cat III', price: 1650, compare: 1850 },
      { slug: 'dual-channel-100mhz-digital-oscilloscope', en: 'Dual-Channel 100MHz Digital Storage Oscilloscope 1GSa/s', ar: 'أوسيلوسكوب معملي رقمي قناتين بتردد 100 ميجاهرتز ومعدل 1GSa/s', price: 11500, compare: 12800 },
      { slug: 'clamp-meter-ac-dc-600a-true-rms', en: 'AC/DC Clamp Meter 600A True-RMS Inrush Current & Temp Tester', ar: 'بنسة أمبير رقمية للتيار المتردد والمستمر 600 أمبير مع قياس الحرارة', price: 1950, compare: 2200 },
      { slug: 'insulation-resistance-tester-megger-1000v', en: 'Digital Insulation Resistance Megger Tester 100V to 1000V', ar: 'جهاز ميجر رقمي لقياس عزل كابلات ومحركات الكهرباء حتى 1000 فولت', price: 3400, compare: 3800 },
      { slug: 'process-calibrator-4-20ma-0-10v-signal', en: 'Handheld Multifunction Process Calibrator 4-20mA / 0-10V Generator', ar: 'جهاز معايرة وتوليد إشارات 4-20 مللي أمبير و0-10 فولت لحساسات المصانع', price: 4200, compare: 4700 },
      { slug: 'thermal-imaging-camera-industrial-256x192', en: 'Industrial Handheld Infrared Thermal Imaging Camera 256x192', ar: 'كاميرا تصوير حراري صناعية للأشعة تحت الحمراء لكشف سخونة اللوحات', price: 14800, compare: 16500 },
      { slug: 'logic-analyzer-16-channel-100mhz-usb', en: '16-Channel 100MHz High Speed USB Logic Analyzer for Digital Bus', ar: 'محلل إشارات رقمي 16 قناة 100 ميجاهرتز لبروتوكولات SPI وI2C وUART', price: 2100, compare: 2400 },
      { slug: 'laser-tachometer-non-contact-rpm-meter', en: 'Digital Non-Contact Optical Laser Tachometer 2.5 to 99999 RPM', ar: 'تاكوميتر ليزري لقياس سرعة دوران محركات المصانع بدون تلامس', price: 680, compare: 760 },
      { slug: 'digital-sound-level-decibel-meter', en: 'Class 2 Calibrated Digital Sound Level Decibel Meter 30-130dB', ar: 'جهاز قياس شدة الضوضاء والديسيبل في بيئات العمل والمصانع', price: 950, compare: 1100 },
      { slug: 'precision-lcr-bridge-meter-component-tester', en: 'Benchtop Precision LCR Bridge Meter for Inductors & Capacitors', ar: 'جهاز معملي دقيق لفحص وقياس الملفات والمكثفات والمقاومات LCR', price: 6800, compare: 7500 },
    ],
  },
  // 9. Solid State Relays & Contactors (10 products)
  {
    category: 'relays-switching',
    items: [
      { slug: 'solid-state-relay-ssr-40a-dc-ac', en: 'Solid State Relay SSR 40A DC-AC 3-32VDC Input 24-380VAC Output', ar: 'ريليه حالة صلبة SSR تيار 40 أمبير دخل DC وخرج AC', price: 420, compare: null },
      { slug: '3-pole-ac-contactor-25a-220v-coil', en: '3-Pole AC Contactor 25A 220V Coil with 1NO Auxiliary Contact', ar: 'كونتاكتور ثلاثي الأقطاب 25 أمبير بملف تشغيل 220 فولت وتلامس مساعد', price: 580, compare: 650 },
      { slug: '3-phase-ssr-80a-heat-sink-fan-unit', en: 'Three-Phase Solid State Relay 80A with Extruded Heatsink & Fan', ar: 'ريليه حالة صلبة ثلاثي الأوجه 80 أمبير مع مبرد ألومنيوم ومروحة تبريد', price: 1850, compare: 2100 },
      { slug: 'heavy-duty-ac-contactor-65a-220v', en: '3-Pole Heavy Industrial Contactor 65A (AC-3 30kW) 220V Coil', ar: 'كونتاكتور قدرة عالي التحمل 65 أمبير لمحركات 30 كيلووات', price: 1450, compare: 1650 },
      { slug: 'thermal-overload-relay-23-32a-adjustable', en: 'Adjustable Thermal Overload Protection Relay 23A to 32A', ar: 'أوفرلود حراري قابل للضبط من 23 إلى 32 أمبير لحماية المحركات', price: 620, compare: 700 },
      { slug: 'miniature-power-relay-14-pin-4pdt-24vdc', en: 'Electromagnetic Miniature Power Relay 14-Pin 4PDT 24V DC with Socket', ar: 'ريليه كهرومغناطيسي 14 طرف 4 مجموعات تلامس مع قاعدة DIN وليد بيان', price: 190, compare: 230 },
      { slug: 'solid-state-relay-ssr-dc-dc-40a', en: 'DC to DC Solid State Relay SSR 40A 3-32VDC In 5-220VDC Out', ar: 'ريليه حالة صلبة دخل تيار مستمر وخرج تيار مستمر 40 أمبير DC-DC', price: 540, compare: 620 },
      { slug: 'safety-interlock-switch-key-type', en: 'Heavy Duty Key Interlock Safety Switch IP67 for Guard Doors', ar: 'مفتاح أمان ميكانيكي بمفتاح لمنع فتح أبواب ماكينات الإنتاج أثناء التشغيل', price: 1350, compare: 1550 },
      { slug: 'illuminated-emergency-stop-pushbutton', en: 'Industrial 22mm Turn-to-Reset Illuminated Emergency Stop Pushbutton', ar: 'زر طوارئ أحمر فطر 22 مم مع إضاءة ليد وإلغاء القفل بالتدوير', price: 280, compare: 320 },
      { slug: 'selector-switch-3-position-maintained', en: 'Industrial 22mm 3-Position Maintained Selector Switch 2NO', ar: 'مفتاح اختيار 3 أوضاع 22 مم صناعي مع نقطتي تلامس مفتوحتين', price: 210, compare: 250 },
    ],
  },
  // 10. Industrial Cabling & Connectors (10 products)
  {
    category: 'cables-connectors',
    items: [
      { slug: 'm12-4-pin-waterproof-sensor-cable-5m', en: 'M12 4-Pin A-Coded Waterproof Sensor Cable Male to Female 5M', ar: 'كابل حساسات صناعي M12 رباعي الأطراف معزول ضد الماء طول 5 متر', price: 280, compare: 320 },
      { slug: 'm8-3-pin-sensor-extension-cord-3m', en: 'M8 3-Pin Nano Sensor Extension Cord Straight Connector 3M', ar: 'كابل تمديد لحساسات M8 ثلاثي الأطراف معزول ضد الزيوت طول 3 متر', price: 210, compare: 240 },
      { slug: 'shielded-twisted-pair-rs485-cable-100m', en: 'Industrial Shielded Twisted Pair RS485 Belden Type Cable 100M', ar: 'لفة كابل نقل بيانات RS485 مصفح ومجدول مزدوج طول 100 متر', price: 2400, compare: 2700 },
      { slug: 'din-rail-feed-through-terminal-blocks-50pcs', en: 'DIN-Rail Feed Through Terminal Blocks 2.5mm Gray (Pack of 50)', ar: 'طقم روزيتات وسكك توصيل سلكية 2.5 مم سكة DIN عبوة 50 قطعة', price: 450, compare: 520 },
      { slug: 'ground-pe-din-rail-terminals-20pcs', en: 'Green-Yellow Ground PE Protective Earth DIN Terminals (Pack of 20)', ar: 'طقم روزيتات أرضي خضراء وصفراء لسكة DIN عبوة 20 قطعة', price: 260, compare: 300 },
      { slug: 'heavy-duty-industrial-rectangular-connector-16pin', en: 'Heavy Duty Industrial Rectangular Multi-Pole Connector 16-Pin 16A', ar: 'كونكتور مضلع صناعي عالي التحمل 16 طرف تيار 16 أمبير للأفران والماكينات', price: 1450, compare: 1650 },
      { slug: 'waterproof-metal-cable-glands-m20-10pcs', en: 'Nickel-Plated Brass Waterproof Cable Glands M20 IP68 (Pack of 10)', ar: 'جلاندات كابلات نحاسية مطلية بالنيكل مقاس M20 ضد الماء عبوة 10 قطع', price: 380, compare: 440 },
      { slug: 'drag-chain-high-flex-shielded-cable-10m', en: 'High-Flex CNC Drag Chain Servo Control Cable 4x1.5mm 10M', ar: 'كابل فائق المرونة لسلاسل الحركة لماكينات الـ CNC طول 10 أمتار', price: 950, compare: 1100 },
      { slug: 'm12-field-wireable-screw-terminal-plug', en: 'M12 4-Pin Field Wireable Straight Male Connector with Screw Terminals', ar: 'كونكتور M12 رباعي الأطراف للتجميع الميداني السريع بدون لحام', price: 180, compare: 210 },
      { slug: 'flexible-split-wire-loom-conduit-50m', en: 'Industrial Flame-Retardant Flexible Corrugated Cable Conduit 50M', ar: 'خرطوم حماية كابلات حلزوني مرن مقاوم للهب والحرارة طول 50 متر', price: 780, compare: 890 },
    ],
  },
]

async function main() {
  console.log('Seeding 100 products with realistic category-matched photography...')

  const categoryMap = new Map()
  const allCategories = await prisma.category.findMany()
  for (const c of allCategories) {
    categoryMap.set(c.slug, c.id)
  }

  let seededCount = 0

  for (const group of catalogBlueprint) {
    const categoryId = categoryMap.get(group.category)
    if (!categoryId) {
      console.warn(`Category slug not found: ${group.category}`)
      continue
    }

    const imgPool = categoryImages[group.category] || []

    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i]
      const imageUrl = imgPool[i % imgPool.length]

      const product = await prisma.product.upsert({
        where: { slug: item.slug },
        update: {
          nameEn: item.en,
          nameAr: item.ar,
          price: item.price,
          compareAtPrice: item.compare,
          categoryId: categoryId,
          isActive: true,
        },
        create: {
          slug: item.slug,
          nameEn: item.en,
          nameAr: item.ar,
          descriptionEn: `High reliability industrial grade ${item.en}. Tested and certified for automation and commercial facilities.`,
          descriptionAr: `منتج عالي الجودة ومعتمد صناعياً (${item.ar}). تم اختباره ومطابقته لأعلى المعايير الهندسية للأتمتة والمنشآت.`,
          price: item.price,
          compareAtPrice: item.compare,
          categoryId: categoryId,
          isActive: true,
        },
      })

      // Clean existing images and set the cover image
      await prisma.productImage.deleteMany({
        where: { productId: product.id },
      })

      await prisma.productImage.create({
        data: {
          productId: product.id,
          path: imageUrl,
          altEn: item.en,
          altAr: item.ar,
          isCover: true,
          sortOrder: 1,
        },
      })

      // Ensure SEO record
      await prisma.productSeo.upsert({
        where: { productId: product.id },
        update: {
          metaTitleEn: `${item.en} | Mango Electronics`,
          metaTitleAr: `${item.ar} | مانجو إلكترونيكس`,
        },
        create: {
          productId: product.id,
          metaTitleEn: `${item.en} | Mango Electronics`,
          metaTitleAr: `${item.ar} | مانجو إلكترونيكس`,
          keywords: `${item.en}, ${item.ar}, Egypt, Mango Electronics`,
        },
      })

      seededCount++
    }
  }

  const finalTotal = await prisma.product.count()
  const imageTotal = await prisma.productImage.count()
  console.log(`Successfully seeded ${seededCount} products! Total in DB: ${finalTotal}, Total cover images: ${imageTotal}`)
}

main()
  .catch(e => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
