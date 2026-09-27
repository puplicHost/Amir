<script setup lang="ts">
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  Headphones,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from 'lucide-vue-next'

const { t, locale } = useI18n()
const localePath = useLocalePath()

const siteSeo = await useSiteSeo()

// No page-specific SEO exists for About → site-wide fallback applies.
useHead(() => {
  const pageName = locale.value === 'ar' ? 'عن مانجو إلكترونيكس' : 'About Mango Electronics'
  const title = applySeoTitle(
    locale.value === 'ar' ? siteSeo.value?.titleTemplateAr : siteSeo.value?.titleTemplateEn,
    pageName,
    `${pageName} | ${t('brand.name')}`,
  )
  const description = (locale.value === 'ar' ? siteSeo.value?.descriptionAr : siteSeo.value?.descriptionEn) || undefined
  return {
    title,
    meta: [
      ...(description ? [{ name: 'description', content: description }] : []),
      { property: 'og:title', content: title },
      ...(description ? [{ property: 'og:description', content: description }] : []),
    ],
  }
})

const { data: contact } = await useAsyncData('about-contact', () => $fetch<any>('/api/settings/contact'))

const whatsappUrl = computed(() => {
  const num = contact.value?.contactWhatsapp || contact.value?.contactPhone1 || ''
  return num ? whatsappLink(num) : ''
})

const values = computed(() => [
  {
    num: '01',
    icon: ShieldCheck,
    title: locale.value === 'ar' ? 'مكونات أصلية ومختبرة' : 'Genuine & Tested Parts',
    desc: locale.value === 'ar'
      ? 'كل وحدة ومكون في الكتالوج أصلي 100% ومرفق بمواصفاته الفنية المعتمدة. نرفض البدائل مجهولة المصدر لضمان سلامة خطوط إنتاجك.'
      : 'Every component in our catalog is 100% original with verified datasheets. We reject uncertified clones to protect your production equipment.',
  },
  {
    num: '02',
    icon: Cpu,
    title: locale.value === 'ar' ? 'فريق هندسي متخصص' : 'Certified Engineers',
    desc: locale.value === 'ar'
      ? 'فريق متخصص في صيانة الماكينات وبرمجة لوحات PLC والأتمتة الصناعية. نفهم متطلباتك الفنية قبل تقديم الحل الأنسب.'
      : 'In-house specialists in machinery diagnostics, PLC programming, and automation who understand your exact engineering problem first.',
  },
  {
    num: '03',
    icon: Zap,
    title: locale.value === 'ar' ? 'استجابة سريعة للطوارئ' : 'Rapid Response',
    desc: locale.value === 'ar'
      ? 'ندرك أن تعطل الماكينات يعني خسارة في الإنتاج. نرد فوراً عبر الهاتف وواتساب ونرتب المعاينات الميدانية بأسرع وقت.'
      : 'Production downtime cannot wait. We respond immediately via phone and WhatsApp to coordinate prompt technical visits and parts dispatch.',
  },
  {
    num: '04',
    icon: Truck,
    title: locale.value === 'ar' ? 'شحن لجميع المحافظات' : 'Nationwide Delivery',
    desc: locale.value === 'ar'
      ? 'من مقرنا في الإسماعيلية إلى كل مصنع وورشة في محافظات مصر: شحن سريع ومؤمن مع إمكانية الفحص عند الاستلام.'
      : 'From our base in Ismailia to plants and workshops across all Egyptian governorates with on-delivery inspection support.',
  },
])
</script>

<template>
  <div class="space-y-0 selection:bg-[#F5CC07] selection:text-slate-950">

    <!-- 1. Hero / Intro Band (Dark Industrial Aesthetic with Breadcrumb & Ambience) -->
    <section class="relative overflow-hidden bg-[#0B1520] text-white border-b border-slate-800">
      <div class="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#2B71AE]/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-[#285E8E]/25 blur-[130px]"></div>
      <div
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(#2B71AE 1px, transparent 1px); background-size: 24px 24px;"
      ></div>

      <div class="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20 text-center">
        <!-- Breadcrumb Navigation -->
        <nav class="mb-5 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400" aria-label="Breadcrumb">
          <NuxtLink :to="localePath('/')" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <span class="text-slate-600" aria-hidden="true">/</span>
          <span class="text-[#F5CC07] font-semibold" aria-current="page">{{ t('nav.about') }}</span>
        </nav>

        <!-- Eyebrow Badge -->
        <div class="hero-anim mb-4 inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-4 py-1.5 text-xs sm:text-sm font-semibold text-[#F5CC07] shadow-sm backdrop-blur-md">
          <Award class="h-3.5 w-3.5" aria-hidden="true" />
          <span>{{ locale === 'ar' ? 'مانجو إلكترونيكس' : 'Mango Electronics' }}</span>
        </div>

        <!-- Headline -->
        <h1 class="hero-anim font-heading text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
          {{ locale === 'ar' ? 'شريكك الهندسي للتوريد والصيانة الصناعية' : 'Engineering Trust, Powering Industry' }}
        </h1>

        <!-- Confident Tagline Sentence -->
        <p class="hero-anim text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-6">
          {{ locale === 'ar'
            ? 'مكونات إلكترونية أصلية، أدوات دقيقة، وخدمات أتمتة وصيانة متقدمة من الإسماعيلية إلى جميع أنحاء مصر.'
            : 'Original electronic components, precision tools, and certified automation & maintenance services from Ismailia across Egypt.' }}
        </p>

        <!-- Brand Motto Pill -->
        <div class="hero-anim inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-xs font-mono text-slate-300">
          <span class="h-2 w-2 rounded-full bg-[#F5CC07]"></span>
          <span>{{ locale === 'ar' ? 'شعارنا الدائم: اعملها صح، اعملها بذكاء.' : 'Our Core Standard: Do It Right, Do It Smart.' }}</span>
        </div>
      </div>
    </section>

    <!-- 2. Our Story & Purpose (Split Editorial Grid: Manifesto + Narrative) -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0B1520] transition-colors">
      <div class="mx-auto max-w-7xl">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          <!-- Left: Mission Manifesto Card (5 cols) -->
          <div class="lg:col-span-5 reveal">
            <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1520] via-[#16253B] to-[#1E3A5F] p-8 sm:p-10 text-white shadow-xl border border-blue-500/20">
              <div class="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-[#2B71AE]/20 blur-2xl"></div>

              <div class="relative z-10">
                <div class="inline-flex items-center gap-1.5 rounded-full bg-[#F5CC07]/20 border border-[#F5CC07]/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F5CC07] mb-6">
                  <Compass class="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{{ locale === 'ar' ? 'الرسالة والرؤية' : 'Our Mission' }}</span>
                </div>

                <h2 class="font-heading text-2xl sm:text-3xl font-extrabold leading-snug mb-4 text-white">
                  {{ locale === 'ar' ? 'أن تظل الماكينات تعمل، والمهندسون مدعومين بخبرات حقيقية.' : 'Keeping Machines Running and Engineers Fully Supported.' }}
                </h2>

                <p class="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  {{ locale === 'ar'
                    ? 'نؤمن أن الصناعة المصرية تستحق حلولاً عملية وسريعة. نجمع بين توفير القطع الأصلية وتقديم الدعم الفني المتخصص تحت سقف واحد.'
                    : 'We believe modern industry demands straightforward solutions. We bridge verified component supply with hands-on automation expertise under one roof.' }}
                </p>

                <!-- Core Pillars Mini Badges -->
                <div class="pt-6 border-t border-white/10 space-y-2.5">
                  <div class="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>{{ locale === 'ar' ? 'خدمة المصانع، الشركات، والورش الصناعية' : 'Serving factories, workshops, and enterprises' }}</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>{{ locale === 'ar' ? 'دعم المهندسين، الفنيين، ومشاريع التخرج' : 'Supporting engineers, technicians, and innovators' }}</span>
                  </div>
                  <div class="flex items-center gap-2.5 text-xs text-slate-200">
                    <CheckCircle2 class="h-4 w-4 text-[#F5CC07] shrink-0" />
                    <span>{{ locale === 'ar' ? 'عقود صيانة وتوريدات دورية رسمية' : 'Corporate supply contracts & formal maintenance SLA' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Narrative Prose (7 cols) -->
          <div class="lg:col-span-7 space-y-6 reveal">
            <div>
              <div class="inline-flex items-center gap-1.5 rounded-full border border-[#2B71AE]/30 bg-[#2B71AE]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#2B71AE] dark:text-blue-300 mb-3">
                <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
                <span>{{ locale === 'ar' ? 'قصتنا وبدايتنا' : 'Our Background' }}</span>
              </div>

              <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
                {{ locale === 'ar' ? 'من الإسماعيلية إلى كل مصنع وورشة في مصر' : 'Built from Engineering Practicality in Ismailia' }}
              </h2>
            </div>

            <div class="space-y-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                {{ locale === 'ar'
                  ? 'بدأت مانجو إلكترونيكس من واقع عملي لمسه مهندسونا في الميدان: تعطل خط إنتاج لساعات بسبب قطعة غيار مقلدة أو عدم توفر الدعم الفني المؤهل ليس أمراً مقبولاً.'
                  : 'Mango Electronics was established from a clear, practical reality observed on the shop floor: losing hours of production downtime due to counterfeit components or unavailable engineering support is simply unacceptable.' }}
              </p>
              <p>
                {{ locale === 'ar'
                  ? 'لذلك بنينا منظومة متكاملة تجمع بين مسارين رئيسيين: الأول هو متجر وكتالوج متخصص يضم مئات المكونات الصناعية والرقائق والوحدات الأصلية 100%، والثاني هو قطاع هندسي متخصص يقدم خدمات فحص الماكينات، برمجة لوحات التحكم PLC، تصميم أنظمة IoT، وصيانة الأنظمة الهوائية.'
                  : 'We built an integrated solution addressing both needs: a certified industrial catalog with genuine components and precision tools, backed by an engineering team executing machinery diagnostics, PLC programming, telemetry installations, and pneumatic overhauls.' }}
              </p>
              <p>
                {{ locale === 'ar'
                  ? 'شعارنا "اعملها صح، اعملها بذكاء" ليس مجرد كلمات، بل منهج عمل في اختيار كل قطعة نوردها، وكل كود برمجي نكتبه، وكل زيارة فحص نقوم بها لضمان كفاءة منشأتك.'
                  : 'Our guiding principle — "Do It Right, Do It Smart" — governs every component we supply, every control line we program, and every on-site diagnostic visit we carry out.' }}
              </p>
            </div>

            <!-- Geographic Anchor Strip -->
            <div class="flex items-center gap-3 pt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-[#2B71AE] dark:text-[#F5CC07]">
                <MapPin class="h-4 w-4" aria-hidden="true" />
              </div>
              <span>{{ locale === 'ar' ? 'المقر الإداري ومركز العمليات: مصر - الإسماعيلية' : 'Headquarters & Engineering Base: Egypt - Ismailia' }}</span>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 3. What We Do (The Two Connected Pillars: Products & Engineering) -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0E1B2B]/60 border-y border-slate-200/80 dark:border-slate-800/80">
      <div class="mx-auto max-w-7xl">
        <div class="text-center max-w-3xl mx-auto mb-12">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-[#F5CC07]/30 bg-[#F5CC07]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#F5CC07] mb-3">
            <Wrench class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'أنشطتنا الرئيسية' : 'What We Offer' }}</span>
          </div>

          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            {{ locale === 'ar' ? 'منظومة متكاملة تغطي كافة احتياجاتك' : 'Two Core Pillars Powering Your Facility' }}
          </h2>
          <p class="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            {{ locale === 'ar'
              ? 'سواء كنت تبحث عن قطعة إلكترونية محددة أو تحتاج إلى مشروع أتمتة وصيانة متكامل لمصنعك.'
              : 'Whether you require a specific industrial sensor or an end-to-end automated control line.' }}
          </p>
          <div class="h-1 w-12 bg-[#2B71AE] mx-auto rounded-full mt-4 dark:bg-[#F5CC07]"></div>
        </div>

        <div class="grid gap-6 sm:gap-8 md:grid-cols-2 max-w-5xl mx-auto">
          
          <!-- Pillar 1: Components & Hardware Catalog -->
          <div class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm hover:border-[#2B71AE] hover:shadow-xl hover:-translate-y-1.5 dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all duration-300 reveal">
            <div>
              <div class="flex items-center justify-between gap-3 mb-6">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:scale-105 group-hover:bg-[#2B71AE] group-hover:text-white transition-all shadow-xs">
                  <Package class="h-7 w-7" aria-hidden="true" />
                </div>
                <span class="rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2B71AE] dark:text-blue-300 px-3 py-1 text-[11px] font-mono font-bold">
                  {{ locale === 'ar' ? 'توريدات ومبيعات' : 'Catalog & Sourcing' }}
                </span>
              </div>

              <h3 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] transition-colors leading-snug">
                {{ locale === 'ar' ? 'كتالوج المكونات والأدوات الإلكترونية' : 'Industrial Components & Hardware' }}
              </h3>

              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {{ locale === 'ar'
                  ? 'متحكمات دقيقة، حساسات صناعية، إنفرترات ومحركات، كابلات معتمدة، ومعدات قياس واختبار. مع إمكانية استخراج عروض أسعار فورية رسمية باللغتين العربية والإنجليزية.'
                  : 'Microcontrollers, industrial sensors, VFD inverters, motors, certified cabling, and precision testing tools with instant dual-language PDF quote generation.' }}
              </p>

              <!-- Capability Tags -->
              <div class="flex flex-wrap gap-1.5 mb-6 text-[11px] text-slate-600 dark:text-slate-300">
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">PLC & HMI</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">Sensors</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">Power Supplies</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">IoT Modules</span>
              </div>
            </div>

            <div class="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <NuxtLink
                :to="localePath('/products')"
                class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2B71AE] px-6 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#285E8E] active:scale-[0.98] transition-all"
              >
                <span>{{ locale === 'ar' ? 'تصفح الكتالوج المعتمد' : 'Browse Product Catalog' }}</span>
                <ArrowRight class="h-4 w-4 rtl:rotate-180" />
              </NuxtLink>

              <NuxtLink
                :to="localePath('/quote')"
                class="text-xs font-bold text-[#2B71AE] hover:underline dark:text-[#F5CC07]"
              >
                {{ locale === 'ar' ? 'طلب عرض سعر' : 'Price Quotation' }}
              </NuxtLink>
            </div>
          </div>

          <!-- Pillar 2: Field Engineering & Automation Services -->
          <div class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-7 sm:p-9 shadow-sm hover:border-[#2B71AE] hover:shadow-xl hover:-translate-y-1.5 dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all duration-300 reveal">
            <div>
              <div class="flex items-center justify-between gap-3 mb-6">
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5CC07]/20 text-[#F5CC07] shadow-xs group-hover:scale-105 transition-all">
                  <Headphones class="h-7 w-7 text-slate-900 dark:text-[#F5CC07]" aria-hidden="true" />
                </div>
                <span class="rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-[#F5CC07] px-3 py-1 text-[11px] font-mono font-bold">
                  {{ locale === 'ar' ? 'خدمات هندسية' : 'Engineering Services' }}
                </span>
              </div>

              <h3 class="font-heading text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-[#2B71AE] dark:group-hover:text-[#F5CC07] transition-colors leading-snug">
                {{ locale === 'ar' ? 'حلول الصيانة والأتمتة الصناعية' : 'Maintenance & Industrial Automation' }}
              </h3>

              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {{ locale === 'ar'
                  ? 'صيانة الماكينات، برمجة لوحات التحكم، ربط شبكات SCADA، وتركيب منظومات الإنذار والأنظمة الهوائية، مع تقارير فحص فنية معتمدة لكل زيارة.'
                  : 'Production machine diagnostics, control panel assembly, SCADA integration, and emergency maintenance backed by formal technical reports.' }}
              </p>

              <!-- Capability Tags -->
              <div class="flex flex-wrap gap-1.5 mb-6 text-[11px] text-slate-600 dark:text-slate-300">
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">SCADA / HMI</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">Diagnostics</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">Pneumatics</span>
                <span class="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1">PCB Prototyping</span>
              </div>
            </div>

            <div class="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <NuxtLink
                :to="localePath('/services')"
                class="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-[#2B71AE] px-6 text-xs sm:text-sm font-bold text-[#2B71AE] hover:bg-[#2B71AE] hover:text-white dark:border-[#F5CC07] dark:text-[#F5CC07] dark:hover:bg-[#F5CC07] dark:hover:text-slate-950 active:scale-[0.98] transition-all"
              >
                <span>{{ locale === 'ar' ? 'استعراض كافة الخدمات' : 'Explore All Services' }}</span>
                <ArrowRight class="h-4 w-4 rtl:rotate-180" />
              </NuxtLink>

              <a
                :href="whatsappUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                {{ locale === 'ar' ? 'استشارة فنية' : 'Consult an Engineer' }}
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 4. Why Choose Us (4 Distinct Technical Value Propositions) -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0B1520] transition-colors">
      <div class="mx-auto max-w-7xl">
        <div class="text-center max-w-3xl mx-auto mb-14">
          <div class="inline-flex items-center gap-1.5 rounded-full border border-[#2B71AE]/30 bg-[#2B71AE]/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#2B71AE] dark:text-blue-300 mb-3">
            <ShieldCheck class="h-3.5 w-3.5" aria-hidden="true" />
            <span>{{ locale === 'ar' ? 'معاييرنا والتزاماتنا' : 'Our Quality Standards' }}</span>
          </div>

          <h2 class="font-heading text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-3">
            {{ locale === 'ar' ? 'لماذا يعتمد علينا عملاؤنا؟' : 'Why Engineers & Plants Rely on Us' }}
          </h2>
          <div class="h-1 w-12 bg-[#F5CC07] mx-auto rounded-full mt-4"></div>
        </div>

        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            v-for="v in values"
            :key="v.title"
            class="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 sm:p-7 shadow-xs hover:border-[#2B71AE] hover:shadow-lg hover:-translate-y-1 dark:border-slate-800 dark:bg-[#162032] dark:hover:border-[#2B71AE] transition-all duration-300 reveal"
          >
            <div>
              <div class="flex items-center justify-between gap-3 mb-5">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2B71AE]/10 text-[#2B71AE] dark:bg-[#2B71AE]/25 dark:text-blue-300 group-hover:scale-105 group-hover:bg-[#2B71AE] group-hover:text-white transition-all shadow-xs">
                  <component :is="v.icon" class="h-6 w-6" aria-hidden="true" />
                </div>
                <span class="font-mono text-xl font-extrabold text-slate-300 dark:text-slate-700">
                  {{ v.num }}
                </span>
              </div>

              <h3 class="font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                {{ v.title }}
              </h3>

              <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {{ v.desc }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. High-Impact Closing Call to Action with Integrated Direct Contact -->
    <section class="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0E1B2B]/60 border-t border-slate-200/80 dark:border-slate-800/80">
      <div class="mx-auto max-w-5xl">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1520] via-[#1E3A5F] to-[#285E8E] p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl border border-blue-400/20 reveal">
          <!-- Ambient highlights -->
          <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#F5CC07]/15 blur-3xl"></div>
          <div class="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-blue-400/10 blur-3xl"></div>

          <div class="relative z-10 max-w-3xl mx-auto">
            <div class="inline-flex items-center gap-1.5 rounded-full bg-[#F5CC07]/20 border border-[#F5CC07]/30 px-3.5 py-1 text-xs font-bold text-[#F5CC07] uppercase tracking-wider mb-4">
              <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
              <span>{{ locale === 'ar' ? 'جاهز للبدء؟' : 'Ready to Start?' }}</span>
            </div>

            <h2 class="font-heading text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-4 leading-tight text-white">
              {{ locale === 'ar' ? 'خط إنتاجك يستحق معدات أصلية ودعماً هندسياً حقيقياً' : 'Your Production Line Deserves Certified Reliability' }}
            </h2>

            <p class="text-sm sm:text-base md:text-lg text-blue-100 max-w-2xl mx-auto mb-8 leading-relaxed">
              {{ locale === 'ar'
                ? 'تصفح كتالوج المكونات والأدوات، اطلب عرض سعر رسمي، أو احجز زيارة فحص وصيانة — ونحن نتابع معك حتى تمام التشغيل.'
                : 'Browse our component catalog, request a formal quotation, or coordinate an on-site diagnostic visit. We see it through to stable operation.' }}
            </p>

            <!-- Dual Action CTAs -->
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <NuxtLink
                :to="localePath('/products')"
                class="h-12 sm:h-13 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#F5CC07] px-8 text-base font-bold text-slate-950 shadow-xl shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition-all"
              >
                <span>{{ locale === 'ar' ? 'تصفح الكتالوج' : 'Explore Products' }}</span>
                <ArrowRight class="h-4 w-4 rtl:rotate-180" />
              </NuxtLink>

              <NuxtLink
                :to="localePath('/services')"
                class="h-12 sm:h-13 w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/30 bg-white/10 backdrop-blur-md px-8 text-base font-bold text-white hover:bg-white/20 active:scale-[0.98] transition-all"
              >
                <span>{{ locale === 'ar' ? 'استعراض الخدمات' : 'Our Services' }}</span>
                <ArrowRight class="h-4 w-4 rtl:rotate-180" />
              </NuxtLink>
            </div>

            <!-- Integrated Fast Contact Strip (Relocated Contact Channels) -->
            <div id="contact" class="pt-8 border-t border-white/15 scroll-mt-20">
              <span class="block text-xs font-mono uppercase tracking-wider text-blue-200 mb-4">
                {{ locale === 'ar' ? 'قنوات الاتصال المباشر والدعم الفني:' : 'Direct Technical Support Channels:' }}
              </span>

              <div class="flex flex-wrap items-center justify-center gap-3">
                <a
                  v-if="contact?.contactPhone1"
                  :href="`tel:${contact.contactPhone1}`"
                  dir="ltr"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-5 text-xs sm:text-sm font-mono font-bold text-white hover:bg-white/20 transition-all"
                >
                  <Phone class="h-4 w-4 text-[#F5CC07]" aria-hidden="true" />
                  <span>{{ contact.contactPhone1 }}</span>
                </a>

                <a
                  v-if="whatsappUrl"
                  :href="whatsappUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-[0.98] transition-all"
                >
                  <IconWhatsApp class="h-4 w-4 text-white" />
                  <span>WhatsApp</span>
                </a>

                <a
                  v-if="contact?.contactEmail"
                  :href="`mailto:${contact.contactEmail}`"
                  class="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 transition-all"
                >
                  <Mail class="h-4 w-4 text-blue-300" aria-hidden="true" />
                  <span>{{ contact.contactEmail }}</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

  </div>
</template>
