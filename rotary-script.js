// ============================================================
//  DATABASE SETUP
// ============================================================
const db = new Dexie("RotaryDB");
db.version(1).stores({
    members:    'email, name, phone, password, buddyGroup',
    guests:     '++id, email, name, phone, category, club, inviter',
    attendance: '++id, email, name, date, dateISO, type, buddyGroup',
    makeups:    '++id, user, club, date, loggedAt'
});

// ============================================================
//  FIREBASE FIRESTORE CONFIG
// ============================================================
let firestore = null;

const initFirebase = () => {
    if (typeof firebase !== 'undefined' && !firestore) {
        try {
            const firebaseConfig = {
                apiKey: "AIzaSyBnXq8m2qFKYX8lZ9VJq6t5r7s3t2u1v0",
                authDomain: "rotary-registration-6261e.firebaseapp.com",
                projectId: "rotary-registration-6261e",
                storageBucket: "rotary-registration-6261e.appspot.com",
                messagingSenderId: "123456789012",
                appId: "1:123456789012:web:abc123def456ghi789"
            };
            firebase.initializeApp(firebaseConfig);
            firestore = firebase.firestore();
            console.log('Firebase Firestore initialized');
        } catch (e) {
            console.error('Firebase init error:', e);
        }
    }
};

// ============================================================
//  FIREBASE HELPER FUNCTIONS (optional - doesn't block if fails)
// ============================================================
const saveGuestToFirestore = async (guest) => {
    if (!firestore) {
        console.log('Firestore not available, skipping cloud save');
        return;
    }
    try {
        await firestore.collection('guests').add({
            ...guest,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Guest saved to Firestore');
    } catch (error) {
        console.error('Error saving to Firestore:', error);
    }
};

const saveAttendanceToFirestore = async (attendance) => {
    if (!firestore) return;
    try {
        await firestore.collection('attendance').add({
            ...attendance,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Attendance saved to Firestore');
    } catch (error) {
        console.error('Error saving attendance to Firestore:', error);
    }
};

const saveMemberToFirestore = async (member) => {
    try {
        await firestore.collection('members').doc(member.email).set({
            ...member,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Member saved to Firestore');
    } catch (error) {
        console.error('Error saving member to Firestore:', error);
    }
};

const saveMakeupToFirestore = async (makeup) => {
    try {
        await firestore.collection('makeups').add({
            ...makeup,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Makeup saved to Firestore');
    } catch (error) {
        console.error('Error saving makeup to Firestore:', error);
    }
};

// ============================================================
//  SECURITY NOTE
//  The admin passcode is stored client-side and is therefore
//  visible to anyone with browser DevTools access.
//  For production, replace with a proper server-side auth
//  mechanism (e.g. Firebase Authentication).
// ============================================================
const ADMIN_PASSCODE = 'RotaryAdmin2024';

// ============================================================
//  HELPERS
// ============================================================

/** Escape user data before injecting into innerHTML (XSS guard). */
const escapeHTML = (str) => {
    if (str == null) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
};

/**
 * Return today's date as YYYY-MM-DD in the user's local timezone.
 * Used for consistent duplicate attendance checks across all locales.
 */
const todayISO = () => {
    const d  = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
};

// ============================================================
//  TOAST NOTIFICATIONS  (replaces all browser alert() calls)
// ============================================================
const TOAST_ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

const dismissToast = (toast) => {
    if (!toast || !toast.parentElement) return;
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 450);
};

const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</div>
        <p class="toast-msg">${escapeHTML(message)}</p>
        <button class="toast-close" aria-label="Dismiss">&#10005;</button>
        <div class="toast-progress"><div class="toast-progress-bar"></div></div>`;

    toast.querySelector('.toast-close').addEventListener('click', () => dismissToast(toast));
    container.appendChild(toast);

    // Double rAF ensures the CSS transition fires after paint
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-show')));

    const autoDismiss = setTimeout(() => dismissToast(toast), 5000);
    toast.querySelector('.toast-close').addEventListener('click', () => clearTimeout(autoDismiss), { once: true });
};

// ============================================================
//  BUTTON LOADING STATE
// ============================================================
const setButtonLoading = (btn, isLoading) => {
    if (!btn) return;
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.origText = btn.innerHTML;
        btn.innerHTML = '&nbsp;'; // text hidden by CSS; spinner shown via ::before
        btn.classList.add('btn-loading');
    } else {
        btn.disabled = false;
        btn.innerHTML = btn.dataset.origText || btn.innerHTML;
        btn.classList.remove('btn-loading');
    }
};

// ============================================================
//  ANIMATED COUNTER
// ============================================================
const animateCounter = (el, target, duration = 700) => {
    if (!el || isNaN(target)) return;
    const startTime = performance.now();
    const tick = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(target * eased);
        if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
};

// ============================================================
//  NAVIGATION  — animated screen transitions
// ============================================================
const showForm = (id) => {
    document.querySelectorAll('.card').forEach(card => {
        card.classList.add('hidden');
        card.classList.remove('animate-in');
    });
    document.getElementById('admin-actions').classList.add('hidden');

    const el = document.getElementById(id);
    el.classList.remove('hidden');
    // Trigger entrance animation
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('animate-in')));
};

const logoutAdmin = () => {
    document.getElementById('admin-actions').classList.add('hidden');
    showForm('selection-screen');
};

const logout = () => {
    localStorage.removeItem('currentUser');
    showForm('selection-screen');
    showToast('You have been logged out.', 'info');
};

// ============================================================
//  GUEST FORM — conditional field toggling
// ============================================================
window.toggleGuestFields = () => {
    const category   = document.getElementById('g-category').value;
    const emailField = document.getElementById('g-email');
    const clubField  = document.getElementById('g-club');

    if (category === 'Guest' || category === '') {
        emailField.classList.remove('hidden');
        emailField.required = (category === 'Guest');
        clubField.classList.add('hidden');
        clubField.required  = false;
    } else {
        emailField.classList.add('hidden');
        emailField.required = false;
        clubField.classList.remove('hidden');
        clubField.required  = true;
        clubField.placeholder = category === 'Visiting Rotarian'
            ? 'Rotary Club of…'
            : 'Rotaract Club of…';
    }
};

// ============================================================
//  EXPORT — CSV
// ============================================================
window.exportToExcel = async (table) => {
    let data = [], headers = [], fileName = '';

    if (table === 'all') {
        const [members, guests, attendance, makeups] = await Promise.all([
            db.members.toArray(), db.guests.toArray(),
            db.attendance.toArray(), db.makeups.toArray()
        ]);
        headers = ['Category','Name','Email','Phone','Club','Buddy Group','Details/Inviter','Date','Type'];
        const rows = [
            ...members.map(m =>    [`"Member"`,     `"${m.name}"`,  `"${m.email}"`, `"${m.phone}"`,       `""`,          `"${m.buddyGroup||'N/A'}"`, `"Member Registration"`, `""`,         `"Member"`]),
            ...guests.map(g =>     [`"Guest"`,      `"${g.name}"`,  `"${g.email}"`, `"${g.phone}"`,       `"${g.club}"`, `"N/A"`,                    `"${g.inviter||'N/A'}"`, `""`,         `"Guest Registration"`]),
            ...attendance.map(a => [`"Attendance"`, `"${a.name}"`,  `"${a.email}"`, `"${a.phone||''}"`,   `""`,          `"${a.buddyGroup||'N/A'}"`, `""`,                    `"${a.date}"`,`"${a.type}"`]),
            ...makeups.map(m =>    [`"Makeup"`,     `""`,           `"${m.user}"`,  `""`,                 `"${m.club}"`, `""`,                       `""`,                    `"${m.date}"`,`"Makeup Visit"`]),
        ].map(r => r.join(','));
        downloadCSV([headers.join(','), ...rows].join('\n'), 'rotary_master_database');
        showToast('Master database exported successfully.', 'success');
        return;
    }

    if (table === 'attendance') {
        data = await db.attendance.toArray();
        headers  = ['Name','Email','Buddy Group','Date','Type'];
        fileName = 'rotary_attendance';
    } else if (table === 'members') {
        data = await db.members.toArray();
        headers  = ['Name','Email','Phone','Buddy Group'];
        fileName = 'rotary_members';
    } else if (table === 'guests') {
        data = await db.guests.toArray();
        headers  = ['Name','Email','Phone','Category','Club','Invited By'];
        fileName = 'rotary_guests';
    }

    if (data.length === 0) {
        showToast(`No ${table} records to export.`, 'info');
        return;
    }

    const csvContent = [
        headers.join(','),
        ...data.map(row => {
            if (table === 'attendance') return [`"${row.name||''}"`,`"${row.email||''}"`,`"${row.buddyGroup||'N/A'}"`,`"${row.date||''}"`,`"${row.type||''}"`].join(',');
            if (table === 'members')    return [`"${row.name||''}"`,`"${row.email||''}"`,`"${row.phone||''}"`,`"${row.buddyGroup||'N/A'}"`].join(',');
            if (table === 'guests')     return [`"${row.name||''}"`,`"${row.email||''}"`,`"${row.phone||''}"`,`"${row.category||''}"`,`"${row.club||''}"`,`"${row.inviter||''}"`].join(',');
        })
    ].join('\n');

    downloadCSV(csvContent, fileName);
    showToast(`${table.charAt(0).toUpperCase() + table.slice(1)} data exported.`, 'success');
};

const downloadCSV = (csvContent, fileName) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `${fileName}_${new Date().toISOString().split('T')[0]}.csv` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// ============================================================
//  EXPORT — JSON BACKUP
// ============================================================
window.exportDatabase = async () => {
    const [members, guests, attendance, makeups] = await Promise.all([
        db.members.toArray(), db.guests.toArray(),
        db.attendance.toArray(), db.makeups.toArray()
    ]);
    const blob = new Blob([JSON.stringify({ members, guests, attendance, makeups, exportDate: new Date().toLocaleString() }, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `rotary_database_${new Date().toISOString().split('T')[0]}.json` });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Full JSON backup downloaded.', 'success');
};

// ============================================================
//  ADMIN — RENDER STATS + DASHBOARD
// ============================================================
const renderAdminDashboard = async () => {
    const attendanceList = document.getElementById('admin-attendance-list');
    const guestList      = document.getElementById('admin-guest-list');

    const [attendance, guests, memberCount, guestCount, todayCount] = await Promise.all([
        db.attendance.reverse().limit(50).toArray(),
        db.guests.reverse().limit(50).toArray(),
        db.members.count(),
        db.guests.count(),
        db.attendance.filter(r => r.dateISO === todayISO()).count()
    ]);

    // Animated stats
    animateCounter(document.getElementById('admin-stat-members'), memberCount);
    animateCounter(document.getElementById('admin-stat-guests'),  guestCount);
    animateCounter(document.getElementById('admin-stat-today'),   todayCount);

    // Render Attendance list
    attendanceList.innerHTML = attendance.length
        ? ''
        : '<p style="font-size:0.8rem;color:#999;padding:8px;">No attendance records found.</p>';
    attendance.forEach(record => {
        const div     = document.createElement('div');
        div.className = 'admin-record-item';
        div.innerHTML = `
            <strong>${escapeHTML(record.name)}</strong>
            <div class="record-meta">
                <span>${escapeHTML(record.buddyGroup || 'N/A')}</span>
                <span>${escapeHTML(record.date)}</span>
            </div>`;
        attendanceList.appendChild(div);
    });

    // Render Guest list
    guestList.innerHTML = guests.length
        ? ''
        : '<p style="font-size:0.8rem;color:#999;padding:8px;">No guest records found.</p>';
    guests.forEach(record => {
        const div     = document.createElement('div');
        div.className = 'admin-record-item';
        div.innerHTML = `
            <strong>${escapeHTML(record.name)} <span style="opacity:0.65;">(${escapeHTML(record.category)})</span></strong>
            <div class="record-meta">
                <span>${escapeHTML(record.club !== 'N/A' ? record.club : 'No Club')}</span>
                <span>Invited by: ${escapeHTML(record.inviter || 'N/A')}</span>
            </div>`;
        guestList.appendChild(div);
    });
};

// ============================================================
//  ADMIN — CLEAR DATA
// ============================================================
window.clearAllData = async () => {
    if (!confirm('ARE YOU SURE? This will permanently delete ALL members, guests, and attendance records!')) return;
    if (!confirm('FINAL WARNING: All data will be lost. Proceed?')) return;
    await Promise.all([db.members.clear(), db.guests.clear(), db.attendance.clear(), db.makeups.clear()]);
    showToast('Database cleared successfully.', 'info');
    renderAdminDashboard();
};

// ============================================================
//  WHATSAPP THANK YOU MESSAGE
// ============================================================
const sendWhatsAppThankYou = (phone, name) => {
    let cleanPhone = phone.replace(/[\s+()]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '256' + cleanPhone.substring(1);
    if (!cleanPhone.startsWith('256')) cleanPhone = '256' + cleanPhone;
    
    const message = `Hello ${name}, thank you for attending the fellowship of the Rotary Club of Kampala Metropolitan today. We were honoured to have you with us! 🌟\n\nWe hope to see you again at our next meeting.\n\nBest regards,\nRotary Club of Kampala Metropolitan`;
    
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // Create a styled WhatsApp button overlay
    const waOverlay = document.createElement('div');
    waOverlay.id = 'wa-thankyou-overlay';
    waOverlay.innerHTML = `
        <div class="wa-popup">
            <div class="wa-icon">✅</div>
            <h3>Registration Complete!</h3>
            <p>Thank you for registering, <strong>${escapeHTML(name)}</strong>!</p>
            <p class="wa-note">Click below to send yourself a thank you message on WhatsApp:</p>
            <a href="${waUrl}" target="_blank" class="wa-btn">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Send Thank You on WhatsApp
            </a>
            <button onclick="this.closest('#wa-thankyou-overlay').remove()" class="wa-skip">Skip</button>
        </div>
    `;
    document.body.appendChild(waOverlay);
};

// ============================================================
//  FORM SUBMISSIONS
// ============================================================
const handleFormSubmit = async (e, type) => {
    console.log('handleFormSubmit called, type:', type);
    e.preventDefault();
    const submitBtn = e.submitter || e.target.querySelector('button[type="submit"]');
    
    console.log('submitBtn:', submitBtn);
    
    if (!submitBtn) {
        console.error('Submit button not found');
        showToast('Error: Submit button not found', 'error');
        return;
    }
    
    setButtonLoading(submitBtn, true);

    try {
        // Initialize Firebase if not already done
        initFirebase();
        console.log('Processing form type:', type);
        
        if (type === 'member') {
            const email    = document.getElementById('m-email').value.trim();
            const password = document.getElementById('m-password').value;
            const action   = e.submitter ? e.submitter.value : 'register';

            if (action === 'register') {
                const name  = document.getElementById('m-name').value.trim();
                const phone = document.getElementById('m-phone').value.trim();

                if (!name || !phone) {
                    showToast('Please provide your full name and phone number to register.', 'warning');
                    return;
                }
                const existingUser = await db.members.get(email);
                if (existingUser) {
                    showToast('An account with this email already exists. Please login instead.', 'error');
                    return;
                }
                // NOTE: Plain-text passwords in IndexedDB are insecure.
                // For production use Firebase Auth or another auth provider.
                const newUser = { email, password, name, phone, type: 'member' };
                await db.members.add(newUser);
                showToast('Member registered successfully! Welcome to the club.', 'success');
                login(newUser);

            } else {
                const user = await db.members.get(email);
                if (user && user.password === password) {
                    login({ ...user, type: 'member' });
                } else {
                    showToast('Invalid email or password. Please try again.', 'error');
                }
            }

        } else if (type === 'guest') {
            console.log('Processing guest form');
            const guest = {
                category: document.getElementById('g-category').value,
                name:     document.getElementById('g-name').value.trim(),
                email:    document.getElementById('g-email').value.trim() || 'N/A',
                phone:    document.getElementById('g-phone').value.trim(),
                club:     document.getElementById('g-club').value.trim() || 'N/A',
                inviter:  document.getElementById('g-inviter').value.trim(),
                type:     'guest',
                registeredAt: new Date().toISOString()
            };

            console.log('Guest data:', guest);

            const today = todayISO();

            // BUG FIX: Duplicate check uses stored `dateISO` field (YYYY-MM-DD)
            // instead of comparing locale strings — ensures check works on all locales.
            const existing = await db.attendance
                .where('phone').equals(guest.phone)
                .filter(r => r.dateISO === today)
                .toArray();
            if (existing.length > 0) {
                showToast("You've already registered for today's fellowship!", 'warning');
                setButtonLoading(submitBtn, false);
                return;
            }

            // Add to guest master list only on first ever visit
            const existingGuestEntry = await db.guests.where('phone').equals(guest.phone).first();
            console.log('Existing guest entry:', existingGuestEntry);
            if (!existingGuestEntry) {
                await db.guests.add(guest);
                // Save to Firebase Firestore cloud
                saveGuestToFirestore(guest);
            }

            const attendanceRecord = {
                name:       guest.name,
                email:      guest.email,
                phone:      guest.phone,
                date:       new Date().toLocaleString(),
                dateISO:    today,
                type:       'Guest Attendance',
                buddyGroup: 'N/A'
            };
            
            await db.attendance.add(attendanceRecord);
            // Save attendance to Firebase Firestore
            saveAttendanceToFirestore(attendanceRecord);

            showToast(`Welcome, ${guest.name}! Registration confirmed.`, 'success');
            console.log('Guest registration complete');

            // Send WhatsApp thank-you message
            sendWhatsAppThankYou(guest.phone, guest.name);

            e.target.reset();
            showForm('selection-screen');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        showToast('Error: ' + error.message, 'error');
    } finally {
        setButtonLoading(submitBtn, false);
    }
};

// ============================================================
//  MAKEUP HISTORY
// ============================================================
const renderMakeupHistory = async (userEmail) => {
    const makeupHistory = document.getElementById('makeup-history');
    const userMakeups   = await db.makeups.where('user').equals(userEmail).reverse().toArray();

    makeupHistory.innerHTML = userMakeups.length ? '<h4>Your Recent Makeups</h4>' : '';
    userMakeups.forEach(m => {
        const div     = document.createElement('div');
        div.className = 'makeup-item';
        div.innerHTML = `<strong>${escapeHTML(m.club)}</strong><small>Visited on: ${escapeHTML(m.date)}</small>`;
        makeupHistory.appendChild(div);
    });
};

// ============================================================
//  DASHBOARD STATS
// ============================================================
const renderDashboardStats = async (user) => {
    const today = todayISO();
    const [todayAttendance, makeupCount, memberCount] = await Promise.all([
        db.attendance.filter(r => r.dateISO === today && r.type === 'Fellowship').count(),
        db.makeups.where('user').equals(user.email).count(),
        db.members.count()
    ]);
    animateCounter(document.getElementById('stat-today'),         todayAttendance);
    animateCounter(document.getElementById('stat-makeups-count'), makeupCount);
    animateCounter(document.getElementById('stat-members'),       memberCount);
};

// ============================================================
//  ATTENDANCE
// ============================================================
window.logAttendance = async () => {
    const user       = JSON.parse(localStorage.getItem('currentUser'));
    const buddyGroup = document.getElementById('buddy-group').value;
    const btn        = document.querySelector('.attendance-btn');

    if (!buddyGroup) {
        showToast('Please select your Buddy Group before confirming.', 'warning');
        return;
    }

    setButtonLoading(btn, true);
    try {
        const today = todayISO();

        // BUG FIX: Same dateISO-based duplicate check
        const existing = await db.attendance
            .where('email').equals(user.email)
            .filter(r => r.dateISO === today)
            .toArray();
        if (existing.length > 0) {
            showToast("You've already confirmed today's attendance!", 'warning');
            return;
        }

        await db.members.update(user.email, { buddyGroup });
        await db.attendance.add({
            name:       user.name || user.email,
            email:      user.email,
            buddyGroup: buddyGroup,
            date:       new Date().toLocaleString(),
            dateISO:    today,
            type:       'Fellowship'
        });

        showToast('Fellowship attendance confirmed! Thank you.', 'success');
        // Refresh stats after logging
        renderDashboardStats(user);
    } finally {
        setButtonLoading(btn, false);
    }
};

// ============================================================
//  MAKEUP LOGGING
// ============================================================
window.logMakeup = async () => {
    const clubs        = document.querySelectorAll('.m-club');
    const dates        = document.querySelectorAll('.m-date');
    const user         = JSON.parse(localStorage.getItem('currentUser'));
    const btn          = document.querySelector('.makeup-section .secondary');
    let addedCount     = 0;
    let hasIncomplete  = false;

    setButtonLoading(btn, true);
    try {
        for (let i = 0; i < clubs.length; i++) {
            const club = clubs[i].value.trim();
            const date = dates[i].value;

            if (club && date) {
                const dup = await db.makeups
                    .where('user').equals(user.email)
                    .filter(m => m.club === club && m.date === date)
                    .toArray();
                if (dup.length === 0) {
                    await db.makeups.add({ user: user.email, club, date, loggedAt: new Date().toLocaleString() });
                    addedCount++;
                }
                clubs[i].value = '';
                dates[i].value = '';
            } else if ((club && !date) || (!club && date)) {
                hasIncomplete = true;
            }
        }

        if (addedCount > 0) {
            showToast(`${addedCount} makeup visit${addedCount > 1 ? 's' : ''} recorded successfully!`, 'success');
            renderMakeupHistory(user.email);
            renderDashboardStats(user);
        } else if (hasIncomplete) {
            showToast('Some entries are incomplete — provide both a club name and a date.', 'warning');
        } else {
            showToast('No makeup visits noted for this period. Report submitted.', 'info');
            await db.makeups.add({ user: user.email, club: 'No Makeup Visit', date: todayISO(), loggedAt: new Date().toLocaleString() });
            renderMakeupHistory(user.email);
        }
    } finally {
        setButtonLoading(btn, false);
    }
};

// ============================================================
//  SESSION — LOGIN
// ============================================================
const login = async (user) => {
    localStorage.setItem('currentUser', JSON.stringify(user));

    document.getElementById('welcome-msg').textContent =
        `Welcome back, ${user.name || user.email}!`;
    document.getElementById('user-info').textContent =
        `Logged in as: ${user.type === 'member' ? 'Club Member' : (user.category || 'Guest')}`;

    if (user.type === 'member') {
        const freshUser = await db.members.get(user.email);
        if (freshUser?.buddyGroup) {
            document.getElementById('buddy-group').value = freshUser.buddyGroup;
        }
        renderMakeupHistory(user.email);
        renderDashboardStats(user);
    }

    showForm('dashboard');
};

// ============================================================
//  DOM READY
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize Firebase
    initFirebase();

    // Auto-navigate if arrived via QR code
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'qr') showForm('selection-screen');

    // ── Background slideshow ─────────────────────────────────
    const images = [
        'images/km1.jpeg','images/km2.jpeg','images/km3.jpeg','images/km4.jpeg',
        'images/km5.jpeg','images/km6.jpeg','images/km7.jpeg','images/km8.jpeg'
    ];
    let currentIndex = 0;
    const bg1 = document.getElementById('bg-layer-1');
    const bg2 = document.getElementById('bg-layer-2');
    let showingBg1 = true;

    bg1.style.backgroundImage = `url('${images[0]}')`;

    setInterval(() => {
        currentIndex = (currentIndex + 1) % images.length;
        const nextUrl = `url('${images[currentIndex]}')`;
        if (showingBg1) {
            bg2.style.backgroundImage = nextUrl;
            bg2.classList.remove('transparent');
        } else {
            bg1.style.backgroundImage = nextUrl;
            bg2.classList.add('transparent');
        }
        showingBg1 = !showingBg1;
    }, 5000);

    // ── Form bindings ────────────────────────────────────────
    document.getElementById('memberRegistration').addEventListener('submit', e => handleFormSubmit(e, 'member'));
    document.getElementById('guestRegistration').addEventListener('submit',  e => handleFormSubmit(e, 'guest'));

    document.getElementById('adminLogin').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn  = e.target.querySelector('button[type="submit"]');
        const pass = document.getElementById('admin-pass').value;
        setButtonLoading(btn, true);

        // Tiny artificial delay so the spinner is visible
        await new Promise(r => setTimeout(r, 400));

        if (pass === ADMIN_PASSCODE) {
            document.querySelectorAll('.card').forEach(c => {
                c.classList.add('hidden');
                c.classList.remove('animate-in');
            });
            const adminPanel = document.getElementById('admin-actions');
            adminPanel.classList.remove('hidden');
            adminPanel.querySelector('.card').classList.remove('hidden');
            document.getElementById('admin-pass').value = '';
            await renderAdminDashboard();
        } else {
            showToast('Incorrect passcode. Please try again.', 'error');
        }
        setButtonLoading(btn, false);
    });

    // ── Auto-login if session exists ─────────────────────────
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) login(JSON.parse(savedUser));
});
