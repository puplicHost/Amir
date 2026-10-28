<script setup lang="ts">
import type { PublicLegalConfig } from '~~/shared/legal'
import { isLegalReviewed, legalValue, missingPrivacyFields } from '~~/shared/legal'

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const legal = config.public as unknown as PublicLegalConfig
const isDe = computed(() => locale.value === 'de')
const reviewed = computed(() => isLegalReviewed(legal))
const missing = computed(() => missingPrivacyFields(legal))

const providerName = computed(() => legalValue(legal.legalProviderName))
const street = computed(() => legalValue(legal.legalStreet))
const addressLine2 = computed(() => legalValue(legal.legalAddressLine2))
const postalCode = computed(() => legalValue(legal.legalPostalCode))
const city = computed(() => legalValue(legal.legalCity))
const country = computed(() => legalValue(legal.legalCountry))
const privacyEmail = computed(() => legalValue(legal.legalPrivacyEmail))
const phone = computed(() => legalValue(legal.legalPhone))
const hostingProvider = computed(() => legalValue(legal.legalHostingProvider))
const dpo = computed(() => legalValue(legal.legalDataProtectionOfficer))

useHead(() => ({
  title: `${t('legal.datenschutzTitle')} | ${t('brand.name')}`,
  meta: [{ name: 'robots', content: reviewed.value ? 'index,follow' : 'noindex,follow' }],
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.datenschutzTitle') }}
      </h1>
      <Divider class="my-6" />

      <AppLegalDraftNotice :reviewed="reviewed" :missing="missing" />

      <div class="space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 class="font-display text-xl font-medium">
            1. {{ isDe ? 'Verantwortlicher' : 'Controller' }}
          </h2>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'Verantwortlicher' : 'Controller'" :value="providerName" />
            <AppLegalValue :label="isDe ? 'Anschrift' : 'Address'" :value="[street, addressLine2, [postalCode, city].filter(Boolean).join(' '), country].filter(Boolean).join(', ')" />
            <AppLegalValue :label="isDe ? 'Datenschutz-Kontakt' : 'Privacy contact'" :value="privacyEmail" />
            <AppLegalValue :label="isDe ? 'Telefon' : 'Phone'" :value="phone" />
            <AppLegalValue :label="isDe ? 'Datenschutzbeauftragte/r (falls benannt)' : 'Data protection officer (if appointed)'" :value="dpo" />
          </dl>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            2. {{ isDe ? 'Welche Daten wir verarbeiten' : 'Data we process' }}
          </h2>
          <ul class="mt-3 list-disc space-y-2 pl-5">
            <li>
              {{ isDe
                ? 'Buchungsdaten: Name, Telefonnummer, ggf. E-Mail-Adresse, gewählte Leistung, Termin, Staffelung, Notizen sowie der gewählte Zahlungsanbieter.'
                : 'Booking data: name, phone number, optional email address, selected service, appointment, staff choice, notes, and the selected payment provider.' }}
            </li>
            <li>
              {{ isDe
                ? 'Zahlungsdaten: Die Zahlung wird über PayPal abgewickelt. Wir speichern keine vollständigen Kartendaten, sondern Referenzen und Statusinformationen.'
                : 'Payment data: payment is processed via PayPal. We do not store full card data, only references and status information.' }}
            </li>
            <li>
              {{ isDe
                ? 'Kontaktanfragen: Name, Telefonnummer und Nachrichteninhalt.'
                : 'Contact requests: name, phone number, and message content.' }}
            </li>
            <li>
              {{ isDe
                ? 'Nutzungs- und Marketingdaten: nur soweit Sie eingewilligt haben (z. B. Meta-Pixel/Cookies). Technisch notwendige Verbindungsdaten können in Server-Logs anfallen.'
                : 'Usage and marketing data: only where you consented (e.g. Meta Pixel/cookies). Technically necessary connection data may appear in server logs.' }}
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            3. {{ isDe ? 'Zwecke und Rechtsgrundlagen' : 'Purposes and legal bases' }}
          </h2>
          <ul class="mt-3 list-disc space-y-2 pl-5">
            <li>
              {{ isDe
                ? 'Vertragserfüllung und Terminorganisation (Art. 6 Abs. 1 lit. b DSGVO).'
                : 'Performance of the booking contract and appointment administration (Art. 6(1)(b) GDPR).' }}
            </li>
            <li>
              {{ isDe
                ? 'Rechtliche Pflichten, insbesondere Buchhaltung und steuerliche Aufbewahrung (Art. 6 Abs. 1 lit. c DSGVO).'
                : 'Legal obligations, in particular accounting and statutory retention (Art. 6(1)(c) GDPR).' }}
            </li>
            <li>
              {{ isDe
                ? 'Berechtigte Interessen an sicherem Betrieb, Betrugsabwehr und der Beantwortung von Anfragen (Art. 6 Abs. 1 lit. f DSGVO).'
                : 'Legitimate interests in secure operation, fraud prevention, and answering enquiries (Art. 6(1)(f) GDPR).' }}
            </li>
            <li>
              {{ isDe
                ? 'Marketing, Analyse und optionale WhatsApp-Kontaktaufnahme nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 TDDDG). Eine Einwilligung kann jederzeit widerrufen werden.'
                : 'Marketing, analytics, and optional WhatsApp contact only with consent (Art. 6(1)(a) GDPR, § 25 TDDDG). Consent can be withdrawn at any time.' }}
            </li>
          </ul>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            4. {{ isDe ? 'Empfänger und Auftragsverarbeiter' : 'Recipients and processors' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Wir setzen sorgfältig ausgewählte Dienstleister ein, insbesondere Hosting, E-Mail-Versand, Zahlungsabwicklung und – nur bei Einwilligung – Marketing-/Analysewerkzeuge. Eine Auftragsverarbeitung wird durch Verträge nach Art. 28 DSGVO geregelt, soweit erforderlich.'
              : 'We use carefully selected service providers, in particular hosting, email delivery, payment processing, and — only with consent — marketing/analytics tools. Data-processing agreements under Art. 28 GDPR are concluded where required.' }}
          </p>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'Hosting' : 'Hosting'" :value="hostingProvider" />
          </dl>
          <p class="mt-3">
            {{ isDe
              ? 'Zahlungsanbieter: PayPal, soweit im Buchungsprozess genutzt. E-Mail-Versand: der im System konfigurierte Versanddienstleister. Metadaten-/Analyseanbieter: Meta Platforms, soweit Sie Marketing-Cookies zugestimmt haben.'
              : 'Payment provider: PayPal where used during booking. Email delivery: the provider configured in the system. Metadata/analytics: Meta Platforms where you consented to marketing cookies.' }}
          </p>
          <p class="mt-2 text-muted">
            {{ isDe
              ? '[Konkrete Anbieter, Standorte und Garantien für Drittlandtransfers sind vor Veröffentlichung zu ergänzen.]'
              : '[Add the concrete providers, locations, and third-country transfer safeguards before publication.]' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            5. {{ isDe ? 'Speicherdauer' : 'Retention' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Wir speichern personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist oder gesetzliche Aufbewahrungspflichten bestehen. Buchhaltungsrelevante Unterlagen unterliegen regelmäßig gesetzlichen Fristen. Konkrete Löschfristen sind vor Veröffentlichung zu dokumentieren.'
              : 'We store personal data only as long as necessary for the relevant purposes or as required by statutory retention rules. Accounting records are subject to statutory periods. Concrete deletion periods must be documented before publication.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            6. {{ isDe ? 'Ihre Rechte' : 'Your rights' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch. Erteilte Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Wenden Sie sich dafür an den oben genannten Datenschutz-Kontakt.'
              : 'You have the right to access, rectification, erasure, restriction of processing, data portability, and objection. You may withdraw consent at any time with future effect. Contact the privacy address above.' }}
          </p>
          <p class="mt-2">
            {{ isDe
              ? 'Außerdem besteht ein Beschwerderecht bei einer Datenschutzaufsichtsbehörde. Die zuständige Behörde ist vor Veröffentlichung zu ergänzen.'
              : 'You also have the right to lodge a complaint with a data protection supervisory authority. Add the competent authority before publication.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            7. {{ isDe ? 'Cookies und Einwilligung' : 'Cookies and consent' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Technisch notwendige Cookies und vergleichbare Speichertechnologien werden für den Betrieb der Website eingesetzt. Optionale Analyse- und Marketingtechnologien werden nur nach Ihrer Einwilligung aktiviert. Sie können Ihre Auswahl über die Cookie-Einstellungen ändern.'
              : 'Technically necessary cookies and similar storage technologies are used to operate the website. Optional analytics and marketing technologies are enabled only with your consent. You can change your choice through the cookie settings.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            8. {{ isDe ? 'Keine automatisierte Entscheidungsfindung' : 'No automated decision-making' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne von Art. 22 DSGVO findet nicht statt.'
              : 'No automated decision-making, including profiling within the meaning of Art. 22 GDPR, takes place.' }}
          </p>
        </section>

        <p class="text-xs text-muted">
          {{ isDe ? 'Dokumentversion:' : 'Document version:' }} {{ legalValue(legal.legalVersion, '–') }}
        </p>
      </div>
    </Container>
  </Section>
</template>
