/**
 * Script: query-neon-http.js
 * Query Neon DB qua HTTP API (bypass TCP block)
 * Chạy: node scripts/query-neon-http.js
 */

require('dotenv').config();
const https = require('https');

const NEON_CONN = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.split('?')[0]
  : null;

const NEON_ENDPOINT = 'https://ep-late-dream-a4cz3e08-pooler.us-east-1.aws.neon.tech/sql';

if (!NEON_CONN) {
  console.error('❌ DATABASE_URL không tìm thấy trong .env');
  process.exit(1);
}

function queryNeon(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const url = new URL(NEON_ENDPOINT);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Neon-Connection-String': NEON_CONN,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Parse error: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('🔌 Kết nối Neon DB qua HTTP API...\n');

  // ═══════════════════════════════════════════════════════
  // 1. REFUND REQUESTS (20 mới nhất)
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 REFUND REQUESTS (20 mới nhất)');
  console.log('═══════════════════════════════════════════════════════');

  const refundResult = await queryNeon(`
    SELECT 
      rr.id,
      rr.status AS refund_status,
      rr.created_at,
      rr.processed_at,
      rr.enrollment_id,
      rr.course_id,
      rr.student_id,
      rr.amount,
      e.is_active AS enrollment_active,
      e.revoked_at,
      c.title AS course_title
    FROM refund_requests rr
    JOIN enrollments e ON e.id = rr.enrollment_id
    JOIN courses c ON c.id = rr.course_id
    ORDER BY rr.created_at DESC
    LIMIT 20
  `);

  if (refundResult.error || refundResult.message) {
    console.error('❌ Lỗi query:', refundResult.message || refundResult.error);
  } else {
    const rows = refundResult.rows || [];
    console.log(`Tổng: ${rows.length} bản ghi\n`);
    rows.forEach((r) => {
      const statusIcon = r.refund_status === 'PENDING' ? '🟡' 
                       : r.refund_status === 'APPROVED' ? '🟢' 
                       : '🔴';
      const activeIcon = r.enrollment_active ? '✅ active' : '❌ revoked';
      console.log(`[Refund #${r.id}] ${statusIcon} ${r.refund_status}`);
      console.log(`  Course      : ${String(r.course_title).substring(0, 60)}`);
      console.log(`  Enrollment  : #${r.enrollment_id} → ${activeIcon}`);
      console.log(`  Amount      : ${Number(r.amount).toLocaleString('vi-VN')}đ`);
      console.log(`  Created     : ${String(r.created_at).substring(0, 19)}`);
      console.log(`  Processed   : ${r.processed_at ? String(r.processed_at).substring(0, 19) : 'Chưa xử lý'}`);
      console.log('');
    });
  }

  // ═══════════════════════════════════════════════════════
  // 2. PHÁT HIỆN KHÔNG ĐỒNG BỘ: APPROVED nhưng enrollment vẫn active
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('⚠️  DESYNC: APPROVED nhưng enrollment vẫn active');
  console.log('═══════════════════════════════════════════════════════');

  const desync1 = await queryNeon(`
    SELECT rr.id AS refund_id, rr.status, e.id AS enrollment_id, e.is_active, c.title AS course_title
    FROM refund_requests rr
    JOIN enrollments e ON e.id = rr.enrollment_id
    JOIN courses c ON c.id = rr.course_id
    WHERE rr.status = 'APPROVED' AND e.is_active = true
  `);

  if (!desync1.rows || desync1.rows.length === 0) {
    console.log('✅ Không có sự không đồng bộ loại này.\n');
  } else {
    console.log(`❌ Tìm thấy ${desync1.rows.length} bản ghi CẦN SỬA:`);
    desync1.rows.forEach((r) => {
      console.log(`  → Refund #${r.refund_id} | Enrollment #${r.enrollment_id} | ${r.course_title}`);
    });
    console.log('');
  }

  // ═══════════════════════════════════════════════════════
  // 3. THỐNG KÊ THEO STATUS
  // ═══════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 THỐNG KÊ REFUND STATUS');
  console.log('═══════════════════════════════════════════════════════');

  const stats = await queryNeon(`
    SELECT status, COUNT(*) AS count
    FROM refund_requests
    GROUP BY status
    ORDER BY status
  `);

  (stats.rows || []).forEach((r) => {
    const icon = r.status === 'PENDING' ? '🟡' : r.status === 'APPROVED' ? '🟢' : '🔴';
    console.log(`  ${icon} ${r.status}: ${r.count} yêu cầu`);
  });

  // ═══════════════════════════════════════════════════════
  // 4. CHECK ORDERS BỊ STUCK
  // ═══════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 ORDERS BỊ STUCK PENDING (có enrollment nhưng order PENDING)');
  console.log('═══════════════════════════════════════════════════════');

  const stuckOrders = await queryNeon(`
    SELECT 
      o.id AS order_id,
      o.order_number,
      o.status AS order_status,
      o.created_at,
      o.total_amount,
      COUNT(e.id) AS enrollment_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN enrollments e ON e.order_item_id = oi.id
    WHERE o.status = 'PENDING'
    GROUP BY o.id, o.order_number, o.status, o.created_at, o.total_amount
    HAVING COUNT(e.id) > 0
    ORDER BY o.created_at DESC
    LIMIT 10
  `);

  if (!stuckOrders.rows || stuckOrders.rows.length === 0) {
    console.log('✅ Không có orders bị stuck.\n');
  } else {
    console.log(`⚠️ Tìm thấy ${stuckOrders.rows.length} orders bị stuck:`);
    stuckOrders.rows.forEach((r) => {
      console.log(`  → Order #${r.order_number} (ID: ${r.order_id}) | ${Number(r.total_amount).toLocaleString('vi-VN')}đ | enrollments: ${r.enrollment_count}`);
    });
    console.log('');
  }

  console.log('\n✅ Kiểm tra hoàn tất!');
}

main().catch((err) => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
