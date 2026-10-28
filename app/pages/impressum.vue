<script setup lang="ts">
import type { PublicLegalConfig } from '~~/shared/legal'
import { isLegalReviewed, legalValue, missingImpressumFields } from '~~/shared/legal'

const { t, locale } = useI18n()
const config = useRuntimeConfig()
const legal = config.public as unknown as PublicLegalConfig
const isDe = computed(() => locale.value === 'de')
const reviewed = computed(() => isLegalReviewed(legal))
const missing = computed(() => missingImpressumFields(legal))

const providerName = computed(() => legalValue(legal.legalProviderName))
const legalForm = computed(() => legalValue(legal.legalLegalForm))
const representative = computed(() => legalValue(legal.legalRepresentative))
const street = computed(() => legalValue(legal.legalStreet))
const addressLine2 = computed(() => legalValue(legal.legalAddressLine2))
const postalCode = computed(() => legalValue(legal.legalPostalCode))
const city = computed(() => legalValue(legal.legalCity))
const country = computed(() => legalValue(legal.legalCountry))
const email = computed(() => legalValue(legal.legalEmail))
const phone = computed(() => legalValue(legal.legalPhone))
const registerCourt = computed(() => legalValue(legal.legalRegisterCourt))
const registerNumber = computed(() => legalValue(legal.legalRegisterNumber))
const vatId = computed(() => legalValue(legal.legalVatId))
const supervisoryAuthority = computed(() => legalValue(legal.legalSupervisoryAuthority))

useHead(() => ({
  title: `${t('legal.impressumTitle')} | ${t('brand.name')}`,
  meta: [{ name: 'robots', content: reviewed.value ? 'index,follow' : 'noindex,follow' }],
}))
</script>

<template>
  <Section variant="light" padded="normal">
    <Container size="md">
      <h1 class="font-display text-3xl sm:text-4xl font-medium tracking-tight text-brand-black dark:text-white">
        {{ t('legal.impressumTitle') }}
      </h1>
      <Divider class="my-6" />

      <AppLegalDraftNotice :reviewed="reviewed" :missing="missing" />

      <div class="space-y-8 text-sm leading-relaxed text-text">
        <section>
          <h2 class="font-display text-xl font-medium">
            {{ isDe ? 'Angaben gemäß § 5 DDG' : 'Provider information under § 5 DDG (German law)' }}
          </h2>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'Anbieter' : 'Provider'" :value="providerName" />
            <AppLegalValue :label="isDe ? 'Rechtsform' : 'Legal form'" :value="legalForm" />
            <AppLegalValue :label="isDe ? 'Vertretungsberechtigt' : 'Authorised representative'" :value="representative" />
            <AppLegalValue :label="isDe ? 'Straße und Hausnummer' : 'Street and number'" :value="street" />
            <AppLegalValue :label="isDe ? 'Adresszusatz' : 'Address line 2'" :value="addressLine2" />
            <AppLegalValue :label="isDe ? 'Postleitzahl' : 'Postal code'" :value="postalCode" />
            <AppLegalValue :label="isDe ? 'Ort' : 'City'" :value="city" />
            <AppLegalValue :label="isDe ? 'Land' : 'Country'" :value="country" />
          </dl>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            {{ isDe ? 'Kontakt' : 'Contact' }}
          </h2>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'E-Mail' : 'Email'" :value="email" />
            <AppLegalValue :label="isDe ? 'Telefon' : 'Phone'" :value="phone" />
          </dl>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            {{ isDe ? 'Registereintrag und Steuern' : 'Commercial register and tax' }}
          </h2>
          <dl class="mt-4 grid gap-4 sm:grid-cols-2">
            <AppLegalValue :label="isDe ? 'Registergericht' : 'Register court'" :value="registerCourt" />
            <AppLegalValue :label="isDe ? 'Registernummer' : 'Register number'" :value="registerNumber" />
            <AppLegalValue :label="isDe ? 'Umsatzsteuer-Identifikationsnummer' : 'VAT ID'" :value="vatId" />
            <AppLegalValue :label="isDe ? 'Aufsichtsbehörde (falls einschlägig)' : 'Supervisory authority (if applicable)'" :value="supervisoryAuthority" />
          </dl>
          <p class="mt-3 text-muted">
            {{ isDe
              ? 'Nicht einschlägige Angaben sind nach rechtlicher Prüfung zu entfernen. Kleinunternehmerregelung und Registereintrag sind gesondert zu prüfen.'
              : 'Remove non-applicable items after legal review. Small-business VAT rules and register entries require separate verification.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            {{ isDe ? 'Verbraucherstreitbeilegung' : 'Consumer dispute resolution' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Angaben zur Bereitschaft oder Verpflichtung zur Teilnahme an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle sind vor Veröffentlichung rechtlich zu prüfen und zu ergänzen.'
              : 'Statements about participation in consumer dispute-resolution proceedings must be legally reviewed and completed before publication.' }}
          </p>
        </section>

        <section>
          <h2 class="font-display text-xl font-medium">
            {{ isDe ? 'Haftung und Urheberrecht' : 'Liability and copyright' }}
          </h2>
          <p class="mt-3">
            {{ isDe
              ? 'Die abschließenden Haftungs- und Urheberrechtshinweise sind durch die Rechtsberatung zu formulieren. Bis dahin ist diese Vorlage nicht zur Veröffentlichung bestimmt.'
              : 'Final liability and copyright notices must be drafted by counsel. Until then this template is not intended for publication.' }}
          </p>
        </section>

        <p class="text-xs text-muted">
          {{ isDe ? 'Dokumentversion:' : 'Document version:' }} {{ legalValue(legal.legalVersion, '–') }}
        </p>
      </div>
    </Container>
  </Section>
</template>
