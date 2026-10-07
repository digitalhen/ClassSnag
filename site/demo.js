'use strict';
(() => {
    const $ = id => document.getElementById(id);
    let scenario = 'normal';
    let timers = [];
    const later = (fn, delay) => timers.push(setTimeout(fn, delay));
    function status(message, reservation, count = '8 / 8 spots', appearance = '') {
        $('demo-status').textContent = message;
        $('reservation').textContent = reservation;
        $('capacity').textContent = count;
        $('spots').className = 'spots ' + appearance;
        $('reservation').className = 'reservation-state' + (appearance === 'booked' ? ' confirmed' : '');
    }
    function log(title, detail) {
        const li = document.createElement('li');
        const number = document.createElement('span');
        number.textContent = String($('event-log').children.length + 1).padStart(2, '0');
        const text = document.createElement('div'); text.textContent = title;
        const small = document.createElement('small'); small.textContent = detail;
        text.appendChild(small); li.append(number, text); $('event-log').appendChild(li);
    }
    function reset() {
        timers.forEach(clearTimeout); timers = [];
        $('run').disabled = false; $('run').textContent = 'Run the demo ↗';
        $('event-log').replaceChildren();
        status($('demo-refresh').checked ? 'Watching for an opening' : 'Auto-refresh is off', 'Fully booked');
        log('Class is full.', 'Monitoring is ready. Run the demo to see what comes next.');
    }
    function finish() { $('run').disabled = false; $('run').textContent = 'Run again ↗'; }
    function confirm() {
        status('Booked! Reservation confirmed', 'Your reservation is confirmed', '8 / 8 spots', 'booked');
        log('Your spot is confirmed.', 'The site confirms the booking. Monitoring stops.');
        finish();
    }
    function opening() {
        status('An opening is available', 'One spot available', '7 / 8 spots', 'open');
        log('Someone cancels. One spot opens.', 'ClassSnag sees that booking is available.');
        if (!$('demo-book').checked) { status('Spot available — auto-book is off', 'One spot available', '7 / 8 spots', 'open'); finish(); return; }
        later(() => {
            status('Waiting for the site to confirm', 'Booking requested…', '7 / 8 spots', 'open');
            if (scenario === 'normal') { later(confirm, 1600); return; }
            later(() => {
                status('Class filled — watching for another opening', 'Fully booked');
                log('Another member got there first.', 'The full-class alert is dismissed. Monitoring resumes.');
                later(() => {
                    status('Another opening — requesting a booking', 'Booking requested…', '7 / 8 spots', 'open');
                    later(confirm, 1600);
                }, 2200);
            }, 1600);
        }, 1400);
    }
    $('run').addEventListener('click', () => {
        reset();
        if (!$('demo-refresh').checked) { $('event-log').replaceChildren(); log('Monitoring is off.', 'Enable Auto Refresh to watch for an opening.'); return; }
        $('run').disabled = true; $('run').textContent = 'Demo running…';
        later(opening, 1400);
    });
    for (const name of ['normal','race']) $(name).addEventListener('click', () => {
        scenario = name;
        for (const id of ['normal','race']) { $(id).classList.toggle('active', id === name); $(id).setAttribute('aria-pressed', String(id === name)); }
        reset();
    });
    $('reset').addEventListener('click', reset);
    $('demo-refresh').addEventListener('change', reset);
    $('demo-book').addEventListener('change', reset);
})();
