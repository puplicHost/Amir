import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const categoriesData = [
  {
    slug: 'microcontrollers-embedded',
    nameEn: 'Microcontrollers & Embedded Systems',
    nameAr: 'المتحكمات الدقيقة والأنظمة المدمجة',
    descriptionEn: 'High-performance microcontrollers, development boards, and embedded compute modules for automation and prototyping.',
    descriptionAr: 'متحكمات دقيقة ولوحات تطوير وأنظمة مدمجة متقدمة لمشاريع التحكم والأتمتة.',
    featuredOnHomepage: true,
    sortOrder: 1,
  },
  {
    slug: 'industrial-sensors',
    nameEn: 'Industrial Sensors & Transducers',
    nameAr: 'الحساسات ومجسات القياس الصناعية',
    descriptionEn: 'Rugged inductive, photoelectric, ultrasonic, temperature, and pressure sensors for factory monitoring.',
    descriptionAr: 'حساسات تقاربية، كهروضوئية، حرارية، وضغط للرصد الصناعي وخطوط الإنتاج.',
    featuredOnHomepage: true,
    sortOrder: 2,
  },
  {
    slug: 'plc-automation-modules',
    nameEn: 'PLC & Automation Controllers',
    nameAr: 'وحدات PLC ومتحكمات الأتمتة الصناعية',
    descriptionEn: 'Programmable logic controllers, expansion I/O blocks, and industrial communication adapters.',
    descriptionAr: 'وحدات تحكم منطقي مبرمج، كروت توسعة للمداخل والمخارج، ومحولات اتصالات صناعية.',
    featuredOnHomepage: true,
    sortOrder: 3,
  },
  {
    slug: 'motor-drives-vfd',
    nameEn: 'Motor Drives & VFD Inverters',
    nameAr: 'مغيرات السرعة ومحركات الحركة VFD',
    descriptionEn: 'Variable frequency drives, servo amplifiers, and precision stepper motor controllers.',
    descriptionAr: 'إنفرترات متطورة للتحكم في سرعة المحركات الثلاثية، مشغلات السيرفو والمحركات الخطوية.',
    featuredOnHomepage: true,
    sortOrder: 4,
  },
  {
    slug: 'power-supplies-protection',
    nameEn: 'Industrial Power Supplies & Protection',
    nameAr: 'مزودات الطاقة الصناعية وأنظمة الحماية',
    descriptionEn: 'DIN-rail switching power supplies, surge arresters, circuit breakers, and battery backup systems.',
    descriptionAr: 'باور سبلاي سكة DIN، فواصم ومفاتيح حماية حرارية، ومصادر طاقة احتياطية.',
    featuredOnHomepage: true,
    sortOrder: 5,
  },
  {
    slug: 'pneumatic-components',
    nameEn: 'Pneumatics & Solenoid Valves',
    nameAr: 'المكونات الهوائية وصمامات السولينويد',
    descriptionEn: 'Compressed air cylinders, directional control solenoid valves, regulators, and fast fittings.',
    descriptionAr: 'سلندرات وبساتم هوائية، صمامات سولينويد كهربائية، منظمات ضغط وتوصيلات سريعة.',
    featuredOnHomepage: true,
    sortOrder: 6,
  },
  {
    slug: 'iot-wireless-telemetry',
    nameEn: 'IoT Modules & Wireless Telemetry',
    nameAr: 'وحدات إنترنت الأشياء والاتصالات اللاسلكية',
    descriptionEn: 'LoRaWAN gateways, 4G LTE cellular modems, Wi-Fi ESP32 controllers, and RF transceivers.',
    descriptionAr: 'بوابات LoRa، مودمات شبكات المحمول الصناعية، وحدات ESP32 وهوائيات الاتصال اللاسلكي.',
    featuredOnHomepage: false,
    sortOrder: 7,
  },
  {
    slug: 'measurement-test-tools',
    nameEn: 'Measurement & Calibration Tools',
    nameAr: 'أجهزة القياس والمعايرة الإلكترونية',
    descriptionEn: 'Digital multimeters, dual-channel oscilloscopes, logic analyzers, and calibration test sources.',
    descriptionAr: 'أجهزة ملتيميتر رقمية، أوسيلوسكوب معملي ومحمول، ومحللات إشارات رقمية.',
    featuredOnHomepage: false,
    sortOrder: 8,
  },
  {
    slug: 'relays-switching',
    nameEn: 'Solid State Relays & Contactors',
    nameAr: 'الريليهات والكونتاكتورات ومفاتيح التوصيل',
    descriptionEn: 'Optocoupled solid state relays, industrial contactors, thermal overloads, and pushbuttons.',
    descriptionAr: 'ريليهات الحالة الصلبة SSR، كونتاكتورات قدرة، أوفرلود حراري ومفاتيح تحكم.',
    featuredOnHomepage: false,
    sortOrder: 9,
  },
  {
    slug: 'cables-connectors',
    nameEn: 'Industrial Cabling & M12 Connectors',
    nameAr: 'الكابلات الصناعية وكونكتورات M12',
    descriptionEn: 'Shielded sensor cables, M12/M8 waterproof connectors, terminal blocks, and cable glands.',
    descriptionAr: 'كابلات إشارات معزولة، كونكتورات M12 مقاومة للماء، روزيتات وسكك توصيل.',
    featuredOnHomepage: false,
    sortOrder: 10,
  },
]

const productsData = [
  // 1. Microcontrollers & Embedded
  {
    slug: 'stm32f407-cortex-m4-dev-board',
    categorySlug: 'microcontrollers-embedded',
    nameEn: 'STM32F407VGT6 ARM Cortex-M4 Development Board',
    nameAr: 'لوحة تطوير STM32F407VGT6 بمعالج ARM Cortex-M4',
    descriptionEn: 'High-performance 168MHz microcontroller board with hardware FPU, 1MB Flash, 192KB RAM, and extensive peripheral interfaces.',
    descriptionAr: 'لوحة تطوير احترافية بتردد 168 ميجاهرتز مع وحدة حساب عائم، ذاكرة فلاش 1 ميجابايت، ودعم كامل لمنافذ الاتصال الصناعية.',
    price: 1250.00,
    compareAtPrice: 1450.00,
    attributes: [
      { keyEn: 'Processor Core', keyAr: 'المعالج', valueEn: 'ARM Cortex-M4 32-bit', valueAr: 'ARM Cortex-M4 32 بت' },
      { keyEn: 'Clock Speed', keyAr: 'التردد', valueEn: '168 MHz', valueAr: '168 ميجاهرتز' },
      { keyEn: 'Flash Memory', keyAr: 'ذاكرة الفلاش', valueEn: '1 MB', valueAr: '1 ميجابايت' },
      { keyEn: 'Supply Voltage', keyAr: 'جهد التشغيل', valueEn: '5V DC USB / 3.3V Pin', valueAr: '5 فولت عبر USB أو 3.3 فولت' },
    ],
  },
  {
    slug: 'esp32-s3-dual-core-module',
    categorySlug: 'microcontrollers-embedded',
    nameEn: 'ESP32-S3 Dual-Core Wi-Fi & BLE Development Module',
    nameAr: 'وحدة تطوير ESP32-S3 ثنائية النواة مع واي فاي وبلوتوث',
    descriptionEn: 'AI-accelerated Xtensa LX7 dual-core SoC with 2.4GHz Wi-Fi and Bluetooth 5 LE, ideal for IoT edge analytics.',
    descriptionAr: 'شريحة ثنائية النواة بقدرات تسريع الذكاء الاصطناعي، اتصال واي فاي وبلوتوث 5، مثالية لتطبيقات إنترنت الأشياء والتحكم عن بعد.',
    price: 580.00,
    compareAtPrice: 650.00,
    attributes: [
      { keyEn: 'Wireless', keyAr: 'الاتصال اللاسلكي', valueEn: 'Wi-Fi 802.11 b/g/n + BLE 5.0', valueAr: 'واي فاي وبلوتوث 5.0' },
      { keyEn: 'SRAM', keyAr: 'ذاكرة الرام', valueEn: '512 KB Internal + 8MB PSRAM', valueAr: '512 كيلوبايت داخلية مع 8 ميجا PSRAM' },
      { keyEn: 'GPIO Pins', keyAr: 'أطراف التوصيل', valueEn: '45 Programmable Pins', valueAr: '45 طرف قابل للبرمجة' },
    ],
  },
  {
    slug: 'raspberry-pi-cm4-compute-module',
    categorySlug: 'microcontrollers-embedded',
    nameEn: 'Raspberry Pi CM4 Compute Module 4GB RAM 32GB eMMC',
    nameAr: 'وحدة حوسبة Raspberry Pi CM4 بذاكرة 4 جيجا وسعة 32 جيجا',
    descriptionEn: 'Quad-core Cortex-A72 64-bit computing engine in a compact form factor for industrial embedded systems.',
    descriptionAr: 'محرك معالجة رباعي النواة مخصص للدمج في لوحات التحكم الصناعية مع ذاكرة 4 جيجابايت وتخزين مدمج 32 جيجابايت.',
    price: 4200.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'SoC', keyAr: 'المعالج', valueEn: 'Broadcom BCM2711 Quad-core 1.5GHz', valueAr: 'رباعي النواة 1.5 جيجاهرتز' },
      { keyEn: 'Storage', keyAr: 'وحدة التخزين', valueEn: '32GB eMMC High Reliability', valueAr: 'ذاكرة تخزين 32 جيجابايت eMMC' },
      { keyEn: 'Ethernet', keyAr: 'الشبكة', valueEn: 'Gigabit Ethernet PHY onboard', valueAr: 'منفذ شبكة جيجابت إيثرنت' },
    ],
  },

  // 2. Industrial Sensors
  {
    slug: 'm18-inductive-proximity-sensor-npn',
    categorySlug: 'industrial-sensors',
    nameEn: 'M18 Inductive Proximity Sensor NPN Normally Open',
    nameAr: 'حساس تقاربي حثي M18 نوع NPN مفتوح طبيعيا',
    descriptionEn: 'High-accuracy inductive proximity detector with 8mm sensing range, IP67 nickel-plated brass body, and LED indicator.',
    descriptionAr: 'حساس كهرومغناطيسي عالي الحساسية للكشف عن المعادن بمدى 8 مم، مع هيكل معدني مقاوم للماء والأتربة IP67.',
    price: 380.00,
    compareAtPrice: 440.00,
    attributes: [
      { keyEn: 'Sensing Distance', keyAr: 'مسافة الاستشعار', valueEn: '8 mm', valueAr: '8 مم' },
      { keyEn: 'Output Type', keyAr: 'نوع الخرج', valueEn: 'NPN Normally Open (NO)', valueAr: 'NPN مفتوح طبيعيا' },
      { keyEn: 'Supply Voltage', keyAr: 'جهد التشغيل', valueEn: '10-30V DC', valueAr: '10 إلى 30 فولت مستمر' },
      { keyEn: 'Protection Rating', keyAr: 'درجة الحماية', valueEn: 'IP67 Waterproof', valueAr: 'IP67 مقاوم للماء والزيوت' },
    ],
  },
  {
    slug: 'pt100-rtd-temperature-sensor-stainless',
    categorySlug: 'industrial-sensors',
    nameEn: 'PT100 RTD Temperature Sensor 3-Wire Stainless Steel Probe',
    nameAr: 'مستشعر حرارة مقاومي PT100 ثلاثي الأسلاك بمسبار استانلس',
    descriptionEn: 'Platinum resistance temperature detector rated from -50C to +400C with braided armored lead wire for boilers and ovens.',
    descriptionAr: 'مستشعر بلاتيني فائق الدقة لقياس درجات الحرارة من -50 إلى +400 درجة مئوية بمسبار فولاذي مقاوم للصدأ.',
    price: 490.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Temperature Range', keyAr: 'نطاق درجات الحرارة', valueEn: '-50C to +400C', valueAr: '-50 إلى +400 مئوية' },
      { keyEn: 'Probe Diameter', keyAr: 'قطر المسبار', valueEn: '5 mm x 100 mm', valueAr: '5 مم طول 100 مم' },
      { keyEn: 'Wiring Configuration', keyAr: 'طريقة التوصيل', valueEn: '3-Wire Class A', valueAr: '3 أطراف فئة A' },
    ],
  },
  {
    slug: 'piezo-pressure-transmitter-0-10bar',
    categorySlug: 'industrial-sensors',
    nameEn: '0-10 Bar Piezoelectric Pressure Transmitter 4-20mA',
    nameAr: 'محول ضغط بيزوكهربائي 0-10 بار بإشارة خرج 4-20 مللي أمبير',
    descriptionEn: 'Stainless steel isolated pressure transducer for hydraulic lines, water pipes, and pneumatic circuits.',
    descriptionAr: 'محول ضغط صناعي هيدروليكي ونيوماتيكي من الفولاذ المقاوم للصدأ مع إشارة خرج قياسية 4-20 مللي أمبير.',
    price: 1850.00,
    compareAtPrice: 2100.00,
    attributes: [
      { keyEn: 'Pressure Range', keyAr: 'مدى الضغط', valueEn: '0 to 10 Bar (0-1 MPa)', valueAr: '0 إلى 10 بار' },
      { keyEn: 'Output Signal', keyAr: 'إشارة الخرج', valueEn: '4-20 mA Two-Wire', valueAr: '4-20 مللي أمبير سلكين' },
      { keyEn: 'Thread Connection', keyAr: 'سن التوصيل', valueEn: 'G 1/4 Male Thread', valueAr: 'سن خارجي G 1/4 بوصة' },
    ],
  },

  // 3. PLC & Automation Modules
  {
    slug: 'industrial-plc-controller-14di-10do',
    categorySlug: 'plc-automation-modules',
    nameEn: 'Industrial PLC Controller 14 DI / 10 DO Transistor Output',
    nameAr: 'وحدة تحكم PLC صناعية 14 دخل رقمي / 10 خرج ترانزستور',
    descriptionEn: 'Compact DIN-rail programmable logic controller supporting Ladder Logic, high-speed pulse output for stepping motors, and RS485 Modbus.',
    descriptionAr: 'متحكم منطقي صناعي يدعم لغة Ladder ومخارج نبضية سريعة للتحكم في محركات السيرفو والستبر عبر بروتوكول RS485 Modbus.',
    price: 5400.00,
    compareAtPrice: 5900.00,
    attributes: [
      { keyEn: 'Digital Inputs', keyAr: 'المداخل الرقمية', valueEn: '14 Channels (NPN / PNP)', valueAr: '14 مدخل رقمي' },
      { keyEn: 'Digital Outputs', keyAr: 'المخارج الرقمية', valueEn: '10 Transistor Outputs', valueAr: '10 مخارج ترانزستور' },
      { keyEn: 'Communication Ports', keyAr: 'منافذ الاتصال', valueEn: 'RS232 + Dual RS485', valueAr: 'منفذ RS232 مع منفذي RS485' },
    ],
  },
  {
    slug: '7-inch-color-hmi-touchscreen-panel',
    categorySlug: 'plc-automation-modules',
    nameEn: '7-Inch Color TFT Touchscreen HMI Panel RS485 Ethernet',
    nameAr: 'شاشة لمس صناعية HMI ملونة 7 بوصة بمنافذ RS485 وإيثرنت',
    descriptionEn: 'Industrial operator interface terminal with 800x480 resolution, 65k colors, USB host, and comprehensive driver support for major PLCs.',
    descriptionAr: 'شاشة تشغيل صناعية عالية الدقة تدعم الاتصال بكافة ماركات الـ PLC العالمية لمراقبة خطوط الإنتاج والتحكم الفوري.',
    price: 7200.00,
    compareAtPrice: 7800.00,
    attributes: [
      { keyEn: 'Display Size', keyAr: 'مقاس الشاشة', valueEn: '7 Inch TFT 800x480', valueAr: '7 بوصة بدقة 800x480' },
      { keyEn: 'Supported Protocols', keyAr: 'البروتوكولات المدعومة', valueEn: 'Modbus RTU/TCP, Siemens, Delta', valueAr: 'Modbus RTU/TCP، سيمنز، دلتا' },
      { keyEn: 'Ingress Protection', keyAr: 'حماية اللوحة الأمامية', valueEn: 'IP65 Front Panel', valueAr: 'IP65 مقاومة للأتربة ورذاذ السوائل' },
    ],
  },
  {
    slug: '8-channel-analog-input-rtd-tc-module',
    categorySlug: 'plc-automation-modules',
    nameEn: '8-Channel Analog Input RTD/TC Expansion Module',
    nameAr: 'كارت توسعة 8 قنوات دخل تماثلي لحساسات الحرارة RTD/TC',
    descriptionEn: 'Isolated 16-bit analog temperature acquisition module communicating over RS485 Modbus RTU with auto-calibration.',
    descriptionAr: 'كارت قراءة تماثلي معزول بدقة 16 بت مخصص لربط 8 حساسات حرارة مع لوحات التحكم PLC أو الحواسيب الصناعية.',
    price: 2950.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Input Channels', keyAr: 'عدد القنوات', valueEn: '8 Channels Universal RTD/Thermocouple', valueAr: '8 قنوات حرارية' },
      { keyEn: 'Resolution', keyAr: 'دقة التحويل', valueEn: '16-bit ADC', valueAr: '16 بت' },
      { keyEn: 'Isolation', keyAr: 'العزل الكهربائي', valueEn: '1500V Opto-isolated', valueAr: 'عزل بصري 1500 فولت' },
    ],
  },

  // 4. Motor Drives & VFD Inverters
  {
    slug: 'vfd-inverter-2-2kw-3hp-single-to-3phase',
    categorySlug: 'motor-drives-vfd',
    nameEn: '2.2 kW 3HP Single to 3-Phase Variable Frequency Drive VFD',
    nameAr: 'مغير سرعة VFD قدرة 2.2 كيلووات 3 حصان دخل أحادي وخرج ثلاثي',
    descriptionEn: 'Sensorless vector control AC drive accepting 220V single-phase input and outputting 0-400Hz 3-phase for spindle and conveyor motors.',
    descriptionAr: 'إنفرتر ذكي للتحكم السلس في سرعة وعزم المحركات الكهربائية بقدرة 3 حصان مع حماية كاملة ضد الحمل الزائد وسقوط الفازات.',
    price: 4850.00,
    compareAtPrice: 5300.00,
    attributes: [
      { keyEn: 'Rated Power', keyAr: 'القدرة المقننة', valueEn: '2.2 kW (3.0 HP)', valueAr: '2.2 كيلووات (3 حصان)' },
      { keyEn: 'Input / Output', keyAr: 'جهد الدخل والخرج', valueEn: '1-Phase 220V In / 3-Phase 220V Out', valueAr: 'دخل 220 فولت وجه واحد / خرج 220 فولت ثلاثي' },
      { keyEn: 'Frequency Range', keyAr: 'نطاق التردد', valueEn: '0.00 to 400.00 Hz', valueAr: '0 إلى 400 هرتز' },
    ],
  },
  {
    slug: 'nema-34-closed-loop-stepper-8-5nm',
    categorySlug: 'motor-drives-vfd',
    nameEn: 'NEMA 34 Closed Loop Stepper Motor 8.5N.m with Hybrid Driver',
    nameAr: 'محرك خطوي NEMA 34 مغلق الحلقة 8.5 نيوتن.متر مع درايفر هجين',
    descriptionEn: 'Heavy-duty closed loop stepper motor kit with integrated 1000-line optical encoder, preventing step loss on CNC routers.',
    descriptionAr: 'طقم محرك ستبر قوي بعزم 8.5 نيوتن مع إنكودر مدمج ودرايفر هجين يمنع فقدان الخطوات في ماكينات الـ CNC والراوتر.',
    price: 3600.00,
    compareAtPrice: 3950.00,
    attributes: [
      { keyEn: 'Holding Torque', keyAr: 'عزم التثبيت', valueEn: '8.5 N.m', valueAr: '8.5 نيوتن.متر' },
      { keyEn: 'Encoder Resolution', keyAr: 'دقة الإنكودر', valueEn: '1000 Lines / CPR', valueAr: '1000 نبضة لكل دورة' },
      { keyEn: 'Driver Voltage', keyAr: 'جهد تشغيل الدرايفر', valueEn: '24-80V DC / 20-60V AC', valueAr: '24 إلى 80 فولت مستمر' },
    ],
  },

  // 5. Industrial Power Supplies & Protection
  {
    slug: 'mean-well-24v-10a-din-rail-power-supply',
    categorySlug: 'power-supplies-protection',
    nameEn: 'Mean Well 24V 10A 240W DIN-Rail Switching Power Supply',
    nameAr: 'مزود طاقة صناعي Mean Well سكة DIN جهد 24 فولت تيار 10 أمبير',
    descriptionEn: 'High efficiency 94% industrial grade power supply with active PFC, short circuit, overload, and overvoltage protections.',
    descriptionAr: 'مزود قدرة كهربائية عالي الكفاءة يثبت على سكة DIN لتغذية لوحات التحكم والـ PLC والحساسات بجهد منظم 24 فولت تيار مستمر.',
    price: 1950.00,
    compareAtPrice: 2200.00,
    attributes: [
      { keyEn: 'Output Voltage', keyAr: 'جهد الخرج', valueEn: '24V DC Adjustable (24-28V)', valueAr: '24 فولت قابل للتعديل' },
      { keyEn: 'Output Current', keyAr: 'أقصى تيار', valueEn: '10 Amperes (240W Max)', valueAr: '10 أمبير (قدرة 240 وات)' },
      { keyEn: 'Input Range', keyAr: 'جهد الدخل', valueEn: '90-264V AC Universal', valueAr: '90 إلى 264 فولت متردد' },
    ],
  },
  {
    slug: 'type-2-surge-protective-device-spd-40ka',
    categorySlug: 'power-supplies-protection',
    nameEn: 'Type 2 DIN-Rail Surge Protective Device SPD 40kA 3-Phase',
    nameAr: 'جهاز حماية من الصواعق وارتفاع الجهد SPD سعة 40 كيلو أمبير',
    descriptionEn: 'Modular 4-pole surge arrester for main distribution boards, shielding sensitive automation hardware against lightning pulses.',
    descriptionAr: 'وحدة حماية ثلاثية الأوجه لحماية الدوائر الحساسة والأجهزة الصناعية من الصواعق والارتفاع اللحظي العنيف في الجهد.',
    price: 1100.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Max Discharge Current', keyAr: 'أقصى تيار تفريغ', valueEn: '40 kA (8/20 us)', valueAr: '40 كيلو أمبير' },
      { keyEn: 'Operating Voltage', keyAr: 'جهد التشغيل', valueEn: '380V / 415V AC 3P+N', valueAr: '380 إلى 415 فولت 3 فاز مع نيوترال' },
      { keyEn: 'Response Time', keyAr: 'زمن الاستجابة', valueEn: '< 25 Nanoseconds', valueAr: 'أقل من 25 نانو ثانية' },
    ],
  },

  // 6. Pneumatics & Solenoid Valves
  {
    slug: '5-2-way-24vdc-solenoid-pneumatic-valve',
    categorySlug: 'pneumatic-components',
    nameEn: '5/2 Way 24V DC Single Solenoid Pneumatic Valve 1/4 Inch',
    nameAr: 'صمام نيوماتيك 5/2 كهربائي سولينويد 24 فولت مقاس 1/4 بوصة',
    descriptionEn: 'Direct acting pilot-operated 5-port 2-position pneumatic control valve with manual override button and LED DIN coil.',
    descriptionAr: 'صمام تحكم هوائي لتشغيل بساتم الهواء المزدوجة بملف كهرومغناطيسي 24 فولت، موثوق ومخصص للعمل المستمر في خطوط التعبئة والتغليف.',
    price: 620.00,
    compareAtPrice: 700.00,
    attributes: [
      { keyEn: 'Port Size', keyAr: 'مقاس الفتحات', valueEn: 'G 1/4 Inch Female Thread', valueAr: 'سن داخلي 1/4 بوصة' },
      { keyEn: 'Coil Voltage', keyAr: 'جهد الملف', valueEn: '24V DC (4.8W)', valueAr: '24 فولت مستمر' },
      { keyEn: 'Operating Pressure', keyAr: 'ضغط التشغيل', valueEn: '1.5 to 8.0 Bar', valueAr: '1.5 إلى 8.0 بار' },
    ],
  },
  {
    slug: 'sc-standard-pneumatic-cylinder-50x150',
    categorySlug: 'pneumatic-components',
    nameEn: 'SC Standard ISO Pneumatic Cylinder 50mm Bore 150mm Stroke',
    nameAr: 'سلندر وبستم هواء هوائي قياسي SC قطر 50 مم ومشوار 150 مم',
    descriptionEn: 'Double acting tie-rod air cylinder with adjustable air cushion at both ends, hardened chrome piston rod, and aluminum barrel.',
    descriptionAr: 'أسطوانة هوائية مزدوجة الفعل عالية التحمل بقطر 50 مم ومشوار 150 مم مع وسائد تخميد للصدمات وقضيب مطلي بالكروم المقاوم للتآكل.',
    price: 1450.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Bore Size', keyAr: 'قطر السلندر', valueEn: '50 mm', valueAr: '50 مم' },
      { keyEn: 'Stroke Length', keyAr: 'مشوار الحركة', valueEn: '150 mm', valueAr: '150 مم' },
      { keyEn: 'Action Type', keyAr: 'نوع الحركة', valueEn: 'Double Acting with Cushioning', valueAr: 'مزدوج الفعل مع تخميد هيدروديناميكي' },
    ],
  },
  {
    slug: 'pneumatic-air-filter-regulator-frl-unit',
    categorySlug: 'pneumatic-components',
    nameEn: 'Pneumatic Air Filter Regulator Lubricator FRL Unit 3/8 Inch',
    nameAr: 'وحدة معالجة هواء مضغوط ثلاثية FRL فلتر ومنظم ومزيتة 3/8 بوصة',
    descriptionEn: 'Modular compressed air preparation unit with 5-micron brass filter element, locking pressure regulator, and mist lubricator.',
    descriptionAr: 'وحدة متكاملة لتنقية وتجفيف الهواء المضغوط وضبط الضغط وإضافة رذاذ التزييت لحماية الصمامات والبساتم من التلف والتآكل.',
    price: 980.00,
    compareAtPrice: 1150.00,
    attributes: [
      { keyEn: 'Inlet / Outlet', keyAr: 'مقاس المداخل', valueEn: 'G 3/8 Inch', valueAr: '3/8 بوصة' },
      { keyEn: 'Filtration Rating', keyAr: 'دقة الفلترة', valueEn: '5 Microns', valueAr: '5 ميكرون' },
      { keyEn: 'Max Pressure', keyAr: 'أقصى ضغط', valueEn: '10 Bar (1.0 MPa)', valueAr: '10 بار' },
    ],
  },

  // 7. IoT Modules & Wireless Telemetry
  {
    slug: 'industrial-4g-lte-cellular-gateway',
    categorySlug: 'iot-wireless-telemetry',
    nameEn: 'Industrial 4G LTE Cellular Gateway RS485 Modbus to MQTT',
    nameAr: 'بوابة اتصالات صناعية 4G LTE لتحويل Modbus RS485 إلى MQTT',
    descriptionEn: 'Rugged wireless telemetry terminal that connects plant sensors and PLCs directly to AWS IoT, Azure, or private cloud brokers.',
    descriptionAr: 'جهاز راوتر ومودم صناعي ينقل قراءات العدادات والحساسات ولوحات PLC عبر شبكات المحمول مباشرة إلى السيرفرات السحابية.',
    price: 3800.00,
    compareAtPrice: 4200.00,
    attributes: [
      { keyEn: 'Cellular Band', keyAr: 'شبكة الاتصال', valueEn: '4G LTE Cat 1 with 2G Fallback', valueAr: '4G LTE مع دعم 2G' },
      { keyEn: 'Protocols', keyAr: 'البروتوكولات', valueEn: 'MQTT, Modbus RTU/TCP, HTTPs', valueAr: 'MQTT، Modbus RTU/TCP' },
      { keyEn: 'Serial Interface', keyAr: 'المنافذ التسلسلية', valueEn: 'Isolated RS485 + RS232', valueAr: 'RS485 معزول مع RS232' },
    ],
  },
  {
    slug: 'sx1262-lora-telemetry-transceiver',
    categorySlug: 'iot-wireless-telemetry',
    nameEn: 'SX1262 LoRa Telemetry Transceiver 868/915MHz with Antenna',
    nameAr: 'موديول إرسال واستقبال LoRa طراز SX1262 مع هوائي عالي الكسب',
    descriptionEn: 'Long-range wireless communication module capable of up to 5km line-of-sight telemetry with ultra-low power sleep modes.',
    descriptionAr: 'وحدة اتصال لاسلكي بعيد المدى تصل إلى 5 كيلومتر للمزارع والمصانع وأنظمة الري الذكية باستهلاك طاقة منخفض للغاية.',
    price: 750.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Frequency', keyAr: 'التردد اللاسلكي', valueEn: '868 MHz / 915 MHz Bands', valueAr: '868 / 915 ميجاهرتز' },
      { keyEn: 'Transmit Power', keyAr: 'طاقة الإرسال', valueEn: '+22 dBm Max Output', valueAr: '+22 ديسيبل ميلي وات' },
      { keyEn: 'Interface', keyAr: 'واجهة التوصيل', valueEn: 'SPI High Speed Bus', valueAr: 'واجهة اتصال SPI' },
    ],
  },

  // 8. Measurement & Calibration Tools
  {
    slug: 'true-rms-industrial-digital-multimeter',
    categorySlug: 'measurement-test-tools',
    nameEn: 'True-RMS Industrial Digital Multimeter 6000 Counts Cat III',
    nameAr: 'ملتيميتر رقمي صناعي True-RMS دقة 6000 قراءة مع حماية Cat III',
    descriptionEn: 'High-precision electrical diagnostic meter measuring AC/DC voltage, current, resistance, capacitance, frequency, and diode drop.',
    descriptionAr: 'جهاز أفوميتر وملتيميتر احترافي معتمد لفنيي ومهندسي الصيانة لقياس الجهد والتيار المتردد والمستمر بدقة True-RMS.',
    price: 1650.00,
    compareAtPrice: 1850.00,
    attributes: [
      { keyEn: 'Safety Category', keyAr: 'معيار الأمان', valueEn: 'CAT III 1000V / CAT IV 600V', valueAr: 'CAT III 1000 فولت' },
      { keyEn: 'Measurement Type', keyAr: 'طريقة القياس', valueEn: 'True-RMS for Non-linear Loads', valueAr: 'قياس True-RMS للأحمال غير الخطية' },
      { keyEn: 'Display Counts', keyAr: 'دقة الشاشة', valueEn: '6000 Counts Backlit LCD', valueAr: '6000 قراءة مع إضاءة خلفية' },
    ],
  },
  {
    slug: 'dual-channel-100mhz-digital-oscilloscope',
    categorySlug: 'measurement-test-tools',
    nameEn: 'Dual-Channel 100MHz Digital Storage Oscilloscope 1GSa/s',
    nameAr: 'أوسيلوسكوب معملي رقمي قناتين بتردد 100 ميجاهرتز ومعدل 1GSa/s',
    descriptionEn: 'Benchtop digital oscilloscope featuring 7-inch color display, USB waveform export, FFT spectrum analysis, and automatic measurement suite.',
    descriptionAr: 'أوسيلوسكوب معملي متطور لتحليل الإشارات والموجات الإلكترونية وتتبع أعطال الدوائر الرقمية والمتحكمات حتى 100 ميجاهرتز.',
    price: 11500.00,
    compareAtPrice: 12800.00,
    attributes: [
      { keyEn: 'Bandwidth', keyAr: 'عرض النطاق', valueEn: '100 MHz (2 Channels)', valueAr: '100 ميجاهرتز قناتين' },
      { keyEn: 'Sampling Rate', keyAr: 'معدل أخذ العينات', valueEn: '1 GSa/s Real-time', valueAr: '1 جيجا عينة في الثانية' },
      { keyEn: 'Record Length', keyAr: 'عمق الذاكرة', valueEn: '28 Mpts Deep Memory', valueAr: '28 ميجا نقطة' },
    ],
  },

  // 9. Relays & Switching
  {
    slug: 'solid-state-relay-ssr-40a-dc-ac',
    categorySlug: 'relays-switching',
    nameEn: 'Solid State Relay SSR 40A DC-AC 3-32VDC Input 24-380VAC Output',
    nameAr: 'ريليه حالة صلبة SSR تيار 40 أمبير دخل DC وخرج AC',
    descriptionEn: 'Optically isolated semiconductor switch for silent, spark-free heating element and industrial motor switching.',
    descriptionAr: 'مفتاح إلكتروني صامت فائق السرعة وبدون أي شرارة كهربائية للتحكم في السخانات والمعدات ذات تردد التشغيل المرتفع.',
    price: 420.00,
    compareAtPrice: null,
    attributes: [
      { keyEn: 'Load Current', keyAr: 'تيار الحمل', valueEn: '40 Amperes Max', valueAr: '40 أمبير كحد أقصى' },
      { keyEn: 'Control Input', keyAr: 'إشارة التحكم', valueEn: '3-32V DC Optoisolated', valueAr: '3 إلى 32 فولت مستمر' },
      { keyEn: 'Load Voltage', keyAr: 'جهد الحمل', valueEn: '24-380V AC', valueAr: '24 إلى 380 فولت متردد' },
    ],
  },
  {
    slug: '3-pole-ac-contactor-25a-220v-coil',
    categorySlug: 'relays-switching',
    nameEn: '3-Pole AC Contactor 25A 220V Coil with 1NO Auxiliary Contact',
    nameAr: 'كونتاكتور ثلاثي الأقطاب 25 أمبير بملف تشغيل 220 فولت وتلامس مساعد',
    descriptionEn: 'High-durability magnetic contactor designed for frequent starting of 3-phase induction motors up to 11kW.',
    descriptionAr: 'كونتاكتور قدرة كهربائي مصمم لتحمل آلاف دورات التشغيل لمحركات المصانع ومضخات المياه بقوة تصل إلى 11 كيلووات.',
    price: 580.00,
    compareAtPrice: 650.00,
    attributes: [
      { keyEn: 'Rated Thermal Current', keyAr: 'التيار الحراري المقنن', valueEn: '25 Amperes (AC-3)', valueAr: '25 أمبير (تصنيف AC-3)' },
      { keyEn: 'Coil Voltage', keyAr: 'جهد ملف التشغيل', valueEn: '220V AC 50/60Hz', valueAr: '220 فولت متردد' },
      { keyEn: 'Auxiliary Contacts', keyAr: 'نقاط التلامس المساعدة', valueEn: '1 Normally Open (1NO)', valueAr: 'نقطة مساعدة مفتوحة 1NO' },
    ],
  },

  // 10. Cables & Connectors
  {
    slug: 'm12-4-pin-waterproof-sensor-cable-5m',
    categorySlug: 'cables-connectors',
    nameEn: 'M12 4-Pin A-Coded Waterproof Sensor Cable Male to Female 5M',
    nameAr: 'كابل حساسات صناعي M12 رباعي الأطراف معزول ضد الماء طول 5 متر',
    descriptionEn: 'Oil and chemical resistant PUR insulated sensor patch cord with gold-plated pins and IP68 threaded locking nuts.',
    descriptionAr: 'كابل توصيل حساسات صناعي مصفح بطول 5 أمتار مقاوم للزيوت والمواد الكيميائية بكونكتور M12 مقاوم للماء IP68.',
    price: 280.00,
    compareAtPrice: 320.00,
    attributes: [
      { keyEn: 'Cable Length', keyAr: 'طول الكابل', valueEn: '5.0 Meters', valueAr: '5.0 متر' },
      { keyEn: 'Connector Coding', keyAr: 'نوع الكود', valueEn: 'M12 A-Coding (4-Pin)', valueAr: 'M12 كود A (4 أطراف)' },
      { keyEn: 'Jacket Material', keyAr: 'مادة الغلاف', valueEn: 'PUR Flame Retardant & Oil Resistant', valueAr: 'PUR مقاوم للهب والزيوت الصناعية' },
    ],
  },
]

async function main() {
  console.log('Seeding 10 Categories and 23 Products for test...')

  const categoryMap = new Map()

  for (const cat of categoriesData) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        featuredOnHomepage: cat.featuredOnHomepage,
        sortOrder: cat.sortOrder,
      },
      create: {
        slug: cat.slug,
        nameEn: cat.nameEn,
        nameAr: cat.nameAr,
        descriptionEn: cat.descriptionEn,
        descriptionAr: cat.descriptionAr,
        featuredOnHomepage: cat.featuredOnHomepage,
        sortOrder: cat.sortOrder,
      },
    })
    categoryMap.set(cat.slug, upserted.id)
    console.log(`Upserted category: ${cat.slug} (${upserted.id})`)
  }

  for (const prod of productsData) {
    const categoryId = categoryMap.get(prod.categorySlug)
    if (!categoryId) {
      console.warn(`Category slug not found for product ${prod.slug}: ${prod.categorySlug}`)
      continue
    }

    const upserted = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        nameEn: prod.nameEn,
        nameAr: prod.nameAr,
        descriptionEn: prod.descriptionEn,
        descriptionAr: prod.descriptionAr,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        categoryId: categoryId,
        isActive: true,
      },
      create: {
        slug: prod.slug,
        nameEn: prod.nameEn,
        nameAr: prod.nameAr,
        descriptionEn: prod.descriptionEn,
        descriptionAr: prod.descriptionAr,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice,
        categoryId: categoryId,
        isActive: true,
      },
    })

    // Upsert attributes
    await prisma.productAttribute.deleteMany({
      where: { productId: upserted.id },
    })

    if (prod.attributes && prod.attributes.length > 0) {
      await prisma.productAttribute.createMany({
        data: prod.attributes.map(attr => ({
          productId: upserted.id,
          keyEn: attr.keyEn,
          keyAr: attr.keyAr,
          valueEn: attr.valueEn,
          valueAr: attr.valueAr,
        })),
      })
    }

    // Upsert SEO
    await prisma.productSeo.upsert({
      where: { productId: upserted.id },
      update: {
        metaTitleEn: `${prod.nameEn} | Amir`,
        metaTitleAr: `${prod.nameAr} | أمير`,
        metaDescriptionEn: prod.descriptionEn,
        metaDescriptionAr: prod.descriptionAr,
        keywords: `${prod.nameEn}, ${prod.nameAr}, Amir, Egypt`,
      },
      create: {
        productId: upserted.id,
        metaTitleEn: `${prod.nameEn} | Amir`,
        metaTitleAr: `${prod.nameAr} | أمير`,
        metaDescriptionEn: prod.descriptionEn,
        metaDescriptionAr: prod.descriptionAr,
        keywords: `${prod.nameEn}, ${prod.nameAr}, Amir, Egypt`,
      },
    })

    console.log(`Upserted product: ${prod.slug}`)
  }

  const catCount = await prisma.category.count()
  const prodCount = await prisma.product.count()
  console.log(`Finished catalog seed! Total categories in DB: ${catCount}, Total products in DB: ${prodCount}`)
}

main()
  .catch(e => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
