<?php
require_once 'includes/db.php';
require_once 'includes/auth.php';
requireLogin();

$user = currentUser();
$db   = getDB();

// Handle add patient
$addError = '';
$addSuccess = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'add') {
    $fullName = trim($_POST['full_name'] ?? '');
    if (!$fullName) {
        $addError = 'Patient name is required.';
    } else {
        $stmt = $db->prepare('INSERT INTO patients (full_name, age, gender, date_of_birth, civil_status, address, contact_number, occupation, referred_by) VALUES (?,?,?,?,?,?,?,?,?)');
        $stmt->execute([
            $fullName,
            $_POST['age']            ?: null,
            $_POST['gender']         ?: null,
            $_POST['date_of_birth']  ?: null,
            $_POST['civil_status']   ?: null,
            $_POST['address']        ?: null,
            $_POST['contact_number'] ?: null,
            $_POST['occupation']     ?: null,
            $_POST['referred_by']    ?: null,
        ]);
        $addSuccess = "Patient \"$fullName\" added successfully.";
    }
}

// Handle delete
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete' && $user['role'] === 'staff') {
    $db->prepare('DELETE FROM patients WHERE id=?')->execute([$_POST['patient_id']]);
}

// Search + fetch patients
$search = trim($_GET['q'] ?? '');
if ($search) {
    $stmt = $db->prepare('SELECT * FROM patients WHERE full_name LIKE ? ORDER BY full_name ASC');
    $stmt->execute(['%' . $search . '%']);
} else {
    $stmt = $db->query('SELECT * FROM patients ORDER BY full_name ASC');
}
$patients = $stmt->fetchAll();

// Group by last name initial
$grouped = [];
foreach ($patients as $p) {
    $words    = explode(' ', trim($p['full_name']));
    $lastName = end($words);
    $key      = strtoupper($lastName[0] ?? '#');
    $grouped[$key][] = $p;
}
ksort($grouped);

// Selected patient detail
$selected = null;
if (isset($_GET['id'])) {
    $stmt = $db->prepare('SELECT * FROM patients WHERE id=?');
    $stmt->execute([$_GET['id']]);
    $selected = $stmt->fetch();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ABCare — Patient Directory</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f4f4f5;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* ── Sidebar ── */
    .layout { display: flex; flex: 1; overflow: hidden; }
    .sidebar {
      width: 220px;
      background: #09090b;
      color: #a1a1aa;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
    }
    .sidebar-logo {
      padding: 20px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      border-bottom: 1px solid #27272a;
    }
    .sidebar-logo .icon {
      width: 36px; height: 36px;
      background: #10b981;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .sidebar-logo span { font-weight: 700; font-size: 15px; }
    .sidebar nav { flex: 1; padding: 12px 8px; }
    .sidebar nav a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #a1a1aa;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s;
    }
    .sidebar nav a.active, .sidebar nav a:hover { background: #27272a; color: #fff; }
    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid #27272a;
    }
    .role-badge {
      background: #18181b;
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .role-badge .label { font-size: 10px; color: #52525b; text-transform: uppercase; letter-spacing: 0.08em; }
    .role-badge .value { font-size: 13px; font-weight: 600; color: <?= $user['role'] === 'admin' ? '#60a5fa' : '#34d399' ?>; margin-top: 2px; }
    .sidebar-footer a {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      color: #a1a1aa;
      text-decoration: none;
      font-size: 14px;
    }
    .sidebar-footer a:hover { color: #f87171; background: #27272a; }

    /* ── Main content ── */
    .main { flex: 1; display: flex; overflow: hidden; }

    /* ── Patient list ── */
    .patient-list {
      width: <?= $selected ? '40%' : '100%' ?>;
      background: #fff;
      border-right: 1px solid #e4e4e7;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width 0.3s;
    }
    .list-header {
      padding: 20px;
      border-bottom: 1px solid #f4f4f5;
      background: #fff;
    }
    .list-header h1 { font-size: 20px; font-weight: 700; color: #18181b; }
    .list-header p  { font-size: 12px; color: #71717a; margin-top: 2px; }
    .list-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    .btn {
      padding: 8px 14px;
      border-radius: 10px;
      border: none;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-green  { background: #10b981; color: #fff; }
    .btn-green:hover { background: #059669; }
    .btn-red    { background: #fee2e2; color: #dc2626; }
    .btn-red:hover { background: #fecaca; }
    .btn-gray   { background: #f4f4f5; color: #3f3f46; }
    .btn-gray:hover { background: #e4e4e7; }

    .search-bar { padding: 10px 20px; border-bottom: 1px solid #f4f4f5; }
    .search-bar form { display: flex; gap: 8px; }
    .search-bar input {
      flex: 1;
      padding: 9px 14px;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
    }
    .search-bar input:focus { border-color: #10b981; }

    .patient-scroll { flex: 1; overflow-y: auto; }
    .cabinet-label {
      padding: 6px 20px;
      background: rgba(244,244,245,0.9);
      border-top: 1px solid #e4e4e7;
      border-bottom: 1px solid #e4e4e7;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 10px;
      font-weight: 700;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      position: sticky;
      top: 0;
    }
    .cabinet-letter {
      width: 20px; height: 20px;
      background: #3f3f46;
      color: #fff;
      border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px;
    }
    .patient-row {
      padding: 14px 20px;
      border-bottom: 1px solid #f4f4f5;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      transition: background 0.1s;
    }
    .patient-row:hover { background: #fafafa; }
    .patient-row.active { background: #f0fdf4; border-left: 3px solid #10b981; }
    .avatar {
      width: 44px; height: 44px;
      border-radius: 14px;
      background: #e4e4e7;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
      font-size: 15px;
      color: #52525b;
      flex-shrink: 0;
      overflow: hidden;
    }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .patient-info { flex: 1; min-width: 0; }
    .patient-name { font-weight: 700; font-size: 15px; color: #18181b; }
    .patient-meta { font-size: 12px; color: #71717a; margin-top: 2px; }
    .empty { text-align: center; padding: 60px 20px; color: #a1a1aa; }

    /* ── Detail panel ── */
    .detail-panel {
      flex: 1;
      background: #fff;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .detail-header {
      padding: 16px 20px;
      border-bottom: 1px solid #f4f4f5;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .detail-header .avatar { width: 48px; height: 48px; }
    .detail-header h2 { font-size: 17px; font-weight: 700; color: #18181b; }
    .detail-header p  { font-size: 13px; color: #71717a; }
    .detail-actions {
      padding: 10px 20px;
      border-bottom: 1px solid #f4f4f5;
      background: #fafafa;
      display: flex;
      gap: 8px;
    }
    .detail-body { flex: 1; overflow-y: auto; padding: 20px; }
    .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { background: #fafafa; border-radius: 10px; padding: 12px 14px; }
    .field .flabel { font-size: 11px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .field .fvalue { font-size: 15px; font-weight: 600; color: #18181b; }
    .field.full { grid-column: 1 / -1; }
    .close-btn {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 20px;
      color: #a1a1aa;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 8px;
    }
    .close-btn:hover { background: #f4f4f5; color: #18181b; }

    /* ── Add patient modal ── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: #18181b;
      border: 1px solid #27272a;
      border-radius: 20px;
      width: 100%;
      max-width: 560px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px;
    }
    .modal h2 { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 20px; }
    .modal label { display: block; font-size: 11px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
    .modal input, .modal select {
      width: 100%;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 10px;
      padding: 10px 12px;
      color: #fff;
      font-size: 14px;
      outline: none;
      margin-bottom: 14px;
    }
    .modal input:focus, .modal select:focus { border-color: #10b981; }
    .modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 8px; }
    .error-msg { background: #450a0a; border: 1px solid #7f1d1d; color: #fca5a5; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
    .success-msg { background: #052e16; border: 1px solid #166534; color: #86efac; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
  </style>
</head>
<body>
<div class="layout">

  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-logo">
      <div class="icon">🏥</div>
      <span>ABCare</span>
    </div>
    <nav>
      <a href="directory.php" class="active">📁 Directory</a>
    </nav>
    <div class="sidebar-footer">
      <div class="role-badge">
        <div class="label">Role</div>
        <div class="value"><?= $user['role'] === 'admin' ? '👨‍⚕️ Doctor / Admin' : '👤 Staff' ?></div>
      </div>
      <a href="logout.php">🚪 Sign Out</a>
    </div>
  </div>

  <!-- Main -->
  <div class="main">

    <!-- Patient list -->
    <div class="patient-list">
      <div class="list-header">
        <h1>Patient Archives</h1>
        <p>Organized A–Z by last name</p>
        <div class="list-actions">
          <?php if ($user['role'] === 'staff'): ?>
            <button class="btn btn-green" onclick="document.getElementById('addModal').classList.add('open')">
              + New Entry
            </button>
          <?php endif; ?>
        </div>
      </div>

      <div class="search-bar">
        <form method="GET">
          <input type="text" name="q" placeholder="Search patients..." value="<?= htmlspecialchars($search) ?>" />
          <button type="submit" class="btn btn-gray">Search</button>
          <?php if ($search): ?><a href="directory.php" class="btn btn-gray">Clear</a><?php endif; ?>
        </form>
      </div>

      <?php if ($addError): ?>
        <div style="padding:10px 20px"><div class="error-msg"><?= htmlspecialchars($addError) ?></div></div>
      <?php endif; ?>
      <?php if ($addSuccess): ?>
        <div style="padding:10px 20px"><div class="success-msg"><?= htmlspecialchars($addSuccess) ?></div></div>
      <?php endif; ?>

      <div class="patient-scroll">
        <?php if (empty($grouped)): ?>
          <div class="empty">
            <div style="font-size:40px;margin-bottom:12px">📂</div>
            <p><?= $search ? 'No patients match your search.' : 'No patients yet. Add the first one!' ?></p>
          </div>
        <?php else: ?>
          <?php foreach ($grouped as $letter => $group): ?>
            <div class="cabinet-label">
              <div class="cabinet-letter"><?= $letter ?></div>
              Cabinet <?= $letter ?>
            </div>
            <?php foreach ($group as $p): ?>
              <?php
                $initials = '';
                foreach (explode(' ', $p['full_name']) as $w) $initials .= strtoupper($w[0] ?? '');
                $initials = substr($initials, 0, 2);
                $isActive = $selected && $selected['id'] == $p['id'];
              ?>
              <a href="directory.php?id=<?= $p['id'] ?><?= $search ? '&q='.urlencode($search) : '' ?>"
                 class="patient-row <?= $isActive ? 'active' : '' ?>">
                <div class="avatar">
                  <?php if ($p['profile_photo_path']): ?>
                    <img src="/abccare-php/<?= htmlspecialchars($p['profile_photo_path']) ?>" alt="" />
                  <?php else: ?>
                    <?= $initials ?>
                  <?php endif; ?>
                </div>
                <div class="patient-info">
                  <div class="patient-name"><?= htmlspecialchars($p['full_name']) ?></div>
                  <div class="patient-meta">
                    <?= $p['contact_number'] ? '📞 '.htmlspecialchars($p['contact_number']) : '' ?>
                    <?= $p['date_of_birth'] ? ' · '.htmlspecialchars($p['date_of_birth']) : '' ?>
                  </div>
                </div>
              </a>
            <?php endforeach; ?>
          <?php endforeach; ?>
        <?php endif; ?>
      </div>
    </div>

    <!-- Detail panel -->
    <?php if ($selected): ?>
    <div class="detail-panel">
      <div class="detail-header">
        <?php
          $initials = '';
          foreach (explode(' ', $selected['full_name']) as $w) $initials .= strtoupper($w[0] ?? '');
          $initials = substr($initials, 0, 2);
        ?>
        <div class="avatar">
          <?php if ($selected['profile_photo_path']): ?>
            <img src="/abccare-php/<?= htmlspecialchars($selected['profile_photo_path']) ?>" alt="" />
          <?php else: ?>
            <?= $initials ?>
          <?php endif; ?>
        </div>
        <div>
          <h2><?= htmlspecialchars($selected['full_name']) ?></h2>
          <p>
            <?= $selected['gender'] ?: '' ?>
            <?= $selected['age'] ? ' · '.$selected['age'].' yrs' : '' ?>
            <?= $selected['civil_status'] ? ' · '.$selected['civil_status'] : '' ?>
          </p>
        </div>
        <a href="directory.php<?= $search ? '?q='.urlencode($search) : '' ?>" class="close-btn">✕</a>
      </div>

      <?php if ($user['role'] === 'staff'): ?>
      <div class="detail-actions">
        <a href="edit.php?id=<?= $selected['id'] ?>" class="btn btn-gray">✏️ Edit Patient</a>
        <form method="POST" style="display:inline" onsubmit="return confirm('Delete <?= htmlspecialchars($selected['full_name']) ?>? This cannot be undone.')">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="patient_id" value="<?= $selected['id'] ?>" />
          <button type="submit" class="btn btn-red">🗑 Delete</button>
        </form>
      </div>
      <?php endif; ?>

      <div class="detail-body">
        <div class="field-grid">
          <div class="field">
            <div class="flabel">Patient Name</div>
            <div class="fvalue"><?= htmlspecialchars($selected['full_name']) ?></div>
          </div>
          <div class="field">
            <div class="flabel">Age / Gender</div>
            <div class="fvalue"><?= ($selected['age'] ?: '—') . ' / ' . ($selected['gender'] ?: '—') ?></div>
          </div>
          <div class="field">
            <div class="flabel">Date of Birth</div>
            <div class="fvalue"><?= $selected['date_of_birth'] ? date('M d, Y', strtotime($selected['date_of_birth'])) : '—' ?></div>
          </div>
          <div class="field">
            <div class="flabel">Civil Status</div>
            <div class="fvalue"><?= htmlspecialchars($selected['civil_status'] ?: '—') ?></div>
          </div>
          <div class="field">
            <div class="flabel">Contact Number</div>
            <div class="fvalue"><?= htmlspecialchars($selected['contact_number'] ?: '—') ?></div>
          </div>
          <div class="field">
            <div class="flabel">Occupation</div>
            <div class="fvalue"><?= htmlspecialchars($selected['occupation'] ?: '—') ?></div>
          </div>
          <div class="field full">
            <div class="flabel">Address</div>
            <div class="fvalue"><?= htmlspecialchars($selected['address'] ?: '—') ?></div>
          </div>
          <div class="field full">
            <div class="flabel">Referred By</div>
            <div class="fvalue"><?= htmlspecialchars($selected['referred_by'] ?: '—') ?></div>
          </div>
        </div>
      </div>
    </div>
    <?php endif; ?>

  </div><!-- .main -->
</div><!-- .layout -->

<!-- Add Patient Modal -->
<div class="modal-overlay" id="addModal">
  <div class="modal">
    <h2>New Patient</h2>
    <form method="POST">
      <input type="hidden" name="action" value="add" />
      <label>Patient Name *</label>
      <input type="text" name="full_name" placeholder="Full name" required />
      <div class="modal-grid">
        <div>
          <label>Age</label>
          <input type="number" name="age" min="0" max="150" />
        </div>
        <div>
          <label>Gender</label>
          <select name="gender">
            <option value="">Select</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div>
          <label>Date of Birth</label>
          <input type="date" name="date_of_birth" />
        </div>
        <div>
          <label>Civil Status</label>
          <select name="civil_status">
            <option value="">Select</option>
            <option>Single</option><option>Married</option><option>Widowed</option><option>Separated</option>
          </select>
        </div>
      </div>
      <label>Contact Number</label>
      <input type="text" name="contact_number" placeholder="09XX-XXX-XXXX" />
      <label>Address</label>
      <input type="text" name="address" />
      <div class="modal-grid">
        <div>
          <label>Occupation</label>
          <input type="text" name="occupation" />
        </div>
        <div>
          <label>Referred By</label>
          <input type="text" name="referred_by" />
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-gray" onclick="document.getElementById('addModal').classList.remove('open')">Cancel</button>
        <button type="submit" class="btn btn-green">Add Patient</button>
      </div>
    </form>
  </div>
</div>

<script>
// Close modal on backdrop click
document.getElementById('addModal').addEventListener('click', function(e) {
  if (e.target === this) this.classList.remove('open');
});
// Auto-calculate age from DOB
document.querySelector('input[name="date_of_birth"]')?.addEventListener('change', function() {
  if (!this.value) return;
  const age = Math.floor((Date.now() - new Date(this.value)) / (365.25*24*60*60*1000));
  document.querySelector('input[name="age"]').value = age;
});
</script>
</body>
</html>
