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
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
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

// ===== Forms (Contact, Web Design review): check fields and send =====
// Any <form class="site-form"> gets this. Each required field needs an error
// message with the id "<field id>-error", and the form needs a .form-status.
function setupForm(form) {
    const formStatus = form.querySelector('.form-status');
    const submitButton = form.querySelector('button[type="submit"]');
    const requiredFields = form.querySelectorAll('[required]');

    // Pre-select the topic from a link like /contact/?topic=Free%20website%20review
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

        if (form.dataset.connected !== 'true') {
            showStatus('This form isn’t connected yet, so nothing was sent.', 'error');
            return;
        }

        submitButton.disabled = true;
        showStatus('Sending…', 'info');

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) throw new Error(`Form service replied ${response.status}`);

            form.reset();
            showStatus(form.dataset.success || 'Thanks! Your message has been sent. I’ll get back to you soon.', 'success');
        } catch (error) {
            showStatus('Your message wasn’t sent. Please try again in a moment.', 'error');
        } finally {
            submitButton.disabled = false;
        }
    });
}

document.querySelectorAll('form.site-form').forEach(setupForm);
