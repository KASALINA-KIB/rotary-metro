const showForm = (id) => {
    document.querySelectorAll('.card').forEach(card => card.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
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
        
        // Update placeholder based on specific category
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

document.addEventListener('DOMContentLoaded', () => {
    const memberForm = document.getElementById('memberRegistration');
    const guestForm = document.getElementById('guestRegistration');
    const welcomeMsg = document.getElementById('welcome-msg');
    const userInfo = document.getElementById('user-info');

    const handleFormSubmit = (e, type) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        const action = e.submitter.value || 'register';

        let users = JSON.parse(localStorage.getItem('rotary-users')) || [];

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
                if (users.find(u => u.email === email)) {
                    alert('Email already exists');
                    return;
                }
                const newUser = { email, password, name, phone, type: 'member' };
                users.push(newUser);
                localStorage.setItem('rotary-users', JSON.stringify(users));
                alert('Member Registered Successfully!');
                login(newUser);
            } else {
                const user = users.find(u => u.email === email && u.password === password);
                if (user) login(user);
                else alert('Invalid Credentials');
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
            
            // Log as attendance automatically
            const attendanceLog = JSON.parse(localStorage.getItem('rotary-attendance')) || [];
            attendanceLog.push({
                ...guest,
                date: new Date().toLocaleString(),
                type: 'Guest Attendance'
            });
            localStorage.setItem('rotary-attendance', JSON.stringify(attendanceLog));
            
            alert('Registration Successful! Welcome to our fellowship.');
            e.target.reset(); // Clear form fields
            showForm('selection-screen'); // Return to main screen
        }
    };

    const renderMakeupHistory = (userEmail) => {
        const makeupHistory = document.getElementById('makeup-history');
        const makeups = JSON.parse(localStorage.getItem('rotary-makeups')) || [];
        const userMakeups = makeups.filter(m => m.user === userEmail).reverse();
        
        makeupHistory.innerHTML = userMakeups.length ? '<h4>Your Recent Makeups:</h4>' : '';
        userMakeups.forEach(m => {
            const div = document.createElement('div');
            div.className = 'makeup-item';
            div.innerHTML = `<strong>${m.club}</strong><small>Visited on: ${m.date}</small>`;
            makeupHistory.appendChild(div);
        });
    };

    window.logAttendance = () => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const buddyGroup = document.getElementById('buddy-group').value;
        if (!buddyGroup) {
            alert('Please select your Buddy Group');
            return;
        }

        // Save buddy group to user profile
        let users = JSON.parse(localStorage.getItem('rotary-users'));
        const userIdx = users.findIndex(u => u.email === user.email);
        users[userIdx].buddyGroup = buddyGroup;
        localStorage.setItem('rotary-users', JSON.stringify(users));
        
        // Log attendance for database personnel
        const attendanceLog = JSON.parse(localStorage.getItem('rotary-attendance')) || [];
        attendanceLog.push({
            name: user.name || user.email,
            email: user.email,
            buddyGroup: buddyGroup,
            date: new Date().toLocaleString(),
            type: 'Fellowship'
        });
        localStorage.setItem('rotary-attendance', JSON.stringify(attendanceLog));
        
        alert('Fellowship Attendance Confirmed!');
    };

    window.logMakeup = () => {
        const clubs = document.querySelectorAll('.m-club');
        const dates = document.querySelectorAll('.m-date');
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const makeups = JSON.parse(localStorage.getItem('rotary-makeups')) || [];
        let addedCount = 0;

        clubs.forEach((clubInput, index) => {
            const club = clubInput.value.trim();
            const date = dates[index].value;
            
            if (club && date) {
                makeups.push({
                    user: user.email,
                    club: club,
                    date: date,
                    loggedAt: new Date().toLocaleString()
                });
                addedCount++;
                // Clear inputs after saving
                clubInput.value = '';
                dates[index].value = '';
            }
        });

        if (addedCount > 0) {
            localStorage.setItem('rotary-makeups', JSON.stringify(makeups));
            alert(`${addedCount} Makeup Visit(s) Recorded!`);
            renderMakeupHistory(user.email);
        } else {
            alert('Please fill in at least one club and date');
        }
    };

    const login = (user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        welcomeMsg.innerText = `Welcome, ${user.name || user.email}!`;
        
        let subTitle = user.type === 'member' ? 'Club Member' : user.category || 'Guest';
        userInfo.innerText = `Logged in as: ${subTitle}`;
        
        // Pre-select buddy group if already saved
        if (user.type === 'member') {
            const users = JSON.parse(localStorage.getItem('rotary-users')) || [];
            const freshUser = users.find(u => u.email === user.email);
            if (freshUser && freshUser.buddyGroup) {
                document.getElementById('buddy-group').value = freshUser.buddyGroup;
            }
            renderMakeupHistory(user.email);
        }
        
        showForm('dashboard');
    };

    memberForm.addEventListener('submit', (e) => handleFormSubmit(e, 'member'));
    guestForm.addEventListener('submit', (e) => handleFormSubmit(e, 'guest'));

    // Check if already logged in
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) login(JSON.parse(currentUser));
});