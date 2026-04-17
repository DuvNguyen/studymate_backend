import { DataSource, IsNull } from 'typeorm';
import { Course, CourseStatus, CourseLevel } from '../entities/course.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';

export async function seedBulkCourses(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const categoryRepo = dataSource.getRepository(Category);
  const userRepo = dataSource.getRepository(User);

  // Retrieve an instructor (ID 62 if exists, or fallback)
  let instructor = await userRepo.findOne({ where: { id: 62 } });
  if (!instructor) {
    instructor = await userRepo.findOne({
      where: { role: { roleName: 'INSTRUCTOR' } },
      relations: ['role'],
    });
  }

  const allCategories = await categoryRepo.find({
    where: { parentId: IsNull() },
  }); // Hoặc lấy tất cả không phân biệt root. Tùy ý.
  // Thường category con mới được gán. Nên lấy những category có phụ huynh
  const subCategories = await categoryRepo.find({ where: { isActive: true } });
  const validCategories = subCategories.filter((c) => c.parentId !== null);

  if (!instructor || validCategories.length === 0) {
    console.log(
      'Bỏ qua bulk seed: Không đủ dữ liệu instructor hoặc categories.',
    );
    return;
  }

  // 1. Dọn dẹp các khóa học cũ đã seed ngẫu nhiên (dựa trên slug pattern 'c-')
  await courseRepo
    .createQueryBuilder()
    .delete()
    .where('slug LIKE :pattern', { pattern: 'c-%' })
    .execute();
  console.log('Đã dọn dẹp các khóa học bulk seed cũ.');

  // 2. Định nghĩa Mapping dữ liệu theo danh mục cha
  const categoryMap: Record<string, { topics: string[]; images: string[] }> = {
    'lap-trinh': {
      topics: [
        'Fullstack Web với Next.js 15',
        'Python cho Data Science',
        'Lập trình Go cơ bản',
        'Microservices với NestJS',
        'React Native thực chiến',
        'Bảo mật Web nâng cao',
      ],
      images: [
        'https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&q=80',
        'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
        'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80',
      ],
    },
    'kinh-doanh': {
      topics: [
        'Khởi nghiệp Tinh gọn (Lean Startup)',
        'Kỹ năng bộ máy Lãnh đạo',
        'Nghệ thuật Đàm phán triệu đô',
        'Quản trị chuỗi cung ứng',
        'Phát triển mô hình SaaS',
      ],
      images: [
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
      ],
    },
    'tai-chinh-ke-toan': {
      topics: [
        'Đầu tư Chứng khoán từ con số 0',
        'Kế toán Thuế chuyên sâu',
        'Phân tích Báo cáo Tài chính',
        'Tiền điện tử và Blockchain',
      ],
      images: [
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
        'https://images.unsplash.com/photo-1454165833767-027ffea9e77b?w=800&q=80',
      ],
    },
    'thiet-ke': {
      topics: [
        'Thiết kế UI/UX với Figma',
        'Masterclass Adobe Photoshop',
        'Thiết kế 3D bằng Blender',
        'Typography trong Branding',
      ],
      images: [
        'https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?w=800&q=80',
        'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=80',
      ],
    },
    marketing: {
      topics: [
        'SEO Nâng cao (Search Engine Optimization)',
        'Quảng cáo Facebook & Google chuyên sâu',
        'Content Marketing đỉnh cao',
        'Influencer Marketing',
      ],
      images: [
        'https://images.unsplash.com/photo-1557838923-2985c318be48?w=800&q=80',
        'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
      ],
    },
    'phat-trien-ban-than': {
      topics: [
        'Quản lý thời gian hiệu quả',
        'Kỹ năng Giao tiếp tự tin',
        'Tư duy Sáng tạo đột phá',
        'Xây dựng thương hiệu cá nhân',
      ],
      images: [
        'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
      ],
    },
    'suc-khoe': {
      topics: [
        'Yoga phục hồi năng lượng',
        'Gym tại nhà không cần dụng cụ',
        'Chế độ ăn Eat Clean khoa học',
        'Thiền định giảm Stress',
      ],
      images: [
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
      ],
    },
    'am-nhac': {
      topics: [
        'Guitar đệm hát cơ bản',
        'Tự học Piano tại gia',
        'Làm nhạc EDM trên FL Studio',
        'Hát Karaoke như ca sĩ',
      ],
      images: [
        'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80',
        'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&q=80',
      ],
    },
    'nhiep-anh-video': {
      topics: [
        'Nhiếp ảnh Chân dung ngoài trời',
        'Quay phim quảng cáo chuyên nghiệp',
        'Edit video bằng Premiere Pro',
        'Bay Flycam cơ bản',
      ],
      images: [
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80',
        'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80',
      ],
    },
    'ngon-ngu': {
      topics: [
        'Tiếng Anh giao tiếp công sở',
        'Luyện thi JLPT N3 cấp tốc',
        'Tiếng Hàn giao tiếp hàng ngày',
        'Tiếng Trung 4 kỹ năng',
      ],
      images: [
        'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=800&q=80',
        'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
      ],
    },
  };

  const levels = [
    CourseLevel.BEGINNER,
    CourseLevel.INTERMEDIATE,
    CourseLevel.ADVANCED,
  ];
  const prefixes = [
    'Mastering',
    'Cơ bản về',
    'The Complete',
    'Thực hành',
    'Nhập môn',
    'Chuyên sâu',
    'Bí mật của',
    'Học nhanh',
  ];
  const suffixes = [
    'từ Zero đến Hero',
    'cho người mới',
    'Masterclass',
    'thực chiến',
    'trong 30 ngày',
  ];

  const generatedSlugs = new Set();
  const bulkCourses: Partial<Course>[] = [];

  // Lấy list root categories để map
  const rootCategories = await categoryRepo.find({
    where: { parentId: IsNull() },
  });

  for (let i = 0; i < 40; i++) {
    const subCategory =
      validCategories[Math.floor(Math.random() * validCategories.length)];
    const parentCategory = rootCategories.find(
      (rc) => rc.id === subCategory.parentId,
    );

    const config =
      categoryMap[parentCategory?.slug || 'lap-trinh'] ||
      categoryMap['lap-trinh'];
    const topic =
      config.topics[Math.floor(Math.random() * config.topics.length)];
    const image =
      config.images[Math.floor(Math.random() * config.images.length)];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    const title = `${prefix} ${topic} ${suffix} - Khóa ${i + 1}`;
    const slug = `c-${parentCategory?.slug || 'gen'}-${topic.toLowerCase().replace(/\s+/g, '-')}-${i}`;
    if (generatedSlugs.has(slug)) continue;
    generatedSlugs.add(slug);

    const price = Math.floor(Math.random() * 20000) * 100 + 499000;
    const baseOriginal = price + Math.floor(Math.random() * 80) * 10000;
    const hasOriginalPrice = Math.random() > 0.4;

    bulkCourses.push({
      title,
      slug,
      description: `Khóa học chất lượng cao về ${topic}. Chương trình được thiết kế chuẩn quốc tế giúp bạn làm chủ kiến thức chỉ sau một thời gian ngắn.`,
      price: price,
      originalPrice: hasOriginalPrice ? baseOriginal : null,
      language: 'vi',
      level: levels[Math.floor(Math.random() * levels.length)],
      status: CourseStatus.PUBLISHED,
      instructorId: instructor.id,
      categoryId: subCategory.id,
      thumbnailUrl: image,
      totalDuration: Math.floor(Math.random() * 400000) + 12000,
      lessonCount: Math.floor(Math.random() * 60) + 15,
      studentCount: Math.floor(Math.random() * 10000),
      avgRating: parseFloat((Math.random() * 1.5 + 3.5).toFixed(1)), // 3.5 to 5.0
      reviewCount: Math.floor(Math.random() * 2000),
      publishedAt: new Date(
        Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
      ), // Trong 30 ngày gần đây
    });
  }

  // 3. Xử lý Section và Lesson cho từng khóa học
  const sectionRepo = dataSource.getRepository(Section);
  const lessonRepo = dataSource.getRepository(Lesson);

  console.log(
    `Bắt đầu tạo Sections & Lessons cho ${bulkCourses.length} khóa học...`,
  );

  for (const courseData of bulkCourses) {
    const savedCourse = await courseRepo.save(courseRepo.create(courseData));

    // Tạo 2-3 sections
    const sectionNum = Math.floor(Math.random() * 2) + 2;
    let totalLessons = 0;

    for (let s = 1; s <= sectionNum; s++) {
      const section = await sectionRepo.save(
        sectionRepo.create({
          courseId: savedCourse.id,
          title: `Chương ${s}: Kiến thức ${s === 1 ? 'nền tảng' : 'chuyên sâu'}`,
          position: s,
        }),
      );

      // Tạo 3-5 lessons
      const lessonNum = Math.floor(Math.random() * 3) + 3;
      totalLessons += lessonNum;

      const lessons: Partial<Lesson>[] = [];
      for (let l = 1; l <= lessonNum; l++) {
        lessons.push({
          sectionId: section.id,
          title: `Bài ${l}: Nội dung học phần ${s}.${l}`,
          position: l,
          durationSecs: Math.floor(Math.random() * 600) + 300,
          isPreview: s === 1 && l === 1, // Bài 1 chương 1 là preview
        });
      }
      await lessonRepo.save(lessonRepo.create(lessons));
    }

    // Update lại count cho course
    await courseRepo.update(savedCourse.id, {
      sectionCount: sectionNum,
      lessonCount: totalLessons,
    });
  }

  console.log(
    `Đã gỡ bỏ data random cũ và seed mới ${bulkCourses.length} khóa học (kèm đầy đủ Sections/Lessons) cho instructor UID ${instructor.id}`,
  );
}
