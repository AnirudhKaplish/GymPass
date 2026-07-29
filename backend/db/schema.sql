-- GymPass PostgreSQL Schema

-- 1. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    age INT,
    gender VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Plans Table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'monthly', 'quarterly', 'half-yearly', 'yearly', 'hourly'
    price DECIMAL(10, 2) NOT NULL,
    validity_days INT NOT NULL,
    limit_hours INT DEFAULT NULL, -- NULL for unlimited/monthly packages
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive'
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES plans(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired'
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    remaining_seconds INT NOT NULL, -- For hourly, converted from plan's limit_hours. For monthly, set to 0.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    plan_id INT REFERENCES plans(id) ON DELETE SET NULL,
    razorpay_order_id VARCHAR(255) UNIQUE,
    razorpay_payment_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Sessions (Check-ins/Check-outs) Table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    duration_seconds INT DEFAULT NULL,
    hours_deducted DECIMAL(5, 2) DEFAULT NULL,
    status VARCHAR(50) DEFAULT 'active' -- 'active', 'completed', 'aborted'
);

-- 7. OTP Logs Table
CREATE TABLE IF NOT EXISTS otp_logs (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(10) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    gym_name VARCHAR(100) NOT NULL,
    logo_url TEXT,
    address TEXT,
    contact_number VARCHAR(20),
    email VARCHAR(255),
    opening_time VARCHAR(10) DEFAULT '06:00',
    closing_time VARCHAR(10) DEFAULT '22:00',
    currency VARCHAR(10) DEFAULT 'INR',
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for QR Scan / Session Validation
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id) WHERE status = 'active';

-- Seed Data: Default Admin (email: admin@gympass.com, password: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO admins (email, password_hash) 
VALUES ('admin@gympass.com', '$2a$10$V6zL9n6zY9Qx7L5U4P2x9O2f6rR3v8G5g1K8W7VqU8u8T4W9Z4q2K')
ON CONFLICT (email) DO NOTHING;

-- Seed Data: Gym Settings
INSERT INTO settings (id, gym_name, logo_url, address, contact_number, email, opening_time, closing_time, currency, timezone)
VALUES (1, 'GymPass Prime', '/logo.png', '123 Fitness Avenue, Bangalore, India', '+91 98765 43210', 'info@gympassprime.com', '06:00', '22:00', 'INR', 'Asia/Kolkata')
ON CONFLICT (id) DO NOTHING;

-- Seed Data: Sample Plans
INSERT INTO plans (name, type, price, validity_days, limit_hours, description, status, is_visible)
VALUES 
('Monthly Premium', 'monthly', 1500.00, 30, NULL, 'Unlimited gym access for 30 days.', 'active', TRUE),
('Quarterly Premium', 'quarterly', 4000.00, 90, NULL, 'Unlimited gym access for 90 days.', 'active', TRUE),
('Half-Yearly Premium', 'half-yearly', 7500.00, 180, NULL, 'Unlimited gym access for 180 days.', 'active', TRUE),
('10 Hour Pack', 'hourly', 800.00, 30, 10, 'Prepaid 10 hours gym time valid for 30 days.', 'active', TRUE),
('25 Hour Pack', 'hourly', 1800.00, 90, 25, 'Prepaid 25 hours gym time valid for 90 days.', 'active', TRUE),
('50 Hour Pack', 'hourly', 3200.00, 180, 50, 'Prepaid 50 hours gym time valid for 180 days.', 'active', TRUE);
