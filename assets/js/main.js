// ===== Start every page at the top =====
// Browsers sometimes restore an old scroll position when a page opens.
// Links that point to a section (e.g. /web-design/#is-it-time) still go there.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// Some viewers drop the #section part of a link, so a clicked link also
// remembers its section for the next page (sessionStorage, if available).
const STORED_SECTION = 'anderrz-scroll-to';

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname || !url.hash) return;
    try { sessionStorage.setItem(STORED_SECTION, url.hash.slice(1)); } catch (error) { /* storage blocked */ }
});

function takeStoredSection() {
    try {
        const id = sessionStorage.getItem(STORED_SECTION);
        sessionStorage.removeItem(STORED_SECTION);
        return id;
    } catch (error) {
        return null;
    }
}

const storedSection = takeStoredSection();
const sectionId = window.location.hash
    ? decodeURIComponent(window.location.hash.slice(1))
    : storedSection;
const linkedSection = sectionId ? document.getElementById(sectionId) : null;

if (linkedSection) {
    // Jump straight to the linked section once the page has laid out.
    // data-align="center" puts it in the middle of the screen instead of at the top;
    // data-keep-visible="<id>" then makes sure that element isn't hidden under the header.
    window.addEventListener('load', () => {
        const block = linkedSection.dataset.align === 'center' ? 'center' : 'start';
        linkedSection.scrollIntoView({ behavior: 'instant', block });

        const keep = document.getElementById(linkedSection.dataset.keepVisible || '');
        if (keep) {
            const headerHeight = document.querySelector('.site-header').offsetHeight;
            const gap = keep.getBoundingClientRect().top - headerHeight - 56;
            if (gap < 0) window.scrollBy({ top: gap, behavior: 'instant' });
        }
    });
} else {
    // Start at the top. scrollIntoView also moves any page this one is shown
    // inside (like the preview link's frame), so it doesn't keep the old spot.
    const toTop = () => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollIntoView({ block: 'start', behavior: 'instant' });
    };
    toTop();
    window.addEventListener('load', toTop);
}

// ===== Mobile menu =====
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');

function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
}

toggle.addEventListener('click', () => {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
});

// Close the menu after a link is tapped, or when Escape is pressed
nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        toggle.focus();
    }
});

// ===== Header border appears after scrolling =====
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Fade-up animations as sections scroll into view =====
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
    // Fade in when an element scrolls into view, and back out when it leaves,
    // so the effect also plays when scrolling back up
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, { rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach((item) => observer.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
}

// ===== Work page: filter projects by discipline =====
const filterBar = document.querySelector('.filter-bar');

if (filterBar) {
    const buttons = filterBar.querySelectorAll('.filter-button');
    const cards = document.querySelectorAll('#project-grid .project-card');
    const emptyMessage = document.getElementById('filter-empty');
    const status = document.getElementById('filter-status');

    function applyFilter(filter) {
        let shown = 0;

        cards.forEach((card) => {
            const match = filter === 'all' || card.dataset.category === filter;
            card.hidden = !match;
            if (match) {
                card.classList.add('is-visible');
                shown++;
            }
        });

        buttons.forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.filter === filter));
        });

        emptyMessage.hidden = shown > 0;
        status.textContent = `Showing ${shown} ${shown === 1 ? 'project' : 'projects'}`;
    }

    filterBar.addEventListener('click', (event) => {
        const button = event.target.closest('.filter-button');
        if (button) applyFilter(button.dataset.filter);
    });

    filterBar.hidden = false;
}

// ===== About page video: music on =====
// Browsers don't allow sound before the visitor has interacted with the page,
// so the video starts silent; the music comes on at the first tap, click or
// key press (or right away if the browser allows it). The button switches it.
const aboutVideo = document.querySelector('.about-video-bg');
const soundButton = document.querySelector('.about-sound');

if (aboutVideo && soundButton) {
    let userMuted = false;

    const showSound = () => {
        soundButton.setAttribute('aria-pressed', String(!aboutVideo.muted));
        soundButton.textContent = aboutVideo.muted ? 'Sound on' : 'Sound off';
    };

    const turnSoundOn = () => {
        aboutVideo.muted = false;
        aboutVideo.play().catch(() => {
            // Not allowed yet: stay silent until the visitor interacts
            aboutVideo.muted = true;
            aboutVideo.play().catch(() => {});
        }).finally(showSound);
    };

    soundButton.addEventListener('click', (event) => {
        event.stopPropagation();
        userMuted = !aboutVideo.muted;
        if (userMuted) {
            aboutVideo.muted = true;
            showSound();
        } else {
            turnSoundOn();
        }
    });

    // First interaction anywhere on the page turns the music on
    // (the Sound button handles its own clicks)
    const interactions = ['pointerdown', 'keydown'];
    const onFirstInteraction = (event) => {
        if (event.target.closest && event.target.closest('.about-sound')) return;
        interactions.forEach((type) => document.removeEventListener(type, onFirstInteraction));
        if (!userMuted && aboutVideo.muted) turnSoundOn();
    };
    interactions.forEach((type) => document.addEventListener(type, onFirstInteraction));

    turnSoundOn();
}

// ===== Background videos (Home and Work) =====
// People who prefer less motion see a still frame instead of the loop
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.work-video-bg, .hero-video-bg').forEach((video) => {
        video.removeAttribute('autoplay');
        video.pause();
    });
}

// ===== Forms (Contact, Web Design review): check fields and send =====
// Any <form class="site-form"> gets this. Each required field needs an error
// message with the id "<field id>-error", and the form needs a .form-status.
// ===== Contact: the "dap" after a message is sent =====
// 1. The page scrolls so the spot where the hands will meet is in the middle of the screen
// 2. They dap; when their hands meet, the form fades away
// 3. Right where the hands meet, a circle draws itself and "Sent!" slides in
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function playSentAnimation(form, message) {
    const backdrop = document.querySelector('.contact-backdrop');
    const seal = document.querySelector('.dap-seal');
    const wrap = form.parentElement;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Where "Sent!" will appear, so the page can center on it
    seal.style.visibility = 'hidden';
    seal.hidden = false;
    const sealBox = seal.getBoundingClientRect();
    seal.hidden = true;
    seal.style.visibility = '';
    const centerOnSeal = Math.max(0, window.scrollY + sealBox.top + sealBox.height / 2 - window.innerHeight / 2);

    if (!calm && Math.abs(window.scrollY - centerOnSeal) > 40) {
        window.scrollTo({ top: centerOnSeal, behavior: 'smooth' });
        await wait(700);
    }
    // Some browsers skip smooth scrolling; make sure we got there
    window.scrollTo({ top: centerOnSeal, behavior: 'instant' });

    if (!calm) {
        backdrop.classList.add('is-dapping');
        await wait(870); // the moment the hands meet
    }

    seal.hidden = false;
    backdrop.parentElement.classList.add('is-sealed'); // phones fade the text under the circle
    document.getElementById('sent-status').textContent = message;

    // The form fades away, then its space closes up
    wrap.classList.remove('reveal');
    if (!calm) {
        wrap.style.height = `${wrap.offsetHeight}px`;
        form.classList.add('is-leaving');
        await wait(450);
    }
    form.hidden = true;
    wrap.style.height = '0px';
}

function setupForm(form) {
    const formStatus = form.querySelector('.form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const requiredFields = form.querySelectorAll('[required]');

    // Pre-select the topic from a link like /contact/?topic=Free%20Website%20Review
    const topic = new URLSearchParams(window.location.search).get('topic');
    if (topic && form.topic && form.topic.options) {
        const option = [...form.topic.options].find((o) => o.value === topic);
        if (option) option.selected = true;
    }

    function showStatus(message, kind) {
        formStatus.textContent = message;
        formStatus.dataset.kind = kind;
    }

    function checkField(field) {
        const error = document.getElementById(`${field.id}-error`);
        const valid = field.value.trim() !== '' && field.checkValidity();
        field.setAttribute('aria-invalid', String(!valid));
        if (valid) {
            field.removeAttribute('aria-describedby');
        } else {
            field.setAttribute('aria-describedby', error.id);
        }
        error.hidden = valid;
        return valid;
    }

    // Re-check a field as the visitor fixes it
    requiredFields.forEach((field) => {
        field.addEventListener('input', () => {
            if (field.getAttribute('aria-invalid') === 'true') checkField(field);
        });
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const firstInvalid = [...requiredFields].filter((field) => !checkField(field))[0];
        if (firstInvalid) {
            firstInvalid.focus();
            showStatus('Please check the highlighted fields.', 'error');
            return;
        }

        // "demo" plays the sent animation without sending anything (used by the preview link)
        const isDemo = form.dataset.connected === 'demo';

        if (form.dataset.connected !== 'true' && !isDemo) {
            showStatus('This form isn’t connected yet, so nothing was sent.', 'error');
            return;
        }

        submitButton.disabled = true;
        showStatus('Sending…', 'info');

        try {
            if (!isDemo) {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) throw new Error(`Form service replied ${response.status}`);
            }

            form.reset();
            const successMessage = form.dataset.success || 'Thanks! Your message has been sent. I’ll get back to you soon.';

            if (form.id === 'contact-form' && document.querySelector('.contact-backdrop')) {
                showStatus('', 'info');
                playSentAnimation(form, successMessage);
                return;
            }

            showStatus(successMessage, 'success');
        } catch (error) {
            showStatus('Your message wasn’t sent. Please try again in a moment.', 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
}

document.querySelectorAll('form.site-form').forEach(setupForm);

// ===== Page change: focus pull =====
// Clicking a link to another page: the page drifts gently out of focus, then
// the next page opens a little soft and the focus turns past the sharp spot,
// just slightly, before easing back to lock in, like adjusting a focus ring
// by hand. A focus scale slides along the bottom: left to right going forward
// in the menu (Home, Work, About, Contact), right to left going back.
// Pages start loading as soon as a link is hovered or touched, so the switch
// itself doesn't have to wait.
const FOCUS_KEY = 'anderrz-focus';
const PAGE_ORDER = ['/', '/work/', '/about/', '/contact/', '/web-design/'];
const focusCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// The header stays sharp and still; only the page content changes focus
const focusTargets = [document.querySelector('main'), document.querySelector('.site-footer')].filter(Boolean);
// Browsers that hold the old page and fade to the new one (Chrome, Edge,
// Safari) don't need the fallback fade-in below
const smoothPageSwap = 'onpagereveal' in window;

// Gentle on the eyes: a light blur and almost no brightness or size change
const SOFT = 'blur(7px) brightness(1.04)';
const SHARP = 'blur(0px) brightness(1)';

function pageIndex(path) {
    const clean = path.endsWith('/') ? path : `${path}/`;
    const index = PAGE_ORDER.indexOf(clean);
    return index === -1 ? PAGE_ORDER.length : index;
}

// A link to another page on this site (not a new tab, download or same page)
function otherPageLink(target) {
    const link = target.closest && target.closest('a[href]');
    if (!link || link.target || link.hasAttribute('download')) return null;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return null;
    return url;
}

// Start loading the next page early, the moment a link is hovered or touched
const prefetched = new Set();
function prefetch(event) {
    const url = otherPageLink(event.target);
    if (!url || prefetched.has(url.pathname)) return;
    prefetched.add(url.pathname);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.pathname;
    document.head.append(hint);
}
['pointerover', 'touchstart', 'focusin'].forEach((type) => {
    document.addEventListener(type, prefetch, { passive: true });
});

// The focus scale: 0.3 m on the left, infinity on the right
function makeFocusScale(dir) {
    const scale = document.createElement('div');
    scale.className = 'focus-scale';
    scale.setAttribute('aria-hidden', 'true');
    scale.innerHTML = '<div class="focus-scale-ticks"></div>'
        + '<div class="focus-scale-labels"><span>0.3</span><span>0.5</span><span>1</span><span>3</span><span>&infin; m</span></div>'
        + '<div class="focus-scale-pointer"></div>';
    document.body.append(scale);
    // Positions are written for going forward and mirrored for going back
    const at = (pct) => `${dir === 1 ? pct : 100 - pct}%`;
    return { scale, pointer: scale.querySelector('.focus-scale-pointer'), at };
}

function clearFocusPull() {
    focusTargets.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
    document.querySelectorAll('.focus-scale').forEach((el) => el.remove());
    document.documentElement.classList.remove('focus-in');
}

// Leaving: a quick, light defocus, then go
let focusLeaving = false;

document.addEventListener('click', (event) => {
    if (focusCalm || focusLeaving || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const url = otherPageLink(event.target);
    if (!url) return;

    try {
        event.preventDefault();
        const dir = pageIndex(url.pathname) >= pageIndex(window.location.pathname) ? 1 : -1;
        sessionStorage.setItem(FOCUS_KEY, String(dir));
        focusLeaving = true;

        const ease = 'cubic-bezier(0.4, 0, 0.6, 1)';
        const { scale, pointer, at } = makeFocusScale(dir);
        scale.animate([{ opacity: 0 }, { opacity: 0.9 }], { duration: 160, fill: 'forwards' });
        pointer.animate([{ left: at(8) }, { left: at(26) }], { duration: 260, easing: ease, fill: 'forwards' });
        const out = focusTargets.map((el) => el.animate(
            [{ filter: SHARP }, { filter: SOFT }],
            { duration: 260, easing: ease, fill: 'forwards' },
        ).finished);

        // Go when the defocus ends, or after a short safety timer if the
        // browser pauses animations (e.g. a background tab)
        const go = () => { window.location.href = url.href; };
        Promise.race([Promise.all(out), wait(320)]).then(go, go);
    } catch (error) {
        // Storage blocked or animations unsupported: just go
        window.location.href = url.href;
    }
});

// Arriving: rotate the focus ring like a hand would. The blur follows the
// ring: the page gets sharper as the ring turns toward the right spot, is
// perfectly sharp the moment it passes it, goes slightly soft as the hand
// turns a little too far, then sharpens again as it eases back and stops.
let arrivingDir = null;
try {
    arrivingDir = sessionStorage.getItem(FOCUS_KEY);
    sessionStorage.removeItem(FOCUS_KEY);
} catch (error) { /* storage blocked */ }

if (arrivingDir && document.documentElement.classList.contains('focus-in')) {
    const dir = arrivingDir === '-1' ? -1 : 1;
    const { scale, pointer, at } = makeFocusScale(dir);
    scale.style.opacity = '0.9';

    // Ring position over time (50 = in focus): one turn past focus, then back
    const START = 26;
    const OVERSHOOT = 59;
    const TURN_MS = 620;  // turning toward focus and a little past it
    const BACK_MS = 560;  // the small correction back, slower and careful
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function ringAt(ms) {
        if (ms < TURN_MS) return START + (OVERSHOOT - START) * easeOut(ms / TURN_MS);
        const t = Math.min(1, (ms - TURN_MS) / BACK_MS);
        return OVERSHOOT + (50 - OVERSHOOT) * easeInOut(t);
    }

    // Blur grows with distance from the focus point (7px at the start)
    const blurFor = (pos) => Math.abs(pos - 50) * (7 / (50 - START));

    function show(pos) {
        const blur = blurFor(pos).toFixed(2);
        const bright = (1 + blurFor(pos) * 0.006).toFixed(3);
        focusTargets.forEach((el) => { el.style.filter = `blur(${blur}px) brightness(${bright})`; });
        pointer.style.left = at(pos);
    }

    let finished = false;
    function finish() {
        if (finished) return;
        finished = true;
        focusTargets.forEach((el) => { el.style.filter = ''; el.style.opacity = ''; });
        const fadeOut = scale.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: 220, delay: 60, fill: 'forwards' });
        Promise.race([fadeOut.finished, wait(400)]).then(clearFocusPull, clearFocusPull);
    }

    show(START);
    // Browsers without the page-to-page fade: start hidden and fade in
    if (!smoothPageSwap) focusTargets.forEach((el) => { el.style.opacity = '0'; });
    // The inline blur now holds the page soft, so the starting class can go
    document.documentElement.classList.remove('focus-in');

    function run() {
        const t0 = performance.now();
        function frame(now) {
            const ms = now - t0;
            show(ringAt(ms));
            if (!smoothPageSwap) {
                const fade = Math.min(1, ms / 260).toFixed(3);
                focusTargets.forEach((el) => { el.style.opacity = fade; });
            }
            if (ms < TURN_MS + BACK_MS) requestAnimationFrame(frame);
            else finish();
        }
        requestAnimationFrame(frame);
    }

    // Start turning once the fonts are ready (at most a quarter second), so
    // the text doesn't change shape partway through
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, wait(250)]).then(run, run);

    // Safety timer: the page always ends up sharp, even if the browser
    // pauses animation frames (e.g. a background tab)
    wait(250 + TURN_MS + BACK_MS + 300).then(finish);
} else {
    document.documentElement.classList.remove('focus-in');
}

// Coming back with the browser's Back button can restore a page mid-blur
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        focusLeaving = false;
        clearFocusPull();
    }
});
