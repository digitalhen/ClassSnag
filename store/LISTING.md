# Chrome Web Store listing — ClassSnag 1.1.0

Name: ClassSnag

Short description (manifest): Watch VirtuaGym classes for openings and automatically request a booking when a spot becomes available.

Submitted category: Tools.
Language: English.

## Detailed description

Get another shot at your favorite class.

ClassSnag watches a VirtuaGym class page for available spots. Turn on Auto Refresh to keep checking a full class or wait for its booking window to open. Turn on Auto Book to request a reservation when the Book button becomes available.

• Choose a refresh interval from 1 to 60 seconds. Small timing variations help avoid synchronized requests.
• Monitor cancellations and booking windows while the class tab stays open.
• See monitoring status and the next refresh countdown.
• Receive a notification when the page confirms your reservation.
• If someone gets the last opening first, ClassSnag dismisses the full-class alert and resumes monitoring.
• Keep class monitors together in a ClassSnag tab group.

To start, sign in to your gym’s VirtuaGym website, open a class, then enable Auto Refresh and, optionally, Auto Book from the extension popup. Keep Chrome and the class tab open. Both options are off by default. Settings apply to open monitored classes and can sync through Chrome Sync.

ClassSnag requests bookings through the website using your existing signed-in session. Availability, booking eligibility and confirmation are controlled by your gym. A booking is not guaranteed. Two tabs using the same gym account do not create two separate member identities or bypass booking limits. To reserve for two people, use the separate accounts or family-booking options your gym supports.

ClassSnag has no developer-operated backend, analytics or advertising. It reads class details and reservation status locally to provide its features. Your gym still receives normal page loads and booking requests. See the privacy policy for details.

ClassSnag is an independent extension, not affiliated with or endorsed by VirtuaGym, YMCA, or any gym. Use it where your gym permits automated booking. Compatibility depends on your gym’s VirtuaGym page layout.

## Single purpose

Monitor VirtuaGym fitness-class availability and optionally request a reservation when an opening becomes available.

## Permission justifications

- storage: Save the user's monitoring, refresh interval and auto-book settings through Chrome Sync; store local monitoring counters and start times.
- tabGroups: Group class-monitor tabs so users can manage their monitored classes together.
- notifications: Display a local desktop notification with the class name after the website confirms a reservation.
- alarms: Periodically check monitored tabs and recover missing refresh timers.
- declarativeNetRequestWithHostAccess: Allow a VirtuaGym class page to appear inside ClassSnag's persistent monitor. A rule removes X-Frame-Options and Content-Security-Policy response headers only for HTTPS VirtuaGym /classes subframe requests initiated by this extension. It does not modify ordinary top-level browsing or frames initiated by other websites.
- https://*.virtuagym.com/*: Read class availability and reservation status, operate the booking button with user opt-in, refresh monitored class pages, and embed them in the monitor. The extension does not read passwords or session cookies.

Remote code: No. All extension JavaScript is bundled. The monitored third-party website runs its own site code within its own HTTPS origin; it is not downloaded and executed as extension code.

## Privacy dashboard notes

The extension locally processes website content (class names, capacity and reservation status) and class-page URLs. It stores settings via Chrome Sync and counters locally. It does not send these to the developer. Disclose website content and web history/URLs if the dashboard asks about all accessed or handled data; do not describe it as having no access to user data. Review the exact dashboard wording before certifying the declarations.

No sale of user data; no advertising; no unrelated use or transfer; no creditworthiness or lending use.

## Values to complete before submission

- Public support URL: https://github.com/digitalhen/ClassSnag/issues
- Public HTTPS privacy-policy URL: https://apps.cleartextlabs.com/classsnag/privacy.html
- Homepage: https://apps.cleartextlabs.com/classsnag/
- Distribution countries and visibility: owner's choice.
- Reviewer test access: a gym-approved test account/class if required; enter credentials only in the dashboard's private test-instructions field.
