# Submission checklist

Prepared locally; not submitted or published. Requires Chrome 116 or newer.

1. Run `npm ci`, `npm test`, `npm run test:browser`, and `npm run package`.
2. Load the unpacked folder in Chrome and verify the extension with a gym-approved test class. Confirm existing-session login works in the monitor, full-class failures recover, and successful reservations stop monitoring. Automated fixtures do not establish compatibility with every gym.
3. Host `store/privacy.html` at a public HTTPS URL. Set the support contact in the listing, update the policy's contact paragraph, and verify both links while signed out.
4. Register/sign in to the Chrome Web Store developer account, complete publisher details and enable two-step verification.
5. Upload `dist/classsnag-1.1.0.zip` as a new item (or update the existing item if this is already listed).
6. Copy the listing, single purpose and permission explanations from `store/LISTING.md`. Review privacy declarations against the actual code and current dashboard wording.
7. Upload `assets/icon-128.png`, the 440×280 promotional tile, and the 1280×800 screenshot from `store/assets/`. The screenshot shows the actual popup in a presentation layout; it does not claim a real booking.
8. Supply private reviewer instructions and a gym-approved test account/class if access is needed. Do not put real member credentials in repository files or public listing copy.
9. Select distribution regions and visibility. Review all fields, then submit for review. Choose deferred publishing if you want to inspect the approved listing before release.

## Reviewer instructions

ClassSnag requires an existing account with a gym using VirtuaGym. The extension itself has no login, paid features or developer backend. On a permitted test account, open an event URL under https://<gym>.virtuagym.com/classes?load_event_id=<id>. Open the popup; both toggles default off. Enable Auto Refresh and optionally Auto Book. A full class is periodically refreshed; a booking is attempted only if the page offers a Book button. Confirmation requires the site's Cancel booking indicator. A 'Could not make a reservation for the class. Class is full.' alert is dismissed and monitoring resumes. Disable Auto Refresh to stop future automated actions. Avoid making real bookings without gym/member authorization.

## Sources checked October 7, 2026

- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
