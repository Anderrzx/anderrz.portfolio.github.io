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
