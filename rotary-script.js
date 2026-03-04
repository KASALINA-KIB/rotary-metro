// Initialize Dexie Database
const db = new Dexie("RotaryDB");
db.version(1).stores({
    members: 'email, name, phone, password, buddyGroup',
    guests: '++id, email, name, phone, category, club, inviter',
    attendance: '++id, email, name, date, type, buddyGroup',
    makeups: '++id, user, club, date, loggedAt'
});

const showForm = (id) => {
    document.querySelectorAll('.card').forEach(card => card.classList.add('hidden'));
    document.getElementById('admin-actions').classList.add('hidden');
    document.getElementById(id).classList.remove('hidden');
};

const logoutAdmin = () => {
    document.getElementById('admin-actions').classList.add('hidden');
    showForm('selection-screen');
};

window.toggleGuestFields = () => {
    const category = document.getElementById('g-category').value;
    const emailField = document.getElementById('g-email');
    const clubField = document.getElementById('g-club');
    
    if (category === 'Guest' || category === '') {
        emailField.classList.remove('hidden');
        emailField.required = (category === 'Guest');
        clubField.classList.add('hidden');
        clubField.required = false;
    } else {
        emailField.classList.add('hidden');
        emailField.required = false;
        clubField.classList.remove('hidden');
        clubField.required = true;
        
        if (category === 'Visiting Rotarian') {
            clubField.placeholder = "Rotary Club of...";
        } else if (category === 'Visiting Rotaractor') {
            clubField.placeholder = "Rotaract Club of...";
        }
    }
};

const logout = () => {
    localStorage.removeItem('currentUser');
    showForm('selection-screen');
};

// Export Database Function
window.exportToExcel = async (table) => {
    let data = [];
    let headers = [];
    let fileName = "";

    if (table === 'attendance') {
        data = await db.attendance.toArray();
        headers = ["Name", "Email", "Buddy Group", "Date", "Type"];
        fileName = "rotary_attendance";
    } else if (table === 'members') {
        data = await db.members.toArray();
        headers = ["Name", "Email", "Phone", "Buddy Group"];
        fileName = "rotary_members";
    } else if (table === 'guests') {
        data = await db.guests.toArray();
        headers = ["Name", "Email", "Phone", "Category", "Club", "Invited By"];
        fileName = "rotary_guests";
    }
    
    if (data.length === 0) {
        alert(`No ${table} records to export.`);
        return;
    }

    // Convert to CSV string
    const csvContent = [
        headers.join(","),
        ...data.map(row => {
            if (table === 'attendance') {
                return [`"${row.name || ''}"`, `"${row.email || ''}"`, `"${row.buddyGroup || 'N/A'}"`, `"${row.date || ''}"`, `"${row.type || ''}"`].join(",");
            } else if (table === 'members') {
                return [`"${row.name || ''}"`, `"${row.email || ''}"`, `"${row.phone || ''}"`, `"${row.buddyGroup || 'N/A'}"`].join(",");
            } else if (table === 'guests') {
                return [`"${row.name || ''}"`, `"${row.email || ''}"`, `"${row.phone || ''}"`, `"${row.category || ''}"`, `"${row.club || ''}"`, `"${row.inviter || ''}"`].join(",");
            }
        })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

window.exportDatabase = async () => {
    const members = await db.members.toArray();
    const guests = await db.guests.toArray();
    const attendance = await db.attendance.toArray();
    const makeups = await db.makeups.toArray();
    
    const data = {
        members,
        guests,
        attendance,
        makeups,
        exportDate: new Date().toLocaleString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rotary_database_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

document.addEventListener('DOMContentLoaded', () => {
    // Check if redirected from QR code
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('source') === 'qr') {
        showForm('selection-screen');
    }

    // Background logic
    const images = ['images/km1.jpeg', 'images/km2.jpeg', 'images/km3.jpeg', 'images/km4.jpeg', 'images/km5.jpeg', 'images/km6.jpeg', 'images/km7.jpeg', 'images/km8.jpeg'];
    let currentImageIndex = 0;
    const bg1 = document.getElementById('bg-layer-1');
    const bg2 = document.getElementById('bg-layer-2');
    let showingBg1 = true;

    const updateBackground = () => {
        const nextImgIndex = (currentImageIndex + 1) % images.length;
        const nextImgUrl = `url('${images[nextImgIndex]}')`;

        if (showingBg1) {
            bg2.style.backgroundImage = nextImgUrl;
            bg2.classList.remove('transparent');
        } else {
            bg1.style.backgroundImage = nextImgUrl;
            bg2.classList.add('transparent');
        }
        
        currentImageIndex = nextImgIndex;
        showingBg1 = !showingBg1;
    };

    bg1.style.backgroundImage = `url('${images[currentImageIndex]}')`;
    setInterval(updateBackground, 5000);

    const memberForm = document.getElementById('memberRegistration');
    const guestForm = document.getElementById('guestRegistration');
    const adminLoginForm = document.getElementById('adminLogin');
    const welcomeMsg = document.getElementById('welcome-msg');
    const userInfo = document.getElementById('user-info');

    const handleAdminLogin = async (e) => {
        e.preventDefault();
        const pass = document.getElementById('admin-pass').value;
        // Simple admin passcode
        if (pass === 'RotaryAdmin2024') {
            document.querySelectorAll('.card').forEach(card => card.classList.add('hidden'));
            document.getElementById('admin-actions').classList.remove('hidden');
            document.getElementById('admin-pass').value = '';
            await renderAdminDashboard();
        } else {
            alert('Incorrect Admin Passcode');
        }
    };

    const renderAdminDashboard = async () => {
        const attendanceList = document.getElementById('admin-attendance-list');
        const guestList = document.getElementById('admin-guest-list');
        
        // Fetch data
        const attendance = await db.attendance.reverse().limit(50).toArray();
        const guests = await db.guests.reverse().limit(50).toArray();
        
        // Render Attendance
        attendanceList.innerHTML = attendance.length ? '' : '<p style="font-size: 0.8rem; color: #999;">No attendance records found.</p>';
        attendance.forEach(record => {
            const div = document.createElement('div');
            div.className = 'admin-record-item';
            div.innerHTML = `
                <strong>${record.name}</strong>
                <div class="record-meta">
                    <span>${record.buddyGroup || 'N/A'}</span>
                    <span>${record.date}</span>
                </div>
            `;
            attendanceList.appendChild(div);
        });
        
        // Render Guests
        guestList.innerHTML = guests.length ? '' : '<p style="font-size: 0.8rem; color: #999;">No guest records found.</p>';
        guests.forEach(record => {
            const div = document.createElement('div');
            div.className = 'admin-record-item';
            div.innerHTML = `
                <strong>${record.name} (${record.category})</strong>
                <div class="record-meta">
                    <span>${record.club !== 'N/A' ? record.club : 'No Club'}</span>
                    <span>Invited by: ${record.inviter || 'N/A'}</span>
                </div>
            `;
            guestList.appendChild(div);
        });
    };

    window.clearAllData = async () => {
        if (confirm("ARE YOU SURE? This will permanently delete ALL members, guests, and attendance records!")) {
            const doubleCheck = confirm("FINAL WARNING: All data will be lost. Proceed with deletion?");
            if (doubleCheck) {
                await db.members.clear();
                await db.guests.clear();
                await db.attendance.clear();
                await db.makeups.clear();
                alert("Database cleared successfully.");
                renderAdminDashboard();
            }
        }
    };

    const handleFormSubmit = async (e, type) => {
        e.preventDefault();
        const action = e.submitter ? e.submitter.value : 'register';

        if (type === 'member') {
            const email = document.getElementById('m-email').value;
            const password = document.getElementById('m-password').value;
            
            if (action === 'register') {
                const name = document.getElementById('m-name').value;
                const phone = document.getElementById('m-phone').value;
                if (!name || !phone) {
                    alert('Please provide full name and phone number for registration');
                    return;
                }
                
                const existingUser = await db.members.get(email);
                if (existingUser) {
                    alert('Email already exists');
                    return;
                }
                
                const newUser = { email, password, name, phone, type: 'member' };
                await db.members.add(newUser);
                alert('Member Registered Successfully!');
                login(newUser);
            } else {
                const user = await db.members.get(email);
                if (user && user.password === password) {
                    login({ ...user, type: 'member' });
                } else {
                    alert('Invalid Credentials');
                }
            }
        } else if (type === 'guest') {
            const guest = { 
                category: document.getElementById('g-category').value,
                name: document.getElementById('g-name').value, 
                email: document.getElementById('g-email').value || 'N/A',
                phone: document.getElementById('g-phone').value,
                club: document.getElementById('g-club').value || 'N/A',
                inviter: document.getElementById('g-inviter').value,
                type: 'guest' 
            };

            // Check if this guest already registered today (attendance)
            const today = new Date().toISOString().split('T')[0];
            const existingAttendance = await db.attendance
                .where('phone').equals(guest.phone)
                .filter(record => record.date.includes(today))
                .toArray();
            
            if (existingAttendance.length > 0) {
                alert('You have already registered for today!');
                return;
            }

            // Also check if guest exists in master list (guests table) to prevent master list duplication
            const existingGuestEntry = await db.guests.where('phone').equals(guest.phone).first();
            if (!existingGuestEntry) {
                await db.guests.add(guest);
            }
            
            await db.attendance.add({
                name: guest.name,
                email: guest.email,
                phone: guest.phone,
                date: new Date().toLocaleString(),
                type: 'Guest Attendance',
                buddyGroup: 'N/A'
            });
            
            alert('Registration Successful! Welcome to our fellowship.');
            e.target.reset();
            showForm('selection-screen');
        }
    };

    const renderMakeupHistory = async (userEmail) => {
        const makeupHistory = document.getElementById('makeup-history');
        const userMakeups = await db.makeups.where('user').equals(userEmail).reverse().toArray();
        
        makeupHistory.innerHTML = userMakeups.length ? '<h4>Your Recent Makeups:</h4>' : '';
        userMakeups.forEach(m => {
            const div = document.createElement('div');
            div.className = 'makeup-item';
            div.innerHTML = `<strong>${m.club}</strong><small>Visited on: ${m.date}</small>`;
            makeupHistory.appendChild(div);
        });
    };

    window.logAttendance = async () => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const buddyGroup = document.getElementById('buddy-group').value;
        if (!buddyGroup) {
            alert('Please select your Buddy Group');
            return;
        }

        // Check for duplicate attendance today
        const today = new Date().toISOString().split('T')[0];
        const existingAttendance = await db.attendance
            .where('email').equals(user.email)
            .filter(record => record.date.includes(today))
            .toArray();

        if (existingAttendance.length > 0) {
            alert('You have already confirmed your attendance for today!');
            return;
        }

        await db.members.update(user.email, { buddyGroup: buddyGroup });
        
        await db.attendance.add({
            name: user.name || user.email,
            email: user.email,
            buddyGroup: buddyGroup,
            date: new Date().toLocaleString(),
            type: 'Fellowship'
        });
        
        alert('Fellowship Attendance Confirmed!');
    };

    window.logMakeup = async () => {
        const clubs = document.querySelectorAll('.m-club');
        const dates = document.querySelectorAll('.m-date');
        const user = JSON.parse(localStorage.getItem('currentUser'));
        let addedCount = 0;

        for (let i = 0; i < clubs.length; i++) {
            const club = clubs[i].value.trim();
            const date = dates[i].value;
            
            if (club && date) {
                // Check for duplicate makeup entry
                const existingMakeup = await db.makeups
                    .where('user').equals(user.email)
                    .filter(m => m.club === club && m.date === date)
                    .toArray();

                if (existingMakeup.length === 0) {
                    await db.makeups.add({
                        user: user.email,
                        club: club,
                        date: date,
                        loggedAt: new Date().toLocaleString()
                    });
                    addedCount++;
                }
                
                // Clear inputs even if skipped (to show processing)
                clubs[i].value = '';
                dates[i].value = '';
            }
        }

        if (addedCount > 0) {
            alert(`${addedCount} new Makeup Visit(s) Recorded!`);
            renderMakeupHistory(user.email);
        } else if (clubs[0].value || dates[0].value) {
            alert('Entries were already recorded or are incomplete');
        } else {
            alert('Please fill in at least one club and date');
        }
    };

    const login = async (user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        welcomeMsg.innerText = `Welcome, ${user.name || user.email}!`;
        
        let subTitle = user.type === 'member' ? 'Club Member' : user.category || 'Guest';
        userInfo.innerText = `Logged in as: ${subTitle}`;
        
        if (user.type === 'member') {
            const freshUser = await db.members.get(user.email);
            if (freshUser && freshUser.buddyGroup) {
                document.getElementById('buddy-group').value = freshUser.buddyGroup;
            }
            renderMakeupHistory(user.email);
        }
        
        showForm('dashboard');
    };

    memberForm.addEventListener('submit', (e) => handleFormSubmit(e, 'member'));
    guestForm.addEventListener('submit', (e) => handleFormSubmit(e, 'guest'));
    adminLoginForm.addEventListener('submit', handleAdminLogin);

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) login(JSON.parse(currentUser));
});
