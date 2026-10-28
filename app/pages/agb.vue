<script setup lang="ts">
import type { PublicLegalConfig } from '~~/shared/legal'
import { isLegalReviewed, legalValue, missingImpressumFields } from '~~/shared/legal'

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const legal = config.public as unknown as PublicLegalConfig
const isDe = computed(() => locale.value === 'de')
const reviewed = computed(() => isLegalReviewed(legal))
const missing = computed(() => missingImpressumFields(legal))

useHead(() => ({
  title: `${t('legal.agbTitle')} | ${t('brand.name')}`,
  meta: [{ name: 'robots', content: reviewed.value ? 'index,follow' : 'noindex,follow' }],
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.agbTitle') }}
      </h1>
      <Divider class="my-6" />

      <AppLegalDraftNotice :reviewed="reviewed" :missing="missing" />

      <div class="space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 class="font-display text-xl font-medium">1. {{ isDe ? 'Geltungsbereich' : 'Scope' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Diese Allgemeinen Geschäftsbedingungen gelten für Terminbuchungen und Leistungen des im Impressum genannten Anbieters gegenüber Verbraucherinnen und Verbrauchern sowie Unternehmern, soweit nicht zwingendes Recht entgegensteht.'
              : 'These terms apply to appointment bookings and services provided by the provider named in the imprint, vis-à-vis consumers and businesses, subject to mandatory law.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">2. {{ isDe ? 'Vertragsschluss' : 'Contract formation' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Die Darstellung von Leistungen und freien Terminen ist kein bindendes Angebot. Mit dem Absenden der Buchung geben Sie ein verbindliches Angebot ab. Der Vertrag kommt mit der Bestätigung durch den Anbieter zustande; eine automatische Zahlungsbestätigung allein ersetzt keine Annahmeerklärung, soweit gesetzlich zulässig.'
              : 'The presentation of services and available slots is not a binding offer. By submitting a booking you make a binding offer. The contract is formed when the provider confirms it; an automated payment confirmation alone does not constitute acceptance where prohibited by law.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">3. {{ isDe ? 'Preise und Anzahlung' : 'Prices and deposit' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Es gelten die zum Buchungszeitpunkt angezeigten Preise. Für die Buchung kann eine Anzahlung verlangt werden; die Höhe wird vor der Zahlung angezeigt. Restbeträge sind vor Ort nach den vereinbarten Zahlungsmitteln zu begleichen.'
              : 'The prices displayed at the time of booking apply. A deposit may be required; the amount is shown before payment. Remaining amounts are payable on site using the agreed payment methods.' }}
          </p>
          <p class="mt-2 text-muted">
            {{ isDe
              ? '[Angaben zu Steuern, Zahlungsmitteln und etwaigen Gebühren sind rechtlich zu prüfen und zu ergänzen.]'
              : '[Tax details, payment methods, and any fees must be legally reviewed and completed.]' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">4. {{ isDe ? 'Termine, Verspätung und Absage' : 'Appointments, lateness, and cancellation' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Bitte erscheinen Sie pünktlich. Bei Verspätung kann der Termin verkürzt werden, ohne dass der Preis reduziert wird, soweit dies rechtlich zulässig ist. Absage- und No-Show-Regelungen ergeben sich aus der Seite „Stornierung“ und sind vor Veröffentlichung rechtlich zu prüfen.'
              : 'Please arrive on time. In case of lateness the appointment may be shortened without a price reduction where legally permissible. Cancellation and no-show rules are set out on the “Cancellation” page and require legal review before publication.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">5. {{ isDe ? 'Mitwirkung und Gesundheit' : 'Cooperation and health' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Sie sind verpflichtet, für die Leistung erforderliche Informationen (z. B. Allergien, Hauterkrankungen, gewünschte Behandlungen) wahrheitsgemäß mitzuteilen. Der Anbieter kann eine Leistung ablehnen, wenn gesundheitliche oder sicherheitsbezogene Gründe entgegenstehen.'
              : 'You must truthfully provide information required for the service (e.g. allergies, skin conditions, requested treatments). The provider may decline a service where health or safety reasons prevent it.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">6. {{ isDe ? 'Haftung' : 'Liability' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Die gesetzliche Haftung bleibt unberührt. Eine abschließende Haftungsregelung einschließlich der Haftung für leichte Fahrlässigkeit ist durch die Rechtsberatung zu formulieren.'
              : 'Statutory liability remains unaffected. Final liability provisions, including liability for slight negligence, must be drafted by counsel.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">7. {{ isDe ? 'Anwendbares Recht und Streitbeilegung' : 'Applicable law and disputes' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Es gilt deutsches Recht; zwingende Verbraucherschutzvorschriften des Aufenthaltsstaats bleiben unberührt. Angaben zur Teilnahme an Verbraucherschlichtungsverfahren sind vor Veröffentlichung zu ergänzen.'
              : 'German law applies; mandatory consumer-protection rules of your country of residence remain unaffected. Details on consumer dispute-resolution participation must be completed before publication.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">8. {{ isDe ? 'Schlussbestimmungen' : 'Final provisions' }}</h2>
          <p class="mt-3">
            {{ isDe
              ? 'Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Änderungen dieser AGB werden vor Veröffentlichung rechtlich geprüft.'
              : 'If individual provisions are invalid, the remaining provisions remain effective. Changes to these terms will be legally reviewed before publication.' }}
          </p>
        </section>

        <p class="text-xs text-muted">
          {{ isDe ? 'Dokumentversion:' : 'Document version:' }} {{ legalValue(legal.legalVersion, '–') }}
        </p>
      </div>
    </Container>
  </Section>
</template>
