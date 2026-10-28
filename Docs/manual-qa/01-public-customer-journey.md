# AMIR Frisur & Kosmetik Studio — Public Customer Journey

**Document 1 of 3 · Plain-language walkthrough · 25 October 2026**

This document describes what a member of the public sees and can do on the AMIR website, from the first page view to a confirmed, paid appointment. It is written for the salon owner, reception team, and anyone who needs to understand the customer experience without reading code. It is based on a read-only review of the current application. No live booking, payment, or message was sent while preparing it, so the "expected" behaviour below describes how the product is designed to behave.

---

## 1. The journey at a glance

A typical customer moves through five stages:

1. **Arrives** on the website and reads about the studio, its services, products, and contact details.
2. **Chooses a service** and opens its booking page.
3. **Picks a staff preference, a day, and a time**, then enters name, phone number, and optionally an email address and a note.
4. **Reviews the deposit** and chooses Stripe or PayPal.
5. **Pays**, lands on a confirmation page, and receives a confirmation email. The same page and email provide a private link to view or cancel the appointment.

Some customers never book online. They browse, call, send a contact message, or start a WhatsApp conversation. Both paths are supported, and the website is designed so that a customer is never forced into a payment flow they do not understand.

---

## 2. Arriving on the site

The homepage is the studio's shop window. From top to bottom a visitor normally sees:

- An optional announcement strip and an optional scrolling ticker. These are managed by the salon and can be switched off. The announcement strip may rotate through several short messages; it can be dismissed.
- A large hero area built from one or more studio photographs. If more than one photo is configured, the hero rotates automatically at a slow interval and offers manual navigation.
- A short introduction to the studio.
- Service groups such as women's services, men's services, and other treatment categories. A group only appears if it contains at least one active service.
- Featured product categories and featured products, if the catalogue has active items.
- The studio's workflow or "how it works" content, contact prompts, and the footer.

The header offers the main navigation: home, services, products, about, contact, and a prominent booking action. The footer repeats the key links, contact details, opening information, social channels, and a "Cookie settings" control.

Two kinds of motion are present: the hero slideshow and the announcement/ticker. A visitor whose device or browser is set to reduce motion gets a calmer experience — the hero does not auto-advance, and the announcement feed does not auto-scroll. The content remains readable and manually navigable.

---

## 3. Browsing services

The services page groups treatments by section and shows a card for each active service. A card normally displays:

- the service name,
- the "from" price (the salon's starting price for that treatment),
- the duration in minutes,
- a short description, and
- a booking action.

Some services are marked internally as having a duration that still needs review. For those services the duration is deliberately hidden on the public card, so the salon does not advertise a time it has not confirmed. The price and booking action remain visible. This is a presentation safeguard, not an error: the service can still be booked, and the booking page continues to use the duration stored for scheduling.

A sticky section menu on the left (or a horizontally arranged menu on smaller screens) jumps to each service group. The page highlights the group currently in view. Inactive services are not shown at all. If no services are active, the page presents its empty state rather than a broken layout.

Each card leads to a dedicated booking page for that service. On a phone, a persistent booking bar at the bottom of the services page keeps the primary action within reach without covering the last row of content.

Customers who prefer not to use the online flow can use the WhatsApp booking link shown on the booking page. That link opens a chat with the salon and pre-fills a short message naming the service.

---

## 4. Browsing the product catalogue

The products area is a **showcase**, not an online shop. Customers can:

- browse all active products,
- search by text,
- filter by category, price range, and product attributes,
- sort the results,
- move between pages, and
- open a product page with a photo gallery, description, price, technical specifications, optional demonstration video, and downloadable PDF documents.

Product pages also offer "share on WhatsApp" and "copy link" actions. The WhatsApp action shares the product page; it does not place an order. **There is no cart, no checkout, and no online payment for products.** A customer who wants to buy must contact the salon. This is a deliberate current limitation, not a broken button: no "add to cart" control is presented.

Inactive products and empty categories are hidden from the public catalogue. An unknown category or product address produces a friendly "not found" page rather than a blank screen.

---

## 5. Contacting the studio

The contact page combines the salon's published contact details with a short message form. The form asks for:

- name (required),
- phone number (required),
- message (required).

The phone field is checked for a plausible phone shape before the message is accepted. A successful submission shows a confirmation message, clears the form, and places the message in the salon's admin inbox. A failure shows an error and keeps the customer on the page so they can retry. The form does not ask for an email address and does not send an automatic reply to the customer.

The same page provides phone, email, address, map, and social links where the salon has configured them. If a link or map address is missing, the surrounding layout still renders; the individual element is simply absent.

---

## 6. Booking an appointment

### 6.1 Choosing a staff member

The booking page first asks who should perform the service. The customer can choose **"Any staff"** or a named team member. Only active, bookable staff who can perform that service are offered.

If the salon has not yet configured any bookable staff, the page says so plainly and shows no staff choices. The time grid is then empty. The customer cannot complete a booking, but the page does not crash or display a misleading "fully booked" message.

Choosing a named staff member reloads the available times for that person. Choosing "Any staff" reloads the combined availability.

### 6.2 Choosing a day and time

The customer selects a date and sees a grid of times. Times that are already taken are shown but disabled and labelled as booked, so the customer can see the shape of the day rather than wondering where the times went. The grid observes the salon's slot interval (15 minutes by default), the service duration, working hours, staff schedules, absences, and existing appointments.

If the selected day is closed, has no working hours configured, or has no remaining capacity, the page shows a "no available times" message. This is intentionally different from an error: the customer is invited to try another day.

### 6.3 Entering details

The customer then provides:

- **Name** — required.
- **Phone** — required. The booking form accepts international formats and does not reject unusual but valid numbers at this stage; the salon uses the number for contact and for WhatsApp.
- **Email** — optional, but if provided it must look like a valid email address. This is the address used for the confirmation and reminder emails.
- **Note** — optional free text for the salon.
- **WhatsApp reminder opt-in** — optional. This records the customer's willingness to receive a WhatsApp reminder; it does not automatically send one.

The cancellation policy is shown before the customer commits. The policy states the salon's cancellation window (24 hours by default).

### 6.4 The deposit

After the customer continues, the page discloses the deposit before any payment choice. The deposit is a percentage of the service price (50% by default) and is calculated by the server, not by the browser. The customer sees the exact amount and a short explanation that it is a deposit against the treatment.

At this point the appointment exists as a **pending hold**. The time is reserved for a limited period (20 minutes by default) while the customer pays. If payment is not completed in time, the hold expires and the time returns to the public grid.

### 6.5 Choosing a payment method

Only payment methods enabled by the salon are offered. The customer may see:

- **Stripe** (card and other Stripe-supported methods), and/or
- **PayPal**.

The customer is never redirected automatically. They must press the button for the method they want. This is deliberate: the deposit and the payment choice are both visible before leaving the site.

If the salon has switched both methods off, online booking cannot be completed. The customer sees a clear message that online payment is currently unavailable and is invited to contact the salon. A booking is not left in a half-created state.

---

## 7. Paying

### 7.1 Successful payment

Pressing Stripe or PayPal opens the provider's own payment page. On success the customer returns to the AMIR confirmation page.

The confirmation page is deliberately patient. It checks the booking status immediately and, if the payment provider's confirmation has not arrived yet, shows a "confirming your payment" state and checks again every few seconds for up to about a minute. It does **not** show a false failure while the provider is still processing.

Once the payment is confirmed, the page shows:

- a success message,
- the booking number,
- the service,
- the duration,
- the date and time,
- the deposit paid, and
- a link to manage the booking.

Reloading the confirmation page is safe. It reads the current status again and shows the same result. It does not create a second booking, charge again, or lose the confirmation.

### 7.2 Failed, cancelled, or abandoned payment

If the customer cancels at the provider, the browser returns to a failure page. The page shows the booking number and the deposit amount, and offers the enabled payment methods again plus a link back to the services page. Retrying creates a **new payment attempt on the same booking**; it does not duplicate the appointment. If the booking has meanwhile been paid, the retry buttons are not shown and the server refuses a second payment.

If the payment hold has expired by the time the customer retries, the server explains that the hold has expired and asks the customer to choose a new time. The old pending booking is marked expired and its slot is released.

A payment that arrives after the hold has expired is a special case. The money may have left the customer's account, but the slot is no longer reserved. The system does not silently confirm the appointment. It flags the booking as needing a refund and alerts the salon so a human can resolve it.

### 7.3 Paying later from a link

For appointments created by the salon (for example by phone or WhatsApp), the salon can send a payment link. That link opens a dedicated payment page for the booking. It works like the normal payment step: the deposit is shown, only enabled methods are offered, and the same success and failure rules apply. An unknown or already-paid link is rejected with a clear message.

---

## 8. After booking

### 8.1 Confirmation email

If the customer supplied an email address, a confirmation email is queued after payment. It contains the appointment details and, where available, a private management link. The email is sent through the salon's configured mail provider. If email delivery is not configured, the booking itself is unaffected; the confirmation simply cannot be delivered.

### 8.2 Reminders

Email reminders are sent automatically before the appointment when the customer has an email address and the booking was made earlier than the reminder lead time (60 minutes by default). A booking made inside that lead time does not receive a separate reminder because the confirmation already serves that purpose.

WhatsApp reminders are **manual**. The salon sees due appointments in its admin panel and opens a pre-filled WhatsApp chat. The customer's opt-in checkbox is recorded for the salon's reference. No WhatsApp message is sent automatically by the system.

### 8.3 The management link

The confirmation page and confirmation email provide a private link of the form `/booking/manage/<private-token>`. It shows the service, date, time, duration, staff member, booking number, and deposit. It is specific to that booking and cannot be used to browse other bookings.

If the appointment is paid, still active, and more than the cancellation window away, the customer can cancel it themselves. A confirmation dialog explains the deposit and asks for an optional reason. Cancelling triggers an automatic deposit refund through the original payment provider where possible. The page then shows the cancellation result and the refund status.

Inside the cancellation window, the cancel button is replaced by a message explaining that online cancellation is no longer possible and that the customer should contact the salon. Cancelling twice is safe: the second attempt does not issue a second refund.

**Rescheduling is not available to customers.** The management page offers viewing and cancelling only. A customer who needs a different time must contact the salon. There is also no customer account area: the private link is the only self-service entry point.

---

## 9. Cookies, marketing, and legal pages

On a first visit, a consent banner appears on public pages. It offers:

- **Accept all**,
- **Reject all**, and
- **Settings**, where marketing is off unless the customer turns it on.

The choice is stored for 180 days. Nothing marketing-related is pre-ticked. If the customer rejects marketing, the Meta pixel is not loaded and marketing cookies are not used. If the customer accepts, the pixel may load (when the salon has configured and enabled it) and the booking flow may share campaign attribution with Meta. The footer's "Cookie settings" link reopens the banner so a choice can be changed. Withdrawing marketing consent removes the Meta cookies the site created and stops further marketing events.

The legal pages — terms and conditions, privacy policy, imprint, and cancellation policy — currently show a placeholder message and a contact link. They do not yet contain full legal text. This is a known gap and should be treated as content that still has to be supplied, not as a customer error.

---

## 10. Language and devices

The site supports English and German. In the normal configuration, English is the default and German is available under `/de/...`; the language switcher keeps the customer on the same page. In a German-only launch configuration, German is the only language, URLs have no language prefix, and no switcher is shown. Public copy, validation messages, booking pages, emails, and the management page follow the active language.

The public site is designed to work at a 360-pixel-wide phone screen. Navigation collapses into a menu, cards stack, the booking grid remains usable, and the sticky booking action does not cover the content it belongs to. The admin area also collapses its sidebar on small screens, although dense tables are naturally harder to use on a phone than on a desktop.

Visitors who prefer reduced motion are respected: the hero does not auto-rotate, the announcement feed does not auto-scroll, and transitions are minimised. Nothing becomes unreachable as a result.

---

## 11. Edge cases in plain language

**No staff configured.** The booking page says that no staff are available, shows no time slots, and cannot submit. It does not claim the day is fully booked.

**A service with a duration under review.** The duration is hidden on the public service card. The price and booking action remain. The salon can still take the booking and confirm the time internally.

**A fully booked day.** The time grid shows only taken times (disabled) or the "no available times" message, depending on the day. The customer can change the date or staff choice.

**A closed day or missing working hours.** The day behaves as unavailable and shows the empty-times message. It is not presented as a system failure.

**Online payments switched off.** A customer who reaches the payment step is told that online payment is unavailable and is invited to contact the salon. No pending booking is left behind, and no payment button is shown.

**Two customers choose the last slot at the same moment.** One booking succeeds. The other receives a "this time was just taken" message and is invited to choose another time. The system does not create overlapping appointments and does not take two deposits for one slot.

**A payment fails or is abandoned.** The customer lands on a failure page and can retry the same booking. A retry does not duplicate the appointment. A booking that is already paid cannot be paid again.

**The confirmation page is reloaded, or the customer returns later.** The page re-reads the status and shows the same confirmed booking. It does not create a second booking, re-charge, or lose the management link.

**A payment arrives after the hold expired.** The appointment is not silently confirmed. It is marked for refund attention and the salon is alerted.

**Reduced motion is enabled.** Autoplay and auto-scrolling stop; manual controls and all content remain available.

**A 360-pixel phone.** Public pages, the booking flow, the slot grid, and the admin sidebar remain usable without horizontal scrolling. Dense admin tables may still require horizontal scrolling, which is a usability limitation rather than a broken page.

---

## 12. What customers cannot do today

To set expectations correctly, the following are **not** part of the current public experience:

- Create an account, sign in, or see a history of past bookings.
- Reschedule an appointment online. Only viewing and cancelling are offered.
- Buy products online. The catalogue is display-only; there is no cart or checkout.
- Read full legal terms, privacy text, imprint, or cancellation policy. All four pages are placeholders with a contact link.
- Receive automatic WhatsApp messages. WhatsApp reminders are prepared and sent manually by the salon.
- Choose a payment method that the salon has not enabled.

---

## 13. What to tell customers

A short, accurate script for the reception team:

> "You can book online through our website. Choose your service, your preferred stylist or 'any staff', and a time. We ask for a deposit — normally half the treatment price — and you can pay by card through Stripe or with PayPal, whichever we have enabled. You will get a confirmation by email if you leave your address, and the confirmation page gives you a private link to view or cancel. You can cancel online up to 24 hours before the appointment; after that, please call us. If you would rather not pay online, contact us and we will arrange it."

If a customer says the site will not let them book, the useful questions are: is a stylist selected or "any", is the day closed, is the time already taken, and has the salon enabled at least one online payment method. Those four conditions explain most blocked bookings.
