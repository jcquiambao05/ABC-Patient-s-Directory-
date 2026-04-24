-- ABCare PHP — Database Schema
-- Run this in phpMyAdmin or MySQL CLI after creating the database

CREATE DATABASE IF NOT EXISTS abccare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE abccare;

-- Users table (staff and doctors)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('staff', 'admin') NOT NULL DEFAULT 'staff',
  failed_attempts INT DEFAULT 0,
  locked_until DATETIME NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME NULL
);

-- Patients table
CREATE TABLE IF NOT EXISTS patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  age INT NULL,
  gender VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  civil_status VARCHAR(50) NULL,
  address TEXT NULL,
  contact_number VARCHAR(50) NULL,
  occupation VARCHAR(100) NULL,
  referred_by VARCHAR(100) NULL,
  profile_photo_path VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Default accounts (password: Staff@ABC2026! and Doctor@ABC2026!)
-- Hashes generated with password_hash() using PASSWORD_BCRYPT
INSERT INTO users (email, name, password_hash, role) VALUES
('staff@abcclinic.com',  'Clinic Staff',  '$2y$12$UPmu9L9wjf.Suq9Y9i0RMeAreKQws1VwEuSaKjDPJYnH0sMDsaUba', 'staff'),
('doctor@abcclinic.com', 'Clinic Doctor', '$2y$12$ibbfQisjl1nsnx50Xv9q0.wVa1baNl5ZdbdtsMjOqbAVg2iwPXPRa', 'admin')
ON DUPLICATE KEY UPDATE id=id;
