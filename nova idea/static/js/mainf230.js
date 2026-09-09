document.addEventListener('DOMContentLoaded', function() {
    // Player Verification Elements (for Free Fire page)
    const verifyForm = document.getElementById('verify-player-form');
    const verifyButton = document.getElementById('verify-button');
    const verifySpinner = document.getElementById('verify-spinner');
    const playerIdInput = document.getElementById('player-id');
    const resultDiv = document.getElementById('verification-result');
    const errorDiv = document.getElementById('verification-error');
    const nicknameSpan = document.getElementById('player-nickname');
    const levelSpan = document.getElementById('player-level');
    const errorMessageSpan = document.getElementById('error-message');

    // Checkout Form Elements (shared across pages)
    const checkoutForm = document.getElementById('checkout-form');
    const playerIdHiddenInput = document.getElementById('player-id-input');

    // OTP Verification Elements
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const registerBtn = document.getElementById('registerBtn');
    const emailInput = document.getElementById('email');
    const otpSection = document.getElementById('otpSection');
    const otpStatus = document.getElementById('otpStatus');
    const otpInput = document.getElementById('otp');
    let isEmailVerified = false;

    // Cart Elements (shared across pages)
    const cartItemsDiv = document.getElementById('cart-items');
    const cartEmptyMessage = document.getElementById('cart-empty-message');
    const cartTotalSpan = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const fabCartCount = document.getElementById('fab-cart-count');

    // --- NEW: Currency Handling ---
    let currentCurrency = 'LKR'; // Default currency
    const currencyToggles = document.querySelectorAll('input[name="currency-toggle"]');
    const currencyInputHidden = document.getElementById('currency-input');

    // --- Cart Data (shared across pages) ---
    // Use a different session storage key for each game page to avoid cart conflicts
    let cartStorageKey = 'generic_cart'; // Default key
    if (window.location.pathname.includes('/freefire')) {
        cartStorageKey = 'ff_cart';
    } else if (window.location.pathname.includes('/pubgmobile')) {
        cartStorageKey = 'pubg_cart';
    } // Add more else if blocks for other games as needed
    let cart = JSON.parse(sessionStorage.getItem(cartStorageKey)) || [];

    // --- NEW: Function to update product prices based on selected currency ---
    function updateProductDisplayPrices(selectedCurrency) {
        document.querySelectorAll('.diamond-package-card').forEach(card => {
            const priceDisplay = card.querySelector('.product-price-display');
            const qtyInput = card.querySelector('.product-qty');
            if (priceDisplay && qtyInput) {
                const priceLKR = qtyInput.getAttribute('data-price-lkr');
                const priceUSDT = qtyInput.getAttribute('data-price-usdt');

                if (selectedCurrency === 'USDT') {
                    if (priceUSDT && priceUSDT !== "None" && priceUSDT.trim() !== "") {
                        priceDisplay.textContent = `${parseFloat(priceUSDT).toFixed(2)} USDT`;
                        card.closest('.col-6, .col-md-4, .col-lg-3').style.display = 'block';
                    } else {
                        card.closest('.col-6, .col-md-4, .col-lg-3').style.display = 'none';
                    }
                } else { // LKR
                    priceDisplay.textContent = `${parseFloat(priceLKR).toFixed(2)} LKR`;
                    card.closest('.col-6, .col-md-4, .col-lg-3').style.display = 'block';
                }
            }
        });
    }

    // Initialize the page
    function initializePage() {
        loadAndShowSplashBanner();

        // --- NEW: Conditionally run currency logic ---
        if (currencyToggles.length > 0) {
            updateProductDisplayPrices(currentCurrency);
        }

        // Restore cart quantities from session storage
        cart.forEach(item => {
            const input = document.querySelector(`.product-qty[data-id="${item.id}"]`);
            if (input) {
                input.value = item.quantity;
                updateMaxQuantityMessage(input);
            }
        });

        updateCartDisplay();
        updateFAB();
        setupQuantityControls();

        // Check session storage for email verification status on page load
        if (emailInput && otpSection && registerBtn) {
            const storedVerifiedEmail = sessionStorage.getItem('emailVerified');
            if (storedVerifiedEmail && storedVerifiedEmail === emailInput.value.trim()) {
                isEmailVerified = true;
                otpSection.style.display = 'block';
                otpStatus.textContent = 'Email previously verified in this session.';
                otpStatus.className = 'text-success';
                emailInput.readOnly = true;
                otpInput.readOnly = true;
                if (sendOtpBtn) sendOtpBtn.style.display = 'none';
                if (verifyOtpBtn) {
                    verifyOtpBtn.style.display = 'none';
                    verifyOtpBtn.textContent = '✔ Verified';
                    verifyOtpBtn.classList.remove('btn-primary');
                    verifyOtpBtn.classList.add('btn-success');
                }
                registerBtn.disabled = false;
                registerBtn.classList.remove('action-btn-highlight:disabled');
            } else {
                if(registerBtn) registerBtn.disabled = true;
            }
        }
    }

    // Verify Player Function (Free Fire Specific)
    async function verifyPlayer() {
        if (!playerIdInput) return; // Don't run on pages without this element
        const playerId = playerIdInput.value.trim();
        resultDiv.style.display = 'none';
        errorDiv.style.display = 'none';
        if (!playerId) { showError('Please enter a Player ID'); return; }
        if (!/^\d+$/.test(playerId)) { showError('Player ID must contain only numbers'); return; }

        verifyButton.disabled = true;
        verifySpinner.classList.remove('d-none');
        try {
            const response = await fetch('/verify_player', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                body: `player_id=${encodeURIComponent(playerId)}`
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Verification failed');
            if (data.success) {
                nicknameSpan.textContent = data.nickname;
                levelSpan.textContent = data.level || 'Unknown';
                resultDiv.style.display = 'block';
                if (playerIdHiddenInput) playerIdHiddenInput.value = data.player_id;
                document.getElementById('player-name').value = data.nickname;
                updateCheckoutButton();
            } else {
                showError(data.message || 'Player verification failed');
            }
        } catch (error) {
            console.error('Verification error:', error);
            showError(error.message || 'Network error. Please try again.');
        } finally {
            verifyButton.disabled = false;
            verifySpinner.classList.add('d-none');
        }
    }

    function showError(message) {
        if (errorMessageSpan) {
            errorMessageSpan.textContent = message;
            errorDiv.style.display = 'block';
        }
    }

    // Generic quantity and cart functions
    function setupQuantityControls() {
        document.querySelectorAll('.increase-qty, .decrease-qty').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                const input = document.querySelector(`.product-qty[data-id="${productId}"]`);
                let value = parseInt(input.value) || 0;
                let max = parseInt(input.getAttribute('max')) || 10;
                let min = parseInt(input.getAttribute('min')) || 0;
                if (this.classList.contains('increase-qty') && value < max) {
                    input.value = value + 1;
                } else if (this.classList.contains('decrease-qty') && value > min) {
                    input.value = value - 1;
                }
                validateQuantity(input);
            });
        });

        document.querySelectorAll('.product-qty').forEach(input => {
            input.addEventListener('change', function() { validateQuantity(this); });
            input.addEventListener('input', function() { if (parseInt(this.value) > parseInt(this.max)) this.value = this.max; });
        });
    }

    function validateQuantity(input) {
        let value = parseInt(input.value) || 0;
        let max = parseInt(input.getAttribute('max')) || 10;
        let min = parseInt(input.getAttribute('min')) || 0;
        value = Math.max(min, Math.min(value, max));
        input.value = value;
        const productId = input.getAttribute('data-id');
        updateCart(productId, value);
        updateMaxQuantityMessage(input);
    }

    function updateMaxQuantityMessage(input) {
        const messageContainer = input.closest('.diamond-package-card');
        if (messageContainer) {
            const message = messageContainer.querySelector('.max-quantity-message');
            if(message) {
                 message.style.display = (parseInt(input.value) >= parseInt(input.getAttribute('max'))) ? 'block' : 'none';
            }
        }
    }

    // --- MODIFIED: updateCart to handle currency AND fallback for non-currency pages ---
    function updateCart(productId, quantity) {
        quantity = parseInt(quantity) || 0;
        const productElement = document.querySelector(`.product-qty[data-id="${productId}"]`);
        if (!productElement) return;

        const productName = productElement.getAttribute('data-name');

        // Check for new currency-specific attributes, fallback to old data-price
        const priceLKR_attr = productElement.getAttribute('data-price-lkr');
        const priceUSDT_attr = productElement.getAttribute('data-price-usdt');
        const price_attr = productElement.getAttribute('data-price');

        let productPrice;
        let currencySymbol;

        if (currencyToggles.length > 0) { // We are on a page with currency selection
            const priceLKR = parseFloat(priceLKR_attr);
            const priceUSDT = parseFloat(priceUSDT_attr);
            productPrice = currentCurrency === 'USDT' && priceUSDT ? priceUSDT : priceLKR;
            currencySymbol = currentCurrency;
        } else { // We are on a page without currency selection (e.g., pubgmobile)
            productPrice = parseFloat(price_attr);
            currencySymbol = 'LKR'; // Assume LKR for these pages
        }

        const existingIndex = cart.findIndex(item => item.id === productId);
        if (quantity > 0) {
            const cartItem = { id: productId, name: productName, price: productPrice, quantity: quantity, currency: currencySymbol };
            if (existingIndex >= 0) cart[existingIndex] = cartItem; else cart.push(cartItem);
            const card = productElement.closest('.diamond-package-card');
            if (card) {
                card.classList.add('item-added');
                setTimeout(() => card.classList.remove('item-added'), 500);
            }
        } else {
            if (existingIndex >= 0) cart.splice(existingIndex, 1);
            productElement.value = 0;
        }

        sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
        updateCartDisplay();
        updateFAB();
        updateCheckoutButton();
    }

    // --- MODIFIED: updateCartDisplay to handle currency ---
    function updateCartDisplay() {
        if (!cartItemsDiv) return;

        const displayCurrency = cart.length > 0 ? cart[0].currency : currentCurrency;
        const cartCurrencySymbolSpan = document.getElementById('cart-currency-symbol');
        if (cartCurrencySymbolSpan) cartCurrencySymbolSpan.textContent = displayCurrency;

        if (cart.length === 0) {
            if(cartEmptyMessage) cartEmptyMessage.style.display = 'block';
            cartItemsDiv.innerHTML = '';
            if (checkoutBtn) checkoutBtn.disabled = true;
            if(cartTotalSpan) cartTotalSpan.textContent = `0 ${displayCurrency}`;
            return;
        }

        if(cartEmptyMessage) cartEmptyMessage.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = false;

        let html = '';
        let total = 0;
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 cart-item" data-id="${item.id}">
                    <div class="d-flex align-items-center">
                        <img src="https://i.postimg.cc/C1yNxbxD/Diams.png" alt="Item" width="30" class="me-2">
                        <div><h6 class="mb-0">${item.name}</h6><small class="text-muted">${item.quantity} × ${item.price.toFixed(2)} ${item.currency}</small></div>
                    </div>
                    <div class="text-end">
                        <span class="fw-bold">${itemTotal.toFixed(2)} ${item.currency}</span>
                        <button class="btn btn-sm btn-outline-danger ms-2 remove-item" data-id="${item.id}" style="padding: 0.1rem 0.3rem;"><i class="fas fa-times"></i></button>
                    </div>
                </div>`;
        });

        cartItemsDiv.innerHTML = html;
        if(cartTotalSpan) cartTotalSpan.textContent = `${total.toFixed(2)} ${displayCurrency}`;

        if (checkoutForm) {
            const cartForSubmission = cart.map(item => ({ id: item.id, quantity: item.quantity }));
            document.getElementById('cart-items-input').value = JSON.stringify(cartForSubmission);
            document.getElementById('total-amount-input').value = total.toFixed(2);
            if (currencyInputHidden) currencyInputHidden.value = displayCurrency;
        }

        document.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', function() {
                const productId = this.getAttribute('data-id');
                const input = document.querySelector(`.product-qty[data-id="${productId}"]`);
                if (input) {
                    const cartItem = this.closest('.cart-item');
                    cartItem.classList.add('removing');
                    setTimeout(() => {
                        input.value = 0;
                        updateCart(productId, 0);
                    }, 300);
                }
            });
        });
        updateCheckoutButton();
    }

    function updateFAB() {
        const totalItems = calculateTotalItems();
        if (fabCartCount) {
            fabCartCount.textContent = totalItems > 9 ? '9+' : totalItems;
            fabCartCount.style.display = totalItems > 0 ? 'flex' : 'none';
        }
    }

    function calculateTotalItems() {
        return cart.reduce((total, item) => total + item.quantity, 0);
    }

    function updateCheckoutButton() {
        if (!checkoutBtn) return;
        const hasItems = cart.length > 0;
        let isVerified = false;

        if (window.location.pathname.includes('/freefire')) {
             isVerified = resultDiv && resultDiv.style.display === 'block';
        } else {
            const otherPlayerIdField = document.getElementById('player-id-input');
            const whatsappField = document.getElementById('whatsapp');
            const hasPlayerId = otherPlayerIdField && otherPlayerIdField.value.trim() !== '';
            const hasWhatsApp = whatsappField && whatsappField.value.trim() !== '';
            isVerified = hasPlayerId && hasWhatsApp;
        }
        checkoutBtn.disabled = !(hasItems && isVerified);
    }

    function animateValue(id, start, end, duration, suffix = '') {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            if (id === 'success-rate') {
                const value = progress * (end - start) + start;
                obj.innerHTML = value.toFixed(2) + suffix;
            } else {
                const value = Math.floor(progress * (end - start) + start);
                obj.innerHTML = value + suffix;
            }
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function startCountdown(seconds) {
        if (!sendOtpBtn) return;
        sendOtpBtn.disabled = true;
        let counter = seconds;
        const interval = setInterval(() => {
            sendOtpBtn.textContent = `Resend in ${counter}s`;
            counter--;
            if (counter < 0) {
                clearInterval(interval);
                sendOtpBtn.textContent = 'Send Code';
                sendOtpBtn.disabled = false;
            }
        }, 1000);
    }

    function isValidEmail(email) {
        const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return re.test(String(email).toLowerCase());
    }

    function loadAndShowSplashBanner() {
        if (sessionStorage.getItem('splashBannerManuallyClosed')) return;
        fetch('/check_splash_banner')
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return response.json(); })
            .then(data => {
                if (data.show_banner) {
                    const modalElement = document.getElementById('splashBannerModal');
                    const bannerImageElement = document.getElementById('splashBannerImage');
                    const buttonContainer = document.getElementById('splashBannerButtonContainer');
                    const modalBody = modalElement ? modalElement.querySelector('.modal-body') : null;
                    if (!modalElement || !bannerImageElement || !buttonContainer || !modalBody) return;
                    let hasContentToShow = false;
                    if (data.image_url) {
                        bannerImageElement.src = data.image_url;
                        bannerImageElement.style.display = 'block';
                        hasContentToShow = true;
                    }
                    if (data.button && data.button.is_active) {
                        const btn = document.createElement('a');
                        btn.href = data.button.link; btn.textContent = data.button.text;
                        btn.className = `btn btn-lg btn-${data.button.style_class || 'primary'} shadow-sm`;
                        buttonContainer.innerHTML = ''; buttonContainer.appendChild(btn);
                        hasContentToShow = true;
                    }
                    if (hasContentToShow) {
                        const splashModal = new bootstrap.Modal(modalElement);
                        splashModal.show();
                        modalElement.addEventListener('hidden.bs.modal', () => {
                            sessionStorage.setItem('splashBannerManuallyClosed', 'true');
                        }, { once: true });
                    }
                }
            })
            .catch(error => console.error('Error fetching splash banner:', error));
    }

    // --- Event Listeners from your original code ---
    if (verifyForm) verifyForm.addEventListener('submit', (e) => { e.preventDefault(); });
    if (verifyButton) verifyButton.addEventListener('click', verifyPlayer);

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', function(e) {
            if (cart.length === 0) { e.preventDefault(); alert('Please add items to your cart before checkout'); return false; }
            if (window.location.pathname.includes('/freefire')) {
                const playerId = playerIdInput.value.trim();
                if (!playerId || !resultDiv.style.display || resultDiv.style.display === 'none') { e.preventDefault(); alert('Please verify your Free Fire Player ID first'); return false; }
                document.getElementById('player-id-input').value = playerId;
                document.getElementById('player-name').value = nicknameSpan.textContent || '';
            } else {
                const otherPlayerIdField = document.getElementById('player-id-input');
                const whatsappField = document.getElementById('whatsapp');
                if(!otherPlayerIdField || otherPlayerIdField.value.trim() === ''){
                     e.preventDefault(); alert('Please enter your Player ID.'); return false;
                }
                if(!whatsappField || whatsappField.value.trim() === ''){
                     e.preventDefault(); alert('Please enter your WhatsApp Number.'); return false;
                }
            }
            return true;
        });
    }

    // --- NEW: Conditional Event Listener for Currency Toggle ---
    if (currencyToggles.length > 0) {
        currencyToggles.forEach(toggle => {
            toggle.addEventListener('change', function() {
                if (this.checked) {
                    const newCurrency = this.value;
                    if (newCurrency !== currentCurrency && cart.length > 0) {
                        if (!confirm("Changing currency will clear your current cart. Are you sure?")) {
                            document.getElementById(`currency-${currentCurrency.toLowerCase()}`).checked = true;
                            return;
                        }
                        cart = [];
                        document.querySelectorAll('.product-qty').forEach(input => input.value = 0);
                        sessionStorage.setItem(cartStorageKey, JSON.stringify(cart));
                    }
                    currentCurrency = newCurrency;
                    if (currencyInputHidden) currencyInputHidden.value = currentCurrency;
                    updateProductDisplayPrices(currentCurrency);
                    updateCartDisplay();
                }
            });
        });
    }

    // --- OTP Event Listeners ---
    // NOTE: OTP functionality for register page is handled in register.html inline script
    // Only set up OTP listeners if NOT on register page (to avoid duplicate listeners)
    const isRegisterPage = window.location.pathname.includes('/register');
    
    if (!isRegisterPage && sendOtpBtn) {
        sendOtpBtn.addEventListener('click', function() {
            const email = emailInput.value.trim();
            if (isEmailVerified && sessionStorage.getItem('emailVerified') !== email) {
                isEmailVerified = false; sessionStorage.removeItem('emailVerified');
                if (registerBtn) registerBtn.disabled = true; emailInput.readOnly = false; otpInput.readOnly = false;
                if (verifyOtpBtn) { verifyOtpBtn.style.display = 'block'; verifyOtpBtn.textContent = 'Verify'; verifyOtpBtn.classList.replace('btn-success', 'btn-primary'); }
            }
            if (!isValidEmail(email)) { otpStatus.textContent = 'Please enter a valid email address'; otpStatus.className = 'text-danger'; return; }
            sendOtpBtn.disabled = true; sendOtpBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';
            fetch('/send_otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email }) })
            .then(response => response.json().then(data => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                sendOtpBtn.innerHTML = 'Resend Code';
                if (ok && data.success) {
                    otpSection.style.display = 'block'; otpInput.required = true;
                    otpStatus.textContent = 'Verification code sent to your email.'; otpStatus.className = 'text-success';
                    startCountdown(60);
                } else {
                    const isRateLimited = data.message && (data.message.includes("Too many requests") || data.message.includes("blocked") || data.message.includes("wait a minute"));
                    if (!isRateLimited) { sendOtpBtn.disabled = false; sendOtpBtn.textContent = 'Send Code'; }
                    throw new Error(data.message || 'Failed to send OTP');
                }
            }).catch(error => {
                otpStatus.textContent = error.message; otpStatus.className = 'text-danger';
                const isRateLimited = error.message && (error.message.includes("Too many requests") || error.message.includes("blocked") || error.message.includes("wait a minute"));
                if (!isRateLimited) { sendOtpBtn.disabled = false; sendOtpBtn.textContent = 'Send Code'; }
            });
        });
    }

    if (!isRegisterPage && verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', function() {
            const email = emailInput.value.trim(); const otp = otpInput.value.trim();
            if (!email || !otp) { alert('Please enter both email and code'); return; }
            verifyOtpBtn.disabled = true; verifyOtpBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verifying...';
            fetch('/verify_otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, otp: otp }) })
            .then(response => response.json().then(data => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (ok && data.success) {
                    isEmailVerified = true; otpStatus.textContent = 'Email verified!'; otpStatus.className = 'text-success';
                    if (registerBtn) registerBtn.disabled = false;
                    sessionStorage.setItem('emailVerified', email);
                    verifyOtpBtn.disabled = true; verifyOtpBtn.textContent = '✔ Verified'; verifyOtpBtn.classList.replace('btn-primary', 'btn-success');
                    emailInput.readOnly = true; otpInput.readOnly = true;
                    if (sendOtpBtn) sendOtpBtn.style.display = 'none';
                    if (verifyOtpBtn) verifyOtpBtn.style.display = 'none';
                } else {
                    isEmailVerified = false; sessionStorage.removeItem('emailVerified');
                    throw new Error(data.message || 'Verification failed');
                }
            }).catch(error => {
                verifyOtpBtn.disabled = false; verifyOtpBtn.textContent = 'Verify';
                otpStatus.textContent = error.message; otpStatus.className = 'text-danger';
            });
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateValue('happy-customers', 0, 10000, 2000, '+');
                animateValue('success-rate', 0, 99.99, 2000, '%');
                animateValue('daily-topup', 0, 1000, 2000, '+');
                animateValue('average-delivery', 0, 2, 2000, 'sec');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsSection = document.querySelector('.gradient-bg');
    if (statsSection) {
        observer.observe(statsSection);
    }

    // Event listener for non-Free Fire pages checkout button logic
    const otherPlayerIdField = document.getElementById('player-id-input');
    const whatsappField = document.getElementById('whatsapp');
    if (otherPlayerIdField && whatsappField && !window.location.pathname.includes('/freefire')) {
        otherPlayerIdField.addEventListener('input', updateCheckoutButton);
        whatsappField.addEventListener('input', updateCheckoutButton);
    }

    window.addEventListener('beforeunload', function() {
        sessionStorage.removeItem(cartStorageKey);
    });

    // Final Setup
    initializePage();
});