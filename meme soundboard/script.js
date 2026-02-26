document.addEventListener('DOMContentLoaded', () => {
    const soundboard = document.getElementById('soundboard');
    const buttons = document.querySelectorAll('.dome-btn');
    const searchInput = document.getElementById('search-input');
    const soundItems = document.querySelectorAll('.sound-item');
    const noResults = document.getElementById('no-results');
    const currentlyPlaying = new Map();

    // ── State ─────────────────────────────────────────────────────
    let activeCategory = 'all';
    let justAddedMode = false;

    // ── Play Sound on Click ───────────────────────────────────────
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const soundId = button.getAttribute('data-sound');
            const audio = document.getElementById(soundId);
            if (!audio) return;

            audio.currentTime = 0;
            audio.play().then(() => {
                button.classList.add('playing');
                if (currentlyPlaying.has(soundId)) {
                    clearTimeout(currentlyPlaying.get(soundId));
                }
                let duration = audio.duration * 1000;
                if (!duration || !isFinite(duration)) duration = 1500;
                const timeoutId = setTimeout(() => {
                    button.classList.remove('playing');
                    currentlyPlaying.delete(soundId);
                }, Math.min(duration, 5000));
                currentlyPlaying.set(soundId, timeoutId);
            }).catch(err => {
                console.warn(`Playback failed: ${soundId}`, err);
            });

            button.classList.add('pressed');
            setTimeout(() => button.classList.remove('pressed'), 120);
        });
    });

    // ── Filter Engine ─────────────────────────────────────────────
    function applyFilters() {
        const query = searchInput.value.trim().toLowerCase();
        let visibleCount = 0;

        soundItems.forEach(item => {
            const label = item.querySelector('.sound-label').textContent.toLowerCase();
            const category = item.getAttribute('data-category');

            const matchesSearch = label.includes(query);
            const matchesCategory = activeCategory === 'all' || category === activeCategory;

            const show = matchesSearch && matchesCategory;
            item.style.display = show ? 'flex' : 'none';
            if (show) visibleCount++;
        });

        noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        updateFilterBar();
    }

    // ── Search ────────────────────────────────────────────────────
    searchInput.addEventListener('input', applyFilters);

    // ── Filter Bar ────────────────────────────────────────────────
    const filterBar = document.getElementById('filter-bar');
    const filterLabel = document.getElementById('filter-label');
    const clearFilter = document.getElementById('clear-filter');

    function updateFilterBar() {
        if (activeCategory !== 'all' || justAddedMode) {
            filterBar.style.display = 'flex';
            if (justAddedMode) {
                filterLabel.textContent = '🕐 Showing: Just Added (newest first)';
            } else {
                const names = {
                    classic: '🔊 Classic Memes',
                    gaming: '🎮 Gaming',
                    anime: '🎌 Anime',
                    comedy: '😂 Comedy',
                    music: '🎵 Music & SFX'
                };
                filterLabel.textContent = `Showing: ${names[activeCategory] || activeCategory}`;
            }
        } else {
            filterBar.style.display = 'none';
        }
    }

    clearFilter.addEventListener('click', () => {
        activeCategory = 'all';
        justAddedMode = false;
        // Restore original order
        restoreOriginalOrder();
        applyFilters();
    });

    // ── HOME ──────────────────────────────────────────────────────
    function goHome() {
        activeCategory = 'all';
        justAddedMode = false;
        searchInput.value = '';
        restoreOriginalOrder();
        applyFilters();
        closeMobileMenu();
        closeAllDropdowns();
    }

    document.getElementById('nav-home').addEventListener('click', e => { e.preventDefault(); goHome(); });
    document.getElementById('nav-home-logo').addEventListener('click', goHome);

    // ── JUST ADDED ────────────────────────────────────────────────
    let originalOrder = [];
    soundItems.forEach(item => originalOrder.push(item));

    function restoreOriginalOrder() {
        originalOrder.forEach(item => soundboard.appendChild(item));
    }

    document.getElementById('nav-just-added').addEventListener('click', e => {
        e.preventDefault();
        justAddedMode = true;
        activeCategory = 'all';
        searchInput.value = '';

        // Sort by data-added descending (newest first)
        const sorted = [...soundItems].sort((a, b) => {
            return parseInt(b.getAttribute('data-added')) - parseInt(a.getAttribute('data-added'));
        });
        sorted.forEach(item => soundboard.appendChild(item));
        applyFilters();
        closeMobileMenu();
    });

    // ── CATEGORIES DROPDOWN ───────────────────────────────────────
    const categoriesDropdown = document.getElementById('categories-dropdown');
    const dropdownMenu = document.getElementById('dropdown-menu');

    document.getElementById('nav-categories').addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        categoriesDropdown.classList.toggle('open');
    });

    // Category item clicks
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            activeCategory = item.getAttribute('data-category');
            justAddedMode = false;
            restoreOriginalOrder();
            applyFilters();
            categoriesDropdown.classList.remove('open');
            closeMobileMenu();
        });
    });

    // Close dropdown on outside click
    document.addEventListener('click', e => {
        if (!categoriesDropdown.contains(e.target)) {
            categoriesDropdown.classList.remove('open');
        }
        // Close modals on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    function closeAllDropdowns() {
        categoriesDropdown.classList.remove('open');
    }

    // ── UPLOAD MODAL ──────────────────────────────────────────────
    const uploadModal = document.getElementById('upload-modal');
    const fileDrop = document.getElementById('file-drop');
    const fileInput = document.getElementById('upload-file');
    const fileName = document.getElementById('file-name');

    document.getElementById('nav-upload').addEventListener('click', e => {
        e.preventDefault();
        uploadModal.classList.add('active');
        closeMobileMenu();
    });

    // File drop zone
    fileDrop.addEventListener('click', () => fileInput.click());
    fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('dragover'); });
    fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
    fileDrop.addEventListener('drop', e => {
        e.preventDefault();
        fileDrop.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileName.textContent = e.dataTransfer.files[0].name;
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            fileName.textContent = fileInput.files[0].name;
        }
    });

    // Upload submit
    document.getElementById('upload-submit').addEventListener('click', () => {
        const name = document.getElementById('upload-name').value.trim();
        const category = document.getElementById('upload-category').value;
        const file = fileInput.files[0];

        if (!name) { alert('Please enter a sound name.'); return; }
        if (!file) { alert('Please select an audio file.'); return; }

        // Create a new sound item dynamically
        const newIndex = soundItems.length + 1;
        const colors = ['red', 'green', 'orange', 'yellow', 'pink', 'brown', 'blue', 'black'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const audioUrl = URL.createObjectURL(file);
        const soundId = 'custom-' + Date.now();

        // Create audio element
        const audioEl = document.createElement('audio');
        audioEl.id = soundId;
        audioEl.src = audioUrl;
        document.body.appendChild(audioEl);

        // Create sound item
        const itemDiv = document.createElement('div');
        itemDiv.className = 'sound-item';
        itemDiv.setAttribute('data-category', category);
        itemDiv.setAttribute('data-added', newIndex);
        itemDiv.innerHTML = `
            <button class="dome-btn ${randomColor}" data-sound="${soundId}"></button>
            <span class="sound-label">${name.toUpperCase()}</span>
        `;
        soundboard.appendChild(itemDiv);

        // Attach click handler to new button
        const newBtn = itemDiv.querySelector('.dome-btn');
        newBtn.addEventListener('click', () => {
            const audio = document.getElementById(soundId);
            if (!audio) return;
            audio.currentTime = 0;
            audio.play().then(() => {
                newBtn.classList.add('playing');
                const dur = Math.min((audio.duration || 1.5) * 1000, 5000);
                setTimeout(() => newBtn.classList.remove('playing'), dur);
            }).catch(() => { });
            newBtn.classList.add('pressed');
            setTimeout(() => newBtn.classList.remove('pressed'), 120);
        });

        // Reset form
        document.getElementById('upload-name').value = '';
        fileInput.value = '';
        fileName.textContent = '';
        uploadModal.classList.remove('active');

        // Flash success
        showToastMessage('✅ Sound "' + name + '" uploaded successfully!');
    });

    // ── LOGIN MODAL ───────────────────────────────────────────────
    const loginModal = document.getElementById('login-modal');

    document.getElementById('nav-login').addEventListener('click', e => {
        e.preventDefault();
        loginModal.classList.add('active');
        closeMobileMenu();
    });

    document.getElementById('login-submit').addEventListener('click', () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) { alert('Please fill in all fields.'); return; }

        // Simulate login
        loginModal.classList.remove('active');
        const loginLink = document.getElementById('nav-login');
        loginLink.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${email.split('@')[0]}`;
        showToastMessage('👋 Welcome back, ' + email.split('@')[0] + '!');
    });

    document.getElementById('switch-to-signup').addEventListener('click', e => {
        e.preventDefault();
        const header = loginModal.querySelector('h2');
        const btn = document.getElementById('login-submit');
        const footerText = loginModal.querySelector('.modal-footer-text');
        if (header.textContent === 'Login') {
            header.textContent = 'Sign Up';
            btn.textContent = 'Create Account';
            footerText.innerHTML = 'Already have an account? <a href="#" id="switch-to-signup">Login</a>';
        } else {
            header.textContent = 'Login';
            btn.textContent = 'Sign In';
            footerText.innerHTML = 'Don\'t have an account? <a href="#" id="switch-to-signup">Sign up</a>';
        }
    });

    // ── INSTALL APP ───────────────────────────────────────────────
    const installToast = document.getElementById('install-toast');

    document.getElementById('nav-install').addEventListener('click', e => {
        e.preventDefault();
        installToast.classList.add('visible');
        closeMobileMenu();
    });

    document.getElementById('toast-close').addEventListener('click', () => {
        installToast.classList.remove('visible');
    });

    document.getElementById('toast-install').addEventListener('click', () => {
        // Try real PWA install prompt if available
        if (window.deferredPrompt) {
            window.deferredPrompt.prompt();
            window.deferredPrompt.userChoice.then(() => {
                installToast.classList.remove('visible');
            });
        } else {
            // Simulated / fallback
            installToast.classList.remove('visible');
            showToastMessage('📲 Bookmark this page or use your browser\'s "Add to Home Screen" option!');
        }
    });

    // Capture beforeinstallprompt
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        window.deferredPrompt = e;
    });

    // ── CLOSE MODALS ──────────────────────────────────────────────
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-close');
            document.getElementById(modalId).classList.remove('active');
        });
    });

    // ── MOBILE HAMBURGER ──────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobile-menu');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
    });

    function closeMobileMenu() {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
    }

    // Mobile menu links
    document.querySelectorAll('.mobile-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const action = link.getAttribute('data-action');
            switch (action) {
                case 'home': goHome(); break;
                case 'just-added': document.getElementById('nav-just-added').click(); break;
                case 'categories':
                    closeMobileMenu();
                    categoriesDropdown.classList.toggle('open');
                    break;
                case 'upload': document.getElementById('nav-upload').click(); break;
                case 'login': document.getElementById('nav-login').click(); break;
                case 'install': document.getElementById('nav-install').click(); break;
            }
        });
    });

    // ── TOAST UTILITY ─────────────────────────────────────────────
    function showToastMessage(msg) {
        const t = document.createElement('div');
        t.className = 'toast-msg';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(() => t.classList.add('visible'));
        setTimeout(() => {
            t.classList.remove('visible');
            setTimeout(() => t.remove(), 300);
        }, 3000);
    }
});
