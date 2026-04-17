import { DataSource } from 'typeorm';
import { Course, CourseStatus, CourseLevel } from '../entities/course.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Video, VideoStatus } from '../entities/video.entity';
import { User } from '../entities/user.entity';
import { Category } from '../entities/category.entity';

export async function seedSampleCourse(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const sectionRepo = dataSource.getRepository(Section);
  const lessonRepo = dataSource.getRepository(Lesson);
  const videoRepo = dataSource.getRepository(Video);
  const userRepo = dataSource.getRepository(User);
  const categoryRepo = dataSource.getRepository(Category);

  // 1. Tìm hoặc chuẩn bị dữ liệu phụ thuộc
  let course = await courseRepo.findOne({
    where: { slug: 'financial-accounting' },
  });

  const instructor = await userRepo.findOne({
    where: { role: { roleName: 'INSTRUCTOR' } },
    relations: ['role'],
  });
  const firstUser = await userRepo.findOne({ where: {} });
  const category = await categoryRepo.findOne({ where: {} });

  if (!firstUser || !category) {
    console.log('No user or category found. Run previous seeds first.');
    return;
  }

  const theInstructor = instructor || firstUser;

  // 2. Tạo hoặc lấy video
  let video1 = await videoRepo.findOne({
    where: { storageKey: 'mock-youtube-1' },
  });
  if (!video1) {
    video1 = videoRepo.create({
      uploaderId: theInstructor.id,
      storageKey: 'mock-youtube-1',
      youtubeVideoId: 'dQw4w9WgXcQ',
      status: VideoStatus.APPROVED,
      durationSecs: 259,
    });
    await videoRepo.save(video1);
  }

  let video2 = await videoRepo.findOne({
    where: { storageKey: 'mock-youtube-2' },
  });
  if (!video2) {
    video2 = videoRepo.create({
      uploaderId: theInstructor.id,
      storageKey: 'mock-youtube-2',
      youtubeVideoId: 'jNQXAC9IVRw',
      status: VideoStatus.APPROVED,
      durationSecs: 312,
    });
    await videoRepo.save(video2);
  }

  let video3 = await videoRepo.findOne({
    where: { storageKey: 'mock-youtube-3' },
  });
  if (!video3) {
    video3 = videoRepo.create({
      uploaderId: theInstructor.id,
      storageKey: 'mock-youtube-3',
      youtubeVideoId: 'M7FIvfx5J10',
      status: VideoStatus.APPROVED,
      durationSecs: 420,
    });
    await videoRepo.save(video3);
  }

  // 3. Chuẩn bị dữ liệu khóa học
  const courseData = {
    title: 'Financial Accounting - #1 Ranked University: Course 1 of 5',
    slug: 'financial-accounting',
    description: 'Learn financial accounting from the self-made millionaire.',
    price: 1719000,
    originalPrice: 2500000,
    language: 'vi',
    level: CourseLevel.BEGINNER,
    status: CourseStatus.PUBLISHED,
    instructorId: theInstructor.id,
    categoryId: category.id,
    previewVideoId: video1.id,
    totalDuration: 110000,
    lessonCount: 155,
    sectionCount: 12,
    studentCount: 34825,
    avgRating: 4.7,
    reviewCount: 5022,
    publishedAt: new Date(),
    thumbnailUrl:
      'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop',
  };

  if (course) {
    courseRepo.merge(course, courseData);
  } else {
    course = courseRepo.create(courseData);
  }
  await courseRepo.save(course);

  // 4. Kiểm tra Section để tránh duplicate
  const existingSections = await sectionRepo.find({
    where: { courseId: course.id },
  });
  if (existingSections.length > 0) {
    console.log(
      `Course ${course.title} already has sections. Skipping content seed.`,
    );
    return;
  }

  // 5. Tạo Section & Lesson (chỉ chạy nếu chưa có)
  const section1 = sectionRepo.create({
    courseId: course.id,
    title: 'Meet Your Instructor and Introduction to Course',
    position: 1,
  });
  await sectionRepo.save(section1);

  const lesson1_1 = lessonRepo.create({
    sectionId: section1.id,
    title: 'Why Study Accounting?',
    position: 1,
    videoId: video1.id,
    isPreview: true,
    durationSecs: 259,
  });

  const lesson1_2 = lessonRepo.create({
    sectionId: section1.id,
    title: 'Meet Your Instructor and Introduction to Course',
    position: 2,
    videoId: video2.id,
    isPreview: true,
    durationSecs: 312,
  });
  await lessonRepo.save([lesson1_1, lesson1_2]);

  const section2 = sectionRepo.create({
    courseId: course.id,
    title: 'Lesson 1: Introduction to Financial Accounting',
    position: 2,
  });
  await sectionRepo.save(section2);

  const lesson2_1 = lessonRepo.create({
    sectionId: section2.id,
    title: 'The Purpose of Accounting',
    position: 1,
    videoId: video3.id,
    isPreview: false,
    durationSecs: 420,
  });

  const lesson2_2 = lessonRepo.create({
    sectionId: section2.id,
    title: 'Financial Statements Overview',
    position: 2,
    isPreview: false,
    durationSecs: 500,
  });
  await lessonRepo.save([lesson2_1, lesson2_2]);

  const section3 = sectionRepo.create({
    courseId: course.id,
    title: 'Lesson 2: General Purpose Financial Statements',
    position: 3,
  });
  await sectionRepo.save(section3);

  const lesson3_1 = lessonRepo.create({
    sectionId: section3.id,
    title: 'Understanding Balance Sheets',
    position: 1,
    isPreview: false,
    durationSecs: 1200,
  });
  await lessonRepo.save(lesson3_1);

  console.log(`Successfully seeded/updated sample course: ${course.title}`);
}
