<?php
/**
 * Authentication helpers
 */
session_start();

function isLoggedIn(): bool {
    return isset($_SESSION['user_id']);
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        header('Location: /abccare-php/index.php');
        exit;
    }
}

function currentUser(): array {
    return $_SESSION['user'] ?? [];
}

function login(string $email, string $password): array {
    $db = getDB();

    $stmt = $db->prepare('SELECT * FROM users WHERE email = ?');
    $stmt->execute([strtolower(trim($email))]);
    $user = $stmt->fetch();

    if (!$user) {
        return ['success' => false, 'error' => 'Invalid email or password'];
    }

    // Check account lock
    if ($user['locked_until'] && new DateTime() < new DateTime($user['locked_until'])) {
        return ['success' => false, 'error' => 'Account locked. Try again later.'];
    }

    // Verify password
    if (!password_verify($password, $user['password_hash'])) {
        // Increment failed attempts
        $attempts = $user['failed_attempts'] + 1;
        $lockUntil = $attempts >= 5 ? date('Y-m-d H:i:s', strtotime('+15 minutes')) : null;
        $db->prepare('UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?')
           ->execute([$attempts, $lockUntil, $user['id']]);
        return ['success' => false, 'error' => 'Invalid email or password'];
    }

    // Reset failed attempts, update last login
    $db->prepare('UPDATE users SET failed_attempts=0, locked_until=NULL, last_login=NOW() WHERE id=?')
       ->execute([$user['id']]);

    // Store in session
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user'] = [
        'id'    => $user['id'],
        'email' => $user['email'],
        'name'  => $user['name'],
        'role'  => $user['role'],
    ];

    return ['success' => true, 'user' => $_SESSION['user']];
}

function logout(): void {
    session_destroy();
    header('Location: /abccare-php/index.php');
    exit;
}
