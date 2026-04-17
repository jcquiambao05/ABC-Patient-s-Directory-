<?php
require_once 'includes/db.php';
require_once 'includes/auth.php';

// Already logged in — go to directory
if (isLoggedIn()) {
    header('Location: /abccare-php/directory.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $result = login($_POST['email'] ?? '', $_POST['password'] ?? '');
    if ($result['success']) {
        header('Location: /abccare-php/directory.php');
        exit;
    }
    $error = $result['error'];
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ABCare — Login</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #09090b;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      padding: 40px;
      width: 100%;
      max-width: 400px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 44px; height: 44px;
      background: #10b981;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 22px;
    }
    .logo h1 { font-size: 20px; font-weight: 700; color: #fff; }
    .logo p  { font-size: 12px; color: #71717a; }
    label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #a1a1aa;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    input[type="email"], input[type="password"] {
      width: 100%;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 12px 14px;
      color: #fff;
      font-size: 15px;
      outline: none;
      margin-bottom: 18px;
    }
    input:focus { border-color: #10b981; }
    .error {
      background: #450a0a;
      border: 1px solid #7f1d1d;
      color: #fca5a5;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 13px;
      margin-bottom: 18px;
    }
    button[type="submit"] {
      width: 100%;
      background: #10b981;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 13px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #059669; }
    .hint {
      margin-top: 20px;
      font-size: 12px;
      color: #52525b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">🏥</div>
      <div>
        <h1>ABCare OmniFlow</h1>
        <p>Patient Directory System</p>
      </div>
    </div>

    <?php if ($error): ?>
      <div class="error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST">
      <label>Email</label>
      <input type="email" name="email" placeholder="staff@abcclinic.com"
             value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required autofocus />

      <label>Password</label>
      <input type="password" name="password" placeholder="••••••••••••" required />

      <button type="submit">Sign In</button>
    </form>

    <p class="hint">
      Staff: staff@abcclinic.com / Staff@ABC2026!<br>
      Doctor: doctor@abcclinic.com / Doctor@ABC2026!
    </p>
  </div>
</body>
</html>
