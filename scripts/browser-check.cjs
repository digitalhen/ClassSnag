// Exercise the unpacked extension in isolated Chromium against synthetic gym pages.
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

(async () => {
    const root = path.resolve(__dirname, '..');
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'classsnag-browser-'));
    const context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
        args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
    });
    try {
        const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
        const id = new URL(worker.url()).host;
        const errors = [];
        worker.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const rules = await worker.evaluate(async () => {
            await frameRulesReady;
            return chrome.declarativeNetRequest.getDynamicRules();
        });
        assert.equal(rules.length, 1);
        assert.deepEqual(rules[0].condition.initiatorDomains, [id]);
        const regex = new RegExp(rules[0].condition.regexFilter);
        assert.ok(regex.test('https://demo.virtuagym.com/classes?load_event_id=1'));
        assert.ok(!regex.test('https://demo.virtuagym.com/profile'));
        assert.ok(!regex.test('https://virtuagym.com.evil.test/classes'));

        const popup = await context.newPage();
        await popup.goto(`chrome-extension://${id}/popup.html`);
        assert.equal(await popup.locator('#refreshEnabled').isChecked(), false);
        assert.equal(await popup.locator('#addToBasketEnabled').isChecked(), false);
        await popup.locator('label').filter({ has: popup.locator('#refreshEnabled') }).click();
        await popup.locator('label').filter({ has: popup.locator('#addToBasketEnabled') }).click();
        await worker.evaluate(() => chrome.storage.sync.set({ refreshAmount: 60 }));

        let loads = 0;
        const fixture = `<!doctype html><html><head><title>Fixture class</title></head><body>
            <h1>Family Swim</h1><p>This synthetic class page exercises booking responses without making a real reservation.</p>
            <div class="event-actions"><button id="book_btn">Book now</button></div>
            <script>document.querySelector('#book_btn').onclick = () => {
                document.body.insertAdjacentHTML('beforeend', '<div class="bootbox modal bootbox-alert in" style="display:block"><div class="bootbox-body">Could not make a reservation for the class. Class is full.</div><button data-bb-handler="ok">OK</button></div>');
                document.querySelector('[data-bb-handler="ok"]').onclick = () => document.querySelector('.bootbox').remove();
            };</script></body></html>`;
        await context.route('https://demo.virtuagym.com/**', route => {
            loads++;
            return route.fulfill({ contentType: 'text/html', body: fixture });
        });
        // Exercise tab creation/grouping with the reduced permission set.
        const grouped = await worker.evaluate(async () => {
            const tab = await openTabInGroup('https://demo.virtuagym.com/classes?load_event_id=2');
            const group = await chrome.tabGroups.get((await chrome.tabs.get(tab.id)).groupId);
            await chrome.tabs.remove(tab.id);
            let rejected = false;
            try { await openTabInGroup('https://example.com/classes'); } catch { rejected = true; }
            return { title: group.title, rejected };
        });
        assert.equal(grouped.title, 'ClassSnag');
        assert.equal(grouped.rejected, true);
        const monitor = await context.newPage();
        await monitor.goto(`chrome-extension://${id}/monitor.html?url=${encodeURIComponent('https://demo.virtuagym.com/classes?load_event_id=1')}`);
        await monitor.locator('#cs-msg').filter({ hasText: 'watching for another opening' }).waitFor();
        assert.equal(await monitor.frameLocator('iframe').locator('.bootbox').count(), 0);
        assert.ok((await worker.evaluate(() => getMonitoredTabIds())).length >= 1, 'keepalive discovers monitor tabs without broad tabs permission');
        assert.match(await monitor.locator('#cs-dot').getAttribute('class'), /monitoring/);
        // Messages from the monitor page itself must not impersonate its class iframe.
        await monitor.evaluate(() => window.postMessage({ type: 'classsnag', action: 'statusUpdate', status: 'success', message: 'spoof' }, '*'));
        assert.notEqual(await monitor.locator('#cs-msg').textContent(), 'spoof');
        // Exercise the real scheduled refresh without waiting a minute.
        await worker.evaluate(() => chrome.storage.sync.set({ refreshAmount: 1 }));
        await monitor.waitForFunction(() => Number(document.querySelector('#cs-refreshes').textContent) >= 1);
        assert.ok(loads >= 2);
        await worker.evaluate(() => chrome.storage.sync.set({ refreshEnabled: false }));
        await monitor.locator('#cs-msg').filter({ hasText: 'Auto-refresh is off' }).waitFor();
        await monitor.close();

        // Capture the actual extension popup with both options enabled for store artwork.
        await worker.evaluate(() => chrome.storage.sync.set({ refreshEnabled: true, refreshAmount: 30 }));
        await popup.reload();
        await popup.setViewportSize({ width: 360, height: 660 });
        const output = path.join(root, 'store/assets');
        fs.mkdirSync(output, { recursive: true });
        await popup.locator('.container').screenshot({ path: path.join(output, 'popup.png') });
        const popupImage = fs.readFileSync(path.join(output, 'popup.png')).toString('base64');
        const logo = fs.readFileSync(path.join(root, 'assets/logo-source.png')).toString('base64');
        const art = await context.newPage();
        await art.setViewportSize({ width: 1280, height: 800 });
        await art.setContent(`<!doctype html><html><head><style>
            *{box-sizing:border-box}body{margin:0;background:#f3f0fa;color:#242039;font-family:Arial,sans-serif}
            main{width:1280px;height:800px;padding:68px 88px;display:flex;align-items:center;gap:80px;position:relative;overflow:hidden}
            .copy{width:590px}.brand{display:flex;align-items:center;gap:14px;font-size:27px;font-weight:700;margin-bottom:44px}.brand img{width:64px;height:64px}
            h1{font-size:62px;line-height:1.06;letter-spacing:-2px;margin:0 0 26px}p{font-size:22px;line-height:1.5;color:#625973;margin:0 0 28px}
            .pill{display:inline-block;background:#e4dbf5;color:#654193;padding:11px 16px;border-radius:22px;font-size:15px;font-weight:700;margin-bottom:24px}
            .popup{width:360px;border-radius:20px;box-shadow:0 24px 70px #39216526;border:1px solid #e4dded}.note{font-size:14px;color:#756a83;position:absolute;bottom:34px;left:88px}
            </style></head><body><main><div class="copy"><div class="brand"><img src="data:image/png;base64,${logo}">ClassSnag</div>
            <div class="pill">FOR VIRTUAGYM CLASS BOOKINGS</div><h1>Your class is full.<br>Keep a spot<br>on your radar.</h1><p>Watch for openings. Request a booking.<br>Get notified when it’s confirmed.</p></div>
            <img class="popup" src="data:image/png;base64,${popupImage}" alt="Actual ClassSnag settings popup"><div class="note">Keep the class tab open. Availability and booking rules are set by your gym.</div></main></body></html>`);
        await art.screenshot({ path: path.join(output, 'screenshot-1280x800.png') });
        await art.setViewportSize({ width: 440, height: 280 });
        await art.setContent(`<!doctype html><html><head><style>*{box-sizing:border-box}body{margin:0;background:#f3f0fa;font-family:Arial,sans-serif;color:#292139}.tile{padding:27px 30px;width:440px;height:280px}.brand{display:flex;align-items:center;gap:10px;font-size:24px;font-weight:700}.brand img{width:54px;height:54px}h1{font-size:35px;line-height:1.08;letter-spacing:-1px;margin:20px 0 13px}p{margin:0;font-size:14px;color:#6b5c7c}</style></head><body><div class="tile"><div class="brand"><img src="data:image/png;base64,${logo}">ClassSnag</div><h1>A full class?<br>Watch for your opening.</h1><p>Availability monitoring for VirtuaGym.</p></div></body></html>`);
        await art.screenshot({ path: path.join(output, 'promo-440x280.png') });
        assert.deepEqual(errors, []);
        console.log('PASS: extension loads, scoped framing rule, popup settings, full-class recovery, iframe status, refresh, stop, and store captures.');
    } finally {
        await context.close();
        fs.rmSync(profile, { recursive: true, force: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
