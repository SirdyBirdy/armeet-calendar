/* Everything you are likely to edit lives in this file: wording, clinic details, payment. */
window.SITE = {

  /* Paste the Apps Script Web app URL here (it ends in /exec).
     Leave it empty to preview the site with fake demo data. */
  apiUrl: 'https://script.google.com/macros/s/AKfycbxgmf8FR9gYZ2rfRB4adojraslcxDxrgxB5YgJg82v5sd7ZlEQG2r7ZIaxdircZ5YVX/exec',

  brand: 'Armeet \u00B7 Psychologist',

  /* One entry per location. Add a second entry to show a "choose where" step first.
     id must match the clinic id in apps-script/Code.gs. */
  clinics: [
    {
      id: 'lcr',
      label: 'Law College Road',
      address: 'Law College Road, Pune',
      daysLabel: 'Thursdays',
      payment: {
        caption: 'Namaste Psychology \u00B7 89561 49681',
        qrImage: 'np-qr.png',   // file next to index.html; if missing, a QR is generated from the link below
        link: 'upi://pay?pa=paytmqr2810050501011jk4o5trzpm3@paytm&pn=Paytm%20Merchant&paytmqr=2810050501011JK4O5TRZPM3',
        /* Optional: a different payee for one weekday (1 = Monday ... 7 = Sunday).
           Any field you list replaces the default for that day.
        byDay: { 4: { caption: '...', qrImage: 'other-qr.png', link: 'upi://pay?...' } }, */
      },
    },
  ],

  text: {
    headings: {                       // [big heading, line under it]
      clinic:    ['Take the first step.', 'Choose where you would like to meet.'],
      timeFirst: ['Take the first step.', 'Choose a day and time that works for you.'],  // used when there is one clinic
      time:      ['Choose a time.', 'Pick what works for you.'],
      details:   ['A little about you.', 'Only what is needed. Nothing more.'],
      pay:       ['Complete your payment.', 'Scan the code or tap the button.'],
      cancel:    ['Cancel your session.', 'Check the details below.'],
    },

    heldNote: 'Your time is held while you pay.',
    payNote: 'Please share a screenshot of the payment after scanning, so I can confirm your slot.',
    whatsappHint: 'For booking updates on WhatsApp. Include the country code if it is not an Indian number.',
    consent: 'I have read and agree to the cancellation & payment policy.',

    policy: {
      title: 'Cancellation & payment policy',
      items: [
        'Sessions are confirmed once payment is received, at least 24 hrs before the appointment.',
        'Cancel 24+ hrs before: 100% refund or full credit towards rescheduling.',
        'Cancel within 24 hrs: 75% refund or partial credit.',
        'Cancel within 2 hrs or no-show: No refund.',
        'Late arrival shortens your session; over 15 mins late without notice counts as a no-show.',
      ],
      closing: "If I cancel, you'll receive a full refund or a reschedule at no extra cost.",
    },

    thanks: {
      title: 'Thank you.',
      body: 'Your slot is confirmed once your payment is received. Details have been sent to your email.',
      nextTitle: 'Next step',            // the text under it is payNote
    },

    cancelled: ['Session cancelled.', 'Any refund or credit follows the cancellation & payment policy.'],
    noTimes: 'No times are open right now. Please check back soon.',
    taken: 'That time was just taken. Here are the times still open.',
    errorLoad: 'Could not load times. Reload the page to try again.',
    errorNetwork: 'Could not reach the booking service. Check your connection and try again.',
    footnote: 'Your information is private. In an emergency, please contact your local helpline.',
  },
};
