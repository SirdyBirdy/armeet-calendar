# Session booking site

A static booking page (GitHub Pages) that reads and writes your Google Calendar through a small Google Apps Script. No payment gateway. No API keys.

How a booking works:

1. The client picks a day and time. The page only offers slots that leave no gap (see "Slot rule").
2. The client enters their details. The slot is held and a yellow event appears in your calendar, titled `Name with Namaste Psychology (LCR)`.
3. The client pays by UPI (QR or button), then taps **I've paid**. You get an email.
4. You check Paytm and turn the calendar event green. That is your confirmation.

## Files

```
index.html            page markup
css/style.css         look and feel
js/config.js          WORDING, CLINICS, PAYMENT  <- the file you edit most
js/app.js             page logic (rarely edited)
js/demo.js            fake data for previewing (used only while apiUrl is empty)
js/qrcode.min.js      QR code library (fallback when the QR image is missing)
np-qr.png             your payment QR image
apps-script/Code.gs   backend, pasted into Google Apps Script (NOT uploaded to GitHub)
apps-script/appsscript.json   Apps Script settings (time zone, web app access)

../booking-admin/     private admin page (separate Apps Script project, also NEVER uploaded to GitHub)
```

## Slot rule

Law College Road, Thursday, 10am to 2pm, four one-hour slots, no buffer.

| Already booked | Offered |
|---|---|
| nothing | 10, 11, 12, 1 |
| 11 | 10, 12 |
| 1 | 12 |
| 10 | 11 |
| 11 and 12 | 10, 1 |

Any calendar event that overlaps a slot blocks it and counts as booked. So an all-day event (a holiday) closes the whole day, and a personal event inside 10 to 2 changes what is offered. If you do not want personal events to affect this, create a separate calendar for bookings and put its ID in `calendarId` (see Keys).

## 1. Preview the page on your computer

Open `index.html` in a browser. With `apiUrl` empty, the page runs on demo data: a Demo badge shows bottom left, the first open Thursday offers all four slots, the second has 11 booked, the third has 1pm booked. Nothing is saved anywhere.

## 2. Set up Google Apps Script

Apps Script is Google's built-in scripting tool. A script runs as you, so it can read your calendar and send email from your Gmail. When you deploy it as a "Web app" it gets a public URL, and your website talks to that URL. Two functions answer web requests: `doGet` (reads) and `doPost` (writes). You never run those by hand.

### 2.1 Create the project

1. Go to https://script.google.com while signed in to the Google account whose calendar you use.
2. Click **New project**. Click "Untitled project" at the top and rename it `Booking API`.
3. Click the gear icon (**Project Settings**). Tick **Show "appsscript.json" manifest file in editor**.
4. Go back to the **Editor** (the `<>` icon). Open `appsscript.json` and replace everything in it with the contents of `apps-script/appsscript.json`. This sets the time zone to Asia/Kolkata.
5. Open `Code.gs`, delete what is there, and paste in the contents of `apps-script/Code.gs`.

### 2.2 Edit the settings at the top of Code.gs

Change `ownerEmail` to your email. `siteUrl` is already set to `https://sirdybirdy.github.io/armeet-calendar/`, which the cancel link in client emails uses. Everything else is already set for Law College Road on Thursdays. Click the disk icon (or Ctrl/Cmd+S) to save.

### 2.3 Run it once to grant permission

1. In the toolbar, use the dropdown beside **Run** to choose `authorize`, then click **Run**.
2. Click **Review permissions** and choose your account.
3. You will see "Google hasn't verified this app". This is your own script. Click **Advanced**, then **Go to Booking API (unsafe)**, then **Allow**.
4. The Execution log at the bottom should say `Authorised.`

### 2.4 Test the slots without the website

Choose `testAvailability` in the dropdown and click **Run**. The Execution log prints the open Thursdays and their slots as JSON. If it prints `"days": {}`, check that a Thursday falls in the next 35 days, no all-day event covers it, and it is more than 24 hours away.

### 2.5 Deploy as a Web app

1. Click **Deploy**, then **New deployment**.
2. Click the gear beside "Select type" and choose **Web app**.
3. Description: `v1`. **Execute as**: Me. **Who has access**: Anyone.
4. Click **Deploy**, then copy the **Web app URL** (it ends in `/exec`).
5. Test it: paste the URL into a browser tab and add `?action=availability&clinic=lcr` to the end. You should see the same JSON as in step 2.4.

"Anyone" is required so your site can call it. It does not give anyone access to your calendar. They can only use the actions in `Code.gs`.

### 2.6 Where to look when something breaks

Click **Executions** in the left sidebar. Every request and every error is listed there, with the log lines.

### 2.7 Changing the script later

Saving is not enough. The live URL runs the last deployed version. After any change to `Code.gs`: **Deploy**, **Manage deployments**, the pencil icon, **Version: New version**, **Deploy**. The URL stays the same.

## 3. Connect the site to the script

1. In `js/config.js`, paste the Web app URL into `apiUrl`.
2. Open the page again. The Demo badge disappears and the slots now come from your calendar.

## 4. Put the site on GitHub Pages

1. Create a new **public** repository on GitHub (this one is `armeet-calendar`).
2. Upload `index.html`, `np-qr.png`, and the `css` and `js` folders. **Do not upload the `apps-script` folder or `booking-admin`.** `Code.gs` holds your email address and the repo is public.
3. In the repo, go to **Settings**, **Pages**. Under "Build and deployment" choose **Deploy from a branch**, branch `main`, folder `/ (root)`, and Save.
4. After a minute your site is live at `https://sirdybirdy.github.io/armeet-calendar/`.
5. Check that `siteUrl` in `CFG` matches that address exactly, including the trailing `/`. If you ever rename the repo, change it and redeploy a new version (step 2.7).

The phone number and UPI link in `js/config.js` are public because they are the same information printed on your QR.

## 5. Test it end to end

1. Book a slot with your own email. A yellow event titled `Your Name with Namaste Psychology (LCR)` appears in your calendar, and you get the confirmation email.
2. Reload the page. The slots left should follow the slot rule.
3. Tap **I've paid**. You get a "Payment claimed" email.
4. Turn the event green (Basil) to confirm it.
5. Open the cancel link from the email. Cancel. The event disappears and you get a "Cancelled" email with the hours before the session.

## 6. Day to day

| I want to | Do this |
|---|---|
| Confirm a booking | Check Paytm, then turn the calendar event green (Basil). |
| Block a day | Add an all-day event on that day. |
| Block part of a day | Add an event covering that slot. |
| Remove a booking | Delete the event. The slot reopens. |
| See who booked | Open the event. Name, email, WhatsApp number (with a tap-to-chat link) and notes are in the description. |
| Release unpaid holds automatically | Set `holdHours` (for example `12`), save, run `installHoldTrigger` once, redeploy. Holds that were never marked paid and not turned green are deleted after that time and the client is emailed. Bookings where the client tapped **I've paid** are never auto-released. |

Colours: yellow (Banana) means held and unpaid. Green (Basil) means confirmed.

## 7. Changing things

**Different weekday or hours.** In `Code.gs`, edit `days`: `{ 4: { start: '10:00', end: '14:00' } }`. Key 1 is Monday through 7 for Sunday. Several days: `{ 2: {...}, 4: {...} }`. Then update `daysLabel` in `js/config.js` and redeploy the script.

**Session length, buffers, maximum.** `session`, `buffer`, `longBuffer`, `longAfter`, `max` in `Code.gs`. Example for NIBM Mondays: `days: { 1: { start: '11:00', end: '17:00' } }, session: 50, buffer: 15, longBuffer: 30, longAfter: 3, max: 5`.

**Add another location (for example NIBM).**
1. In `Code.gs`, copy the `lcr` block inside `clinics`, rename the id (`nibm`), and change address, org, days and session settings.
2. In `js/config.js`, copy the clinic block inside `clinics`, use the same id, and change label, address, daysLabel and payment.
3. With two or more clinics the page shows a "choose where" step first. Redeploy the script and re-upload `config.js`.

**Different payee on a particular weekday.** In `js/config.js`, uncomment `byDay` inside the clinic's `payment` and give the weekday number its own caption, qrImage or link.

**Wording.** Everything the client reads is in the `text` section of `js/config.js`: headings, payment note, policy bullets, thank you message.

**Replace the QR.** Save the new image as `np-qr.png` in the same folder. For a different UPI link, change `link` in `payment`.

## 8. Keys reference

There are no API keys. The only value that connects the two halves is the Web app URL.

### `js/config.js` (the website)

| Key | What it does |
|---|---|
| `apiUrl` | Apps Script Web app URL. Empty means demo mode. |
| `brand` | Text in the top bar. |
| `clinics[].id` | Must match the clinic id in `Code.gs`. |
| `clinics[].label`, `address`, `daysLabel` | What the client sees as the location line. |
| `clinics[].payment.caption` | Line shown under the QR. |
| `clinics[].payment.qrImage` | QR image file. If it fails to load, a QR is generated from `link`. |
| `clinics[].payment.link` | `upi://pay?...` link behind the Pay with UPI button. |
| `clinics[].payment.byDay` | Optional per-weekday payee override. |
| `text.*` | All client-facing wording, including the hint under the WhatsApp field. |

### `CFG` in `Code.gs` (the backend)

| Key | What it does |
|---|---|
| `tz` | Time zone for all slot maths. |
| `calendarId` | `'primary'` or another calendar's ID (Google Calendar, calendar settings, "Integrate calendar"). |
| `ownerEmail` | Receives payment-claimed and cancellation emails. |
| `senderName` | Sender name on client emails. |
| `siteUrl` | GitHub Pages address, used in the cancel link. |
| `daysAhead` | How far ahead clients can book. |
| `minNoticeHours` | No bookings closer than this. 24 matches your policy. |
| `maxActivePerEmail` | Upcoming bookings allowed per email address. |
| `holdHours` | Auto-release unpaid holds after this many hours. 0 is off. |
| `clinics.<id>.days / session / buffer / longBuffer / longAfter / max` | The schedule for that location. |
| `clinics.<id>.mode` | `cluster` (no gaps) or `sequence` (only the first free slot). |
| `clinics.<id>.org` | Used in the calendar title. |

## 9. Troubleshooting

| Problem | Fix |
|---|---|
| Page says it could not load times | Open the Web app URL with `?action=availability&clinic=lcr`. If you get a Google sign-in page, redeploy with **Who has access: Anyone**. Make sure `apiUrl` ends in `/exec`, not `/dev`. |
| Changes to `Code.gs` have no effect | Redeploy a new version (step 2.7). |
| No emails arrive | Run `authorize` again and accept the prompts. Check spam. Free Google accounts can send about 100 emails a day. |
| A day shows no slots | An event overlaps every slot (check for all-day events), or the day is less than 24 hours away. |
| Slots look an hour or more off | `appsscript.json` time zone is not `Asia/Kolkata` (Project Settings, Time zone). |
| "Unknown location" | The clinic id in `js/config.js` does not match the one in `Code.gs`. |
| Cancel link says it is no longer valid | The event was already deleted, or the link was cut off when copied. |

## 10. Limits to know about

- The WhatsApp number is required and stored in the event description (and as a hidden tag for later automation). A 10-digit number is read as Indian (+91). Numbers from other countries need the country code. Nothing is sent over WhatsApp yet.

- Payment cannot be verified automatically. **I've paid** only tells you to check Paytm. The slot is held from the moment someone confirms their details.
- The Web app URL is public. The honeypot field and the per-email limit stop casual spam, not a determined person.
- If two people book the same slot at the same moment, the second one is told the time was just taken and is shown the slots still open.

## 11. What is public and what is private

GitHub Pages on a free account only works from a public repository. A private repository needs a paid plan, and even then the published site is still public (only GitHub Enterprise Cloud can restrict who sees it). So a private repo does not hide a Pages site, and nothing sensitive should live in this repo at all.

| Where | What is there |
|---|---|
| Public GitHub repo | Page code, wording, clinic name and address, the Paytm number and UPI link (printed on your QR anyway), the QR image, the Apps Script web app URL |
| Google Apps Script (public booking script) | Your email and settings, in `Code.gs`. Never uploaded to GitHub |
| Google Calendar | Every booking, with client name, email and WhatsApp number in the event |
| Google Apps Script (admin project) | The admin page. Only your Google account can open it |

What the public web app URL can do: list open slot times, create a booking, and let a client look up, mark paid, or cancel their own booking using the private token in their email. It never returns anyone's name, email or number.

If `Code.gs` was ever committed to the repo, delete it there. Git keeps history, so if it held your real email, treat that address as visible. Nothing else in the code is secret.

Admin setup is in `../booking-admin/README.md`.
