/**
 * Script: check-refund-sync.js
 * Mục đích: Check trạng thái refund requests trong DB và phát hiện sự không đồng bộ
 * Chạy: node scripts/check-refund-sync.js
 */

require('dotenv').config();
const { Client } = require('pg');

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ DATABASE_URL không tìm thấy trong .env');
  process.exit(1);
}

// Strip sslmode/channel_binding params để tự handle SSL qua config
const cleanUrl = DB_URL.split('?')[0];

async function main() {
  const client = new Client({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔌 Đang kết nối Neon DB...');
    await client.connect();
    console.log('✅ Kết nối thành công!\n');

    // 1. Lấy tất cả refund requests gần đây
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 DANH SÁCH REFUND REQUESTS (20 mới nhất)');
    console.log('═══════════════════════════════════════════════════════');

    const refundResult = await client.query(`
      SELECT 
        rr.id               AS refund_id,
        rr.status           AS refund_status,
        rr.created_at       AS refund_created,
        rr.processed_at,
        rr.enrollment_id,
        rr.course_id,
        rr.student_id,
        rr.amount,
        rr.bank_name,
        rr.bank_account_number,
        e.is_active         AS enrollment_active,
        e.revoked_at,
        e.revoke_reason,
        c.title             AS course_title,
        u.email             AS student_email
      FROM refund_requests rr
      JOIN enrollments e ON e.id = rr.enrollment_id
      JOIN courses c      ON c.id = rr.course_id
      JOIN users u        ON u.id = rr.student_id
      ORDER BY rr.created_at DESC
      LIMIT 20
    `);

    if (refundResult.rows.length === 0) {
      console.log('Không có refund request nào trong DB.');
    } else {
      refundResult.rows.forEach((row) => {
        const statusIcon = row.refund_status === 'PENDING' ? '🟡' 
                        : row.refund_status === 'APPROVED' ? '🟢' 
                        : '🔴';
        const activeIcon = row.enrollment_active ? '✅ active' : '❌ revoked';

        console.log(`\n[Refund #${row.refund_id}]`);
        console.log(`  Khóa học    : ${row.course_title}`);
        console.log(`  Student     : ${row.student_email} (ID: ${row.student_id})`);
        console.log(`  Số tiền     : ${Number(row.amount).toLocaleString('vi-VN')}đ`);
        console.log(`  Refund status: ${statusIcon} ${row.refund_status}`);
        console.log(`  Enrollment  : #${row.enrollment_id} → ${activeIcon}`);
        console.log(`  Gửi lúc     : ${row.refund_created}`);
        console.log(`  Xử lý lúc   : ${row.processed_at || 'Chưa xử lý'}`);
      });
    }

    // 2. Phát hiện sự không đồng bộ: APPROVED refund nhưng enrollment vẫn active
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  PHÁT HIỆN KHÔNG ĐỒNG BỘ: APPROVED nhưng enrollment vẫn active');
    console.log('═══════════════════════════════════════════════════════');

    const desyncApproved = await client.query(`
      SELECT 
        rr.id               AS refund_id,
        rr.status           AS refund_status,
        e.id                AS enrollment_id,
        e.is_active,
        e.revoked_at,
        c.title             AS course_title,
        u.email             AS student_email
      FROM refund_requests rr
      JOIN enrollments e ON e.id = rr.enrollment_id
      JOIN courses c      ON c.id = rr.course_id
      JOIN users u        ON u.id = rr.student_id
      WHERE rr.status = 'APPROVED'
        AND e.is_active = true
    `);

    if (desyncApproved.rows.length === 0) {
      console.log('✅ Không có sự không đồng bộ loại này.');
    } else {
      console.log(`❌ Tìm thấy ${desyncApproved.rows.length} bản ghi không đồng bộ:`);
      desyncApproved.rows.forEach((row) => {
        console.log(`  → Refund #${row.refund_id} | Enrollment #${row.enrollment_id} | ${row.course_title} | ${row.student_email}`);
      });
    }

    // 3. Phát hiện: PENDING refund nhưng enrollment bị revoked (không đồng bộ ngược)
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('⚠️  PHÁT HIỆN KHÔNG ĐỒNG BỘ: PENDING nhưng enrollment bị revoked');
    console.log('═══════════════════════════════════════════════════════');

    const desyncPending = await client.query(`
      SELECT 
        rr.id               AS refund_id,
        rr.status           AS refund_status,
        e.id                AS enrollment_id,
        e.is_active,
        e.revoked_at,
        c.title             AS course_title,
        u.email             AS student_email
      FROM refund_requests rr
      JOIN enrollments e ON e.id = rr.enrollment_id
      JOIN courses c      ON c.id = rr.course_id
      JOIN users u        ON u.id = rr.student_id
      WHERE rr.status = 'PENDING'
        AND e.is_active = false
    `);

    if (desyncPending.rows.length === 0) {
      console.log('✅ Không có sự không đồng bộ loại này.');
    } else {
      console.log(`❌ Tìm thấy ${desyncPending.rows.length} bản ghi:`);
      desyncPending.rows.forEach((row) => {
        console.log(`  → Refund #${row.refund_id} | Enrollment #${row.enrollment_id} | ${row.course_title} | ${row.student_email}`);
      });
    }

    // 4. Tổng hợp thống kê
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 THỐNG KÊ TỔNG HỢP');
    console.log('═══════════════════════════════════════════════════════');

    const stats = await client.query(`
      SELECT 
        status,
        COUNT(*) AS count
      FROM refund_requests
      GROUP BY status
      ORDER BY status
    `);

    stats.rows.forEach((row) => {
      const icon = row.status === 'PENDING' ? '🟡' : row.status === 'APPROVED' ? '🟢' : '🔴';
      console.log(`  ${icon} ${row.status}: ${row.count} yêu cầu`);
    });

    // 5. Check orders bị stuck ở PENDING mặc dù đã có enrollment
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📋 ORDERS BỊ STUCK PENDING (có enrollment nhưng order vẫn PENDING)');
    console.log('═══════════════════════════════════════════════════════');

    const stuckOrders = await client.query(`
      SELECT 
        o.id          AS order_id,
        o.order_number,
        o.status      AS order_status,
        o.created_at,
        o.total_amount,
        u.email       AS student_email,
        COUNT(e.id)   AS enrollment_count
      FROM orders o
      JOIN users u ON u.id = o.student_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN enrollments e ON e.order_item_id = oi.id
      WHERE o.status = 'PENDING'
      GROUP BY o.id, o.order_number, o.status, o.created_at, o.total_amount, u.email
      HAVING COUNT(e.id) > 0
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    if (stuckOrders.rows.length === 0) {
      console.log('✅ Không có orders bị stuck.');
    } else {
      console.log(`⚠️ Tìm thấy ${stuckOrders.rows.length} orders bị stuck:`);
      stuckOrders.rows.forEach((row) => {
        console.log(`  → Order #${row.order_number} (ID: ${row.order_id}) | ${row.student_email} | ${Number(row.total_amount).toLocaleString('vi-VN')}đ | enrollments: ${row.enrollment_count}`);
      });
    }

  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Đã đóng kết nối DB.');
  }
}

main();
