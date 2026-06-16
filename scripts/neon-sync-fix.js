/**
 * Script: neon-sync-fix.js
 * Mục đích: Check và fix dữ liệu refund/enrollment không đồng bộ qua Neon HTTP API
 * 
 * Chạy: node scripts/neon-sync-fix.js
 * Hoặc để chỉ xem (không sửa): node scripts/neon-sync-fix.js --dry-run
 */

require('dotenv').config();
const https = require('https');

// ────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────
const RAW_DB_URL = process.env.DATABASE_URL || '';
if (!RAW_DB_URL) {
  console.error('❌ DATABASE_URL không tìm thấy trong .env');
  process.exit(1);
}

// Lấy host từ DATABASE_URL để build Neon HTTP endpoint
// Format: postgresql://user:pass@<host>/db?...
const hostMatch = RAW_DB_URL.match(/@([^/]+)\//);
const NEON_HOST = hostMatch ? hostMatch[1] : null;
if (!NEON_HOST) {
  console.error('❌ Không parse được host từ DATABASE_URL');
  process.exit(1);
}

// Dùng connection string không có query params cho header
const NEON_CONN_STR = RAW_DB_URL.split('?')[0];
const NEON_SQL_URL = `https://${NEON_HOST}/sql`;

const DRY_RUN = process.argv.includes('--dry-run');

console.log(`🔗 Neon endpoint : ${NEON_SQL_URL}`);
console.log(`🔍 Mode          : ${DRY_RUN ? 'DRY RUN (chỉ xem, không sửa)' : 'LIVE (sẽ cập nhật DB)'}`);
console.log('');

// ────────────────────────────────────────────────────────
// Helper: query qua Neon HTTP API
// ────────────────────────────────────────────────────────
function queryNeon(sql, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql, params });
    const url = new URL(NEON_SQL_URL);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Neon-Connection-String': NEON_CONN_STR,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.message && !parsed.rows) {
            reject(new Error(`Neon API Error: ${parsed.message}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('JSON parse error: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timeout (15s)'));
    });
    req.write(body);
    req.end();
  });
}

// ────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────
async function main() {
  // ── Test connection ──────────────────────────────────
  try {
    const test = await queryNeon('SELECT 1 as ok');
    if (test.rows && test.rows[0].ok == 1) {
      console.log('✅ Kết nối Neon DB thành công!\n');
    }
  } catch (err) {
    console.error('❌ Kết nối thất bại:', err.message);
    process.exit(1);
  }

  // ── 1. Xem tất cả refund requests ───────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 DANH SÁCH REFUND REQUESTS (30 mới nhất)');
  console.log('═══════════════════════════════════════════════════════');

  const allRefunds = await queryNeon(`
    SELECT 
      rr.id           AS refund_id,
      rr.status       AS refund_status,
      rr.created_at,
      rr.processed_at,
      rr.enrollment_id,
      rr.amount,
      e.is_active     AS enrollment_active,
      e.revoked_at,
      c.title         AS course_title,
      u.email         AS student_email
    FROM refund_requests rr
    JOIN enrollments e ON e.id = rr.enrollment_id
    JOIN courses c      ON c.id = rr.course_id
    JOIN users u        ON u.id = rr.student_id
    ORDER BY rr.created_at DESC
    LIMIT 30
  `);

  const refundRows = allRefunds.rows || [];
  console.log(`Tổng: ${refundRows.length} bản ghi\n`);

  refundRows.forEach((r) => {
    const icon   = r.refund_status === 'PENDING'  ? '🟡'
                 : r.refund_status === 'APPROVED' ? '🟢' : '🔴';
    const active = r.enrollment_active ? '✅ active' : '❌ revoked';
    const desync = (r.refund_status === 'APPROVED' && r.enrollment_active) ? ' ⚠️ DESYNC!'
                 : (r.refund_status === 'PENDING' && !r.enrollment_active) ? ' ⚠️ DESYNC!'
                 : '';
    console.log(`[Refund #${r.refund_id}] ${icon} ${r.refund_status}${desync}`);
    console.log(`  Course    : ${String(r.course_title).substring(0, 55)}`);
    console.log(`  Student   : ${r.student_email}`);
    console.log(`  Amount    : ${Number(r.amount).toLocaleString('vi-VN')}đ`);
    console.log(`  Enrollment: #${r.enrollment_id} → ${active}`);
    console.log(`  Created   : ${String(r.created_at).substring(0, 19)}`);
    console.log(`  Processed : ${r.processed_at ? String(r.processed_at).substring(0, 19) : '–'}`);
    console.log('');
  });

  // ── 2. Phát hiện DESYNC: APPROVED nhưng enrollment còn active ──
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 PHÁT HIỆN KHÔNG ĐỒNG BỘ: APPROVED → enrollment còn active');
  console.log('═══════════════════════════════════════════════════════');

  const desyncApproved = await queryNeon(`
    SELECT rr.id AS refund_id, rr.status, e.id AS enrollment_id, e.is_active, c.title, u.email
    FROM refund_requests rr
    JOIN enrollments e ON e.id = rr.enrollment_id
    JOIN courses c      ON c.id = rr.course_id
    JOIN users u        ON u.id = rr.student_id
    WHERE rr.status = 'APPROVED' AND e.is_active = true
  `);

  const approvedDesync = desyncApproved.rows || [];
  if (approvedDesync.length === 0) {
    console.log('✅ Không có sự không đồng bộ loại này.\n');
  } else {
    console.log(`❌ Tìm thấy ${approvedDesync.length} bản ghi cần sửa:\n`);
    for (const r of approvedDesync) {
      console.log(`  → Refund #${r.refund_id} | Enrollment #${r.enrollment_id}`);
      console.log(`    Course : ${r.title}`);
      console.log(`    Student: ${r.email}`);

      if (!DRY_RUN) {
        console.log(`    🔧 Đang revoke enrollment #${r.enrollment_id}...`);
        await queryNeon(`
          UPDATE enrollments
          SET is_active = false,
              revoked_at = NOW(),
              revoke_reason = 'REFUNDED: Admin sync fix - refund already approved'
          WHERE id = $1
        `, [r.enrollment_id]);
        console.log(`    ✅ Đã revoke enrollment #${r.enrollment_id}\n`);
      } else {
        console.log(`    [DRY RUN] Sẽ revoke enrollment #${r.enrollment_id}\n`);
      }
    }
  }

  // ── 3. DESYNC ngược: enrollment bị revoke nhưng refund vẫn PENDING ──
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 PHÁT HIỆN KHÔNG ĐỒNG BỘ: PENDING → enrollment đã bị revoke');
  console.log('═══════════════════════════════════════════════════════');

  const desyncPending = await queryNeon(`
    SELECT rr.id AS refund_id, rr.status, e.id AS enrollment_id, e.is_active, e.revoke_reason, c.title, u.email
    FROM refund_requests rr
    JOIN enrollments e ON e.id = rr.enrollment_id
    JOIN courses c      ON c.id = rr.course_id
    JOIN users u        ON u.id = rr.student_id
    WHERE rr.status = 'PENDING' AND e.is_active = false
  `);

  const pendingDesync = desyncPending.rows || [];
  if (pendingDesync.length === 0) {
    console.log('✅ Không có sự không đồng bộ loại này.\n');
  } else {
    console.log(`⚠️ Tìm thấy ${pendingDesync.length} bản ghi bất thường (không tự động sửa):\n`);
    pendingDesync.forEach((r) => {
      console.log(`  → Refund #${r.refund_id} | Enrollment #${r.enrollment_id}`);
      console.log(`    Course     : ${r.title}`);
      console.log(`    Student    : ${r.email}`);
      console.log(`    Revoke why : ${r.revoke_reason || 'N/A'}`);
      console.log('');
    });
  }

  // ── 4. Thống kê ───────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 THỐNG KÊ');
  console.log('═══════════════════════════════════════════════════════');

  const [statRefund, statOrder, statEnroll] = await Promise.all([
    queryNeon(`SELECT status, COUNT(*) AS count FROM refund_requests GROUP BY status ORDER BY status`),
    queryNeon(`SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC`),
    queryNeon(`SELECT is_active, COUNT(*) AS count FROM enrollments GROUP BY is_active`),
  ]);

  console.log('\nRefund requests:');
  (statRefund.rows || []).forEach((r) => {
    const icon = r.status === 'PENDING' ? '🟡' : r.status === 'APPROVED' ? '🟢' : '🔴';
    console.log(`  ${icon} ${r.status}: ${r.count}`);
  });

  console.log('\nOrders:');
  (statOrder.rows || []).forEach((r) => {
    console.log(`  • ${r.status}: ${r.count}`);
  });

  console.log('\nEnrollments:');
  (statEnroll.rows || []).forEach((r) => {
    const label = r.is_active ? '✅ active' : '❌ revoked/inactive';
    console.log(`  ${label}: ${r.count}`);
  });

  console.log('\n═══════════════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('ℹ️  DRY RUN hoàn tất. Chạy lại không có --dry-run để áp dụng fix.');
  } else {
    console.log('✅ Kiểm tra và đồng bộ dữ liệu hoàn tất!');
  }
  console.log('═══════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('\n❌ Lỗi không mong muốn:', err.message);
  process.exit(1);
});
