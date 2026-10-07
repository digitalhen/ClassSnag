const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM, VirtualConsole } = require('jsdom');

async function agent() {
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => errors.push(error.message));
    const dom = new JSDOM('<h1>Family Swim</h1><p>Class details for a family swim reservation at the local pool.</p><div class="event-actions"><button id="book_btn">Book now</button></div>', {
        url: 'https://example.virtuagym.com/classes?load_event_id=123',
        runScripts: 'outside-only', virtualConsole
    });
    const w = dom.window;
    await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve));
    Object.defineProperty(w.document.body, 'innerText', { get() { return this.textContent; } });
    let nextId = 0;
    const timers = new Map();
    w.setTimeout = (fn, delay) => { timers.set(++nextId, { fn, delay, repeat: false }); return nextId; };
    w.setInterval = (fn, delay) => { timers.set(++nextId, { fn, delay, repeat: true }); return nextId; };
    w.clearTimeout = w.clearInterval = id => timers.delete(id);
    let onMessage, onChange;
    const notifications = [];
    w.chrome = {
        runtime: { getURL: x => x, sendMessage: x => notifications.push(x), onMessage: { addListener: fn => onMessage = fn } },
        storage: {
            sync: { get: (_, cb) => cb({ refreshEnabled: true, refreshAmount: 30, addToBasketEnabled: true }) },
            local: { get: (_, cb) => cb({}), set() {}, remove() {} },
            onChanged: { addListener: fn => onChange = fn }
        }
    };
    w.Audio = class { play() { return Promise.resolve(); } };
    w.eval(fs.readFileSync('jquery.min.js', 'utf8'));
    // jsdom has no layout; represent visibility using the fixture's display property.
    w.$.expr.pseudos.visible = el => el.style.display !== 'none';
    let clicks = 0;
    w.document.getElementById('book_btn').addEventListener('click', () => clicks++);
    w.eval(fs.readFileSync('content.js', 'utf8'));
    w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
    function run(delay) {
        for (const [id, timer] of [...timers]) {
            if (timer.delay !== delay || !timers.has(id)) continue;
            if (!timer.repeat) timers.delete(id);
            timer.fn();
        }
    }
    function ping() { let response; onMessage({ action: 'keepalive' }, {}, x => response = x); return response; }
    async function settle() { await Promise.resolve(); await Promise.resolve(); }
    return {
        w, timers, notifications, errors, run, ping, settle,
        get clicks() { return clicks; },
        get status() { return w.document.getElementById('cs-msg').textContent; },
        stop: () => onChange({ refreshEnabled: { newValue: false } }),
        forceRefresh: () => onMessage({ action: 'forceRefresh' }, {}, () => {}),
        confirm: async () => { w.document.querySelector('.event-actions').insertAdjacentHTML('beforeend', '<span>Cancel booking</span>'); await settle(); },
        full: async () => {
            w.document.body.insertAdjacentHTML('beforeend', '<div class="bootbox modal bootbox-alert in" style="display: block"><div class="bootbox-body">Could not make a reservation for the class. Class is full.</div><button data-bb-handler="ok">OK</button></div>');
            const dialog = w.document.querySelector('.bootbox');
            dialog.querySelector('button').onclick = () => dialog.remove();
            await settle();
        },
        close: () => w.close()
    };
}

test('two competing agents: winner confirms, loser dismisses full alert and resumes refreshing', async () => {
    const winner = await agent();
    const loser = await agent();
    try {
        winner.run(1000); loser.run(1000);
        assert.equal(winner.clicks, 1);
        assert.equal(loser.clicks, 1);
        assert.equal(winner.notifications.length, 0);
        assert.match(winner.status, /waiting for confirmation/);
        await winner.confirm(); await loser.full();
        assert.equal(winner.notifications.length, 1);
        assert.match(winner.status, /Reservation confirmed/);
        assert.equal(loser.notifications.length, 0);
        assert.match(loser.status, /watching for another opening/);
        assert.equal(loser.w.document.querySelector('.bootbox'), null);
        const refresh = [...loser.timers.values()].find(t => !t.repeat && t.delay >= 24000 && t.delay <= 36000);
        assert.ok(refresh, 'loser schedules the configured refresh with jitter');
        loser.run(1000);
        assert.equal(loser.clicks, 1, 'stale book button is not clicked again');
        assert.equal(winner.ping().hasTimer, true, 'keepalive must leave confirmed booking alone');
        winner.forceRefresh();
        assert.equal(winner.errors.length, 0);
        loser.run(refresh.delay);
        assert.ok(loser.errors.some(x => /navigation/.test(x)), 'loser requests reload');
    } finally { winner.close(); loser.close(); }
});

test('unanswered booking is bounded and keepalive cannot interrupt a pending request', async () => {
    const a = await agent();
    try {
        a.run(1000);
        assert.equal(a.ping().hasTimer, true);
        a.forceRefresh();
        assert.equal(a.errors.length, 0);
        a.run(15000);
        assert.match(a.status, /Booking unconfirmed/);
        assert.ok(a.errors.some(x => /navigation/.test(x)));
        assert.equal(a.notifications.length, 0);
    } finally { a.close(); }
});

test('turning monitoring off cancels pending booking observation and timers', async () => {
    const a = await agent();
    try {
        a.run(1000); a.stop(); await a.confirm(); a.run(15000);
        assert.equal(a.notifications.length, 0);
        assert.equal(a.errors.length, 0);
        assert.equal(a.status, 'Auto-refresh is off');
    } finally { a.close(); }
});

test('existing reservation takes priority over a stale book button', async () => {
    const a = await agent();
    try {
        await a.confirm(); a.run(1000);
        assert.equal(a.clicks, 0);
        assert.equal(a.notifications.length, 0);
        assert.equal(a.status, 'Class already booked');
        a.ping(); a.forceRefresh();
        assert.equal(a.errors.length, 0);
    } finally { a.close(); }
});

test('disabling monitoring while waiting for buttons prevents a later booking', async () => {
    const a = await agent();
    try {
        a.stop(); a.run(1000);
        assert.equal(a.clicks, 0);
        assert.equal(a.status, 'Auto-refresh is off');
    } finally { a.close(); }
});
