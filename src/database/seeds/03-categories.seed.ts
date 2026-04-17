import { DataSource } from 'typeorm';
import { Category } from '../entities/category.entity';

interface CategorySeedData {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  children?: {
    name: string;
    slug: string;
    description: string;
    sortOrder: number;
  }[];
}

const CATEGORY_DATA: CategorySeedData[] = [
  {
    name: 'Lập trình',
    slug: 'lap-trinh',
    description: 'Các khóa học về lập trình và phát triển phần mềm',
    sortOrder: 1,
    children: [
      {
        name: 'Web Frontend',
        slug: 'web-frontend',
        description: 'HTML, CSS, JavaScript, React, Vue',
        sortOrder: 1,
      },
      {
        name: 'Web Backend',
        slug: 'web-backend',
        description: 'Node.js, NestJS, Django, Spring Boot',
        sortOrder: 2,
      },
      {
        name: 'Mobile (iOS & Android)',
        slug: 'mobile',
        description: 'React Native, Flutter, Swift, Kotlin',
        sortOrder: 3,
      },
      {
        name: 'Trí tuệ nhân tạo & ML',
        slug: 'ai-machine-learning',
        description: 'Python AI, TensorFlow, Machine Learning',
        sortOrder: 4,
      },
      {
        name: 'Cơ sở dữ liệu',
        slug: 'co-so-du-lieu',
        description: 'SQL, PostgreSQL, MongoDB, Redis',
        sortOrder: 5,
      },
      {
        name: 'DevOps & Cloud',
        slug: 'devops-cloud',
        description: 'Docker, Kubernetes, AWS, CI/CD',
        sortOrder: 6,
      },
      {
        name: 'Bảo mật',
        slug: 'bao-mat',
        description: 'Cybersecurity, Ethical Hacking, bảo mật web',
        sortOrder: 7,
      },
    ],
  },
  {
    name: 'Kinh doanh',
    slug: 'kinh-doanh',
    description: 'Kỹ năng kinh doanh và khởi nghiệp',
    sortOrder: 2,
    children: [
      {
        name: 'Khởi nghiệp',
        slug: 'khoi-nghiep',
        description: 'Startup, gọi vốn, mô hình kinh doanh',
        sortOrder: 1,
      },
      {
        name: 'Quản lý & Lãnh đạo',
        slug: 'quan-ly-lanh-dao',
        description: 'Kỹ năng quản lý, leadership',
        sortOrder: 2,
      },
      {
        name: 'Bán hàng',
        slug: 'ban-hang',
        description: 'Kỹ thuật bán hàng, thuyết phục khách hàng',
        sortOrder: 3,
      },
      {
        name: 'Chiến lược kinh doanh',
        slug: 'chien-luoc-kinh-doanh',
        description: 'Phân tích kinh doanh, chiến lược cạnh tranh',
        sortOrder: 4,
      },
    ],
  },
  {
    name: 'Tài chính - Kế toán',
    slug: 'tai-chinh-ke-toan',
    description: 'Tài chính cá nhân, đầu tư và kế toán',
    sortOrder: 3,
    children: [
      {
        name: 'Tài chính cá nhân',
        slug: 'tai-chinh-ca-nhan',
        description: 'Quản lý tiền, tiết kiệm, đầu tư cơ bản',
        sortOrder: 1,
      },
      {
        name: 'Chứng khoán',
        slug: 'chung-khoan',
        description: 'Phân tích cổ phiếu, đầu tư chứng khoán',
        sortOrder: 2,
      },
      {
        name: 'Kế toán',
        slug: 'ke-toan',
        description: 'Kế toán doanh nghiệp, phần mềm kế toán',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Thiết kế',
    slug: 'thiet-ke',
    description: 'UI/UX, đồ họa và thiết kế sáng tạo',
    sortOrder: 4,
    children: [
      {
        name: 'UI/UX Design',
        slug: 'ui-ux-design',
        description: 'Thiết kế giao diện người dùng, Figma',
        sortOrder: 1,
      },
      {
        name: 'Đồ họa',
        slug: 'do-hoa',
        description: 'Photoshop, Illustrator, thiết kế logo',
        sortOrder: 2,
      },
      {
        name: '3D & Animation',
        slug: '3d-animation',
        description: 'Blender, Maya, animation',
        sortOrder: 3,
      },
      {
        name: 'Motion Graphics',
        slug: 'motion-graphics',
        description: 'After Effects, motion design',
        sortOrder: 4,
      },
    ],
  },
  {
    name: 'Marketing',
    slug: 'marketing',
    description: 'Digital marketing, SEO, quảng cáo',
    sortOrder: 5,
    children: [
      {
        name: 'SEO & SEM',
        slug: 'seo-sem',
        description: 'Tối ưu hóa tìm kiếm, Google Ads',
        sortOrder: 1,
      },
      {
        name: 'Social Media',
        slug: 'social-media',
        description: 'Facebook, TikTok, Instagram marketing',
        sortOrder: 2,
      },
      {
        name: 'Content Marketing',
        slug: 'content-marketing',
        description: 'Viết content, storytelling, copywriting',
        sortOrder: 3,
      },
      {
        name: 'Email Marketing',
        slug: 'email-marketing',
        description: 'Xây dựng danh sách, automation email',
        sortOrder: 4,
      },
    ],
  },
  {
    name: 'Phát triển bản thân',
    slug: 'phat-trien-ban-than',
    description: 'Kỹ năng mềm, tư duy và năng suất',
    sortOrder: 6,
    children: [
      {
        name: 'Kỹ năng giao tiếp',
        slug: 'ky-nang-giao-tiep',
        description: 'Thuyết trình, đàm phán, giao tiếp hiệu quả',
        sortOrder: 1,
      },
      {
        name: 'Năng suất',
        slug: 'nang-suat',
        description: 'Quản lý thời gian, làm việc thông minh',
        sortOrder: 2,
      },
      {
        name: 'Tư duy sáng tạo',
        slug: 'tu-duy-sang-tao',
        description: 'Design thinking, giải quyết vấn đề',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Sức khỏe',
    slug: 'suc-khoe',
    description: 'Thể dục, yoga và sức khỏe tinh thần',
    sortOrder: 7,
    children: [
      {
        name: 'Yoga',
        slug: 'yoga',
        description: 'Yoga cơ bản đến nâng cao',
        sortOrder: 1,
      },
      {
        name: 'Thể dục',
        slug: 'the-duc',
        description: 'Gym, tập luyện tại nhà',
        sortOrder: 2,
      },
      {
        name: 'Dinh dưỡng',
        slug: 'dinh-duong',
        description: 'Ăn uống lành mạnh, giảm cân khoa học',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Âm nhạc',
    slug: 'am-nhac',
    description: 'Nhạc cụ, sản xuất âm nhạc',
    sortOrder: 8,
    children: [
      {
        name: 'Guitar',
        slug: 'guitar',
        description: 'Guitar acoustic và điện',
        sortOrder: 1,
      },
      {
        name: 'Piano',
        slug: 'piano',
        description: 'Piano từ cơ bản đến nâng cao',
        sortOrder: 2,
      },
      {
        name: 'Sản xuất nhạc',
        slug: 'san-xuat-nhac',
        description: 'FL Studio, Ableton, beat making',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Nhiếp ảnh & Video',
    slug: 'nhiep-anh-video',
    description: 'Nhiếp ảnh, quay phim và chỉnh sửa',
    sortOrder: 9,
    children: [
      {
        name: 'Nhiếp ảnh',
        slug: 'nhiep-anh',
        description: 'Kỹ thuật chụp ảnh, ánh sáng, bố cục',
        sortOrder: 1,
      },
      {
        name: 'Quay phim',
        slug: 'quay-phim',
        description: 'Kỹ thuật quay phim, camera operator',
        sortOrder: 2,
      },
      {
        name: 'Chỉnh sửa video',
        slug: 'chinh-sua-video',
        description: 'Premiere Pro, DaVinci Resolve',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Ngôn ngữ',
    slug: 'ngon-ngu',
    description: 'Học tiếng Anh, Nhật, Hàn và các ngôn ngữ khác',
    sortOrder: 10,
    children: [
      {
        name: 'Tiếng Anh',
        slug: 'tieng-anh',
        description: 'IELTS, TOEIC, giao tiếp tiếng Anh',
        sortOrder: 1,
      },
      {
        name: 'Tiếng Nhật',
        slug: 'tieng-nhat',
        description: 'JLPT N5 đến N1, giao tiếp tiếng Nhật',
        sortOrder: 2,
      },
      {
        name: 'Tiếng Hàn',
        slug: 'tieng-han',
        description: 'TOPIK, hội thoại tiếng Hàn',
        sortOrder: 3,
      },
    ],
  },
];

export async function seedCategories(dataSource: DataSource) {
  const categoryRepo = dataSource.getRepository(Category);

  for (const item of CATEGORY_DATA) {
    // Tạo hoặc lấy root category
    let root = await categoryRepo.findOne({ where: { slug: item.slug } });

    if (!root) {
      root = await categoryRepo.save(
        categoryRepo.create({
          name: item.name,
          slug: item.slug,
          description: item.description,
          parentId: null,
          sortOrder: item.sortOrder,
          isActive: true,
        }),
      );
      console.log(`  Tạo category: ${root.name}`);
    } else {
      console.log(`  Category đã tồn tại: ${root.name}`);
    }

    // Tạo sub-categories
    for (const child of item.children ?? []) {
      const existingChild = await categoryRepo.findOne({
        where: { slug: child.slug },
      });

      if (!existingChild) {
        await categoryRepo.save(
          categoryRepo.create({
            name: child.name,
            slug: child.slug,
            description: child.description,
            parentId: root.id,
            sortOrder: child.sortOrder,
            isActive: true,
          }),
        );
        console.log(`    └─ Tạo sub-category: ${child.name}`);
      } else {
        console.log(`    └─ Sub-category đã tồn tại: ${child.name}`);
      }
    }
  }
}
