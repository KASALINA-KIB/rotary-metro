-- Database schema for Rotary Club Registration

-- Members Table
CREATE TABLE members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password TEXT NOT NULL,
    buddy_group TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Guests Table
CREATE TABLE guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    club TEXT,
    inviter TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance Table
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    buddy_group TEXT,
    attendance_type TEXT NOT NULL, -- 'Fellowship', 'Guest Attendance'
    date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Makeups Table
CREATE TABLE makeups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_email TEXT NOT NULL,
    club_visited TEXT NOT NULL,
    visit_date DATE NOT NULL,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
