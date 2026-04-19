import { DataSource } from 'typeorm';
import { Course, CourseLevel, CourseStatus } from '../entities/course.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';
import { Video, VideoStatus } from '../entities/video.entity';
import { Category } from '../entities/category.entity';
import { Enrollment } from '../entities/enrollment.entity';

export async function seedMasterCourse(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const sectionRepo = dataSource.getRepository(Section);
  const lessonRepo = dataSource.getRepository(Lesson);
  const videoRepo = dataSource.getRepository(Video);
  const categoryRepo = dataSource.getRepository(Category);
  const enrollmentRepo = dataSource.getRepository(Enrollment);

  const instructorId = 62;
  const studentId = 65;

  // 1. Lấy Category phù hợp (DevOps & Cloud)
  const category = await categoryRepo.findOne({ where: { slug: 'devops-cloud' } });
  if (!category) {
    console.log('Không tìm thấy category devops-cloud, bỏ qua seed master course.');
    return;
  }

  // 2. Tạo Course
  let course = await courseRepo.findOne({ where: { slug: 'master-linux-ubuntu' } });
  if (!course) {
    course = await courseRepo.save(
      courseRepo.create({
        instructorId,
        categoryId: category.id,
        title: 'Master Linux - Ubuntu Desktop Masterclass 2026',
        slug: 'master-linux-ubuntu',
        description: 'Khóa học thực chiến về Linux Ubuntu từ cài đặt đến bảo mật nâng cao.',
        price: 499000,
        originalPrice: 999000,
        level: CourseLevel.BEGINNER,
        status: CourseStatus.PUBLISHED,
        language: 'vi',
        publishedAt: new Date(),
      }),
    );
    console.log(`  Tạo khóa học Master: ${course.title}`);
  } else {
    console.log('  Khóa học Master đã tồn tại.');
  }

  // 3. Xóa dữ liệu cũ của khóa học này để seed lại sạch sẽ (nếu cần)
  // Trong thực tế seed thường chỉ thêm nếu chưa có, nhưng ở đây chúng ta muốn đảm bảo nội dung đúng

  // 4. Tạo Section 1
  let section1 = await sectionRepo.findOne({ where: { courseId: course.id, position: 1 } });
  if (!section1) {
    section1 = await sectionRepo.save(
      sectionRepo.create({
        courseId: course.id,
        title: 'Chương 1: Lựa chọn và cài đặt căn bản',
        position: 1,
      }),
    );
  }

  // 5. Tạo Section 2
  let section2 = await sectionRepo.findOne({ where: { courseId: course.id, position: 2 } });
  if (!section2) {
    section2 = await sectionRepo.save(
      sectionRepo.create({
        courseId: course.id,
        title: 'Chương 2: Cấu hình và Bảo mật nâng cao',
        position: 2,
      }),
    );
  }

  // 6. Tạo Videos & Lessons
  const lessonData = [
    {
      sectionId: section1.id,
      title: 'Cách lựa chọn phiên bản và tải về file iso Ubuntu Desktop',
      ytId: 'sedcaBXeP4A',
      pos: 1,
      duration: 360,
    },
    {
      sectionId: section1.id,
      title: 'Cài đặt VMWare Tools',
      ytId: '2jSUvGpLRvQ',
      pos: 2,
      duration: 240,
    },
    {
      sectionId: section2.id,
      title: 'Cách cài đặt Ubuntu Linux trên VMWare',
      ytId: 'rgrnc1Gfsy4',
      pos: 1,
      duration: 900,
    },
    {
      sectionId: section2.id,
      title: 'Smurf Attack - Kỹ thuật tấn công mạng',
      ytId: 'aYCMltF_unQ',
      pos: 2,
      duration: 480,
    },
  ];

  for (const data of lessonData) {
    let lesson = await lessonRepo.findOne({ where: { sectionId: data.sectionId, title: data.title } });
    
    // Tìm hoặc tạo Video thực thể
    let video = await videoRepo.findOne({ where: { youtubeVideoId: data.ytId } });
    if (!video) {
      video = await videoRepo.save(
        videoRepo.create({
          uploaderId: instructorId,
          title: data.title,
          youtubeVideoId: data.ytId,
          storageKey: data.ytId,
          cdnUrl: `https://www.youtube.com/embed/${data.ytId}`,
          status: VideoStatus.APPROVED,
          durationSecs: data.duration,
        }),
      );
    }

    if (!lesson) {
      // Tạo Lesson mới
      lesson = await lessonRepo.save(
        lessonRepo.create({
          sectionId: data.sectionId,
          videoId: video.id,
          title: data.title,
          position: data.pos,
          durationSecs: data.duration,
          content: `Nội dung chi tiết cho bài học: ${data.title}. Video này hướng dẫn về ${data.title} sử dụng Ubuntu Linux.`,
        }),
      );
      console.log(`    └─ Tạo bài học mới: ${lesson.title}`);
    } else {
      // Cập nhật Lesson cũ nếu thiếu videoId
      if (lesson.videoId !== video.id) {
        lesson.videoId = video.id;
        lesson.durationSecs = data.duration;
        await lessonRepo.save(lesson);
        console.log(`    └─ Cập nhật video cho bài học: ${lesson.title}`);
      }
    }
  }

  // 7. Tự động ghi danh học viên (Student ID 65)
  const existingEnroll = await enrollmentRepo.findOne({
    where: { student_id: studentId, course_id: course.id },
  });

  if (!existingEnroll) {
    await enrollmentRepo.save(
      enrollmentRepo.create({
        student_id: studentId,
        course_id: course.id,
        is_active: true,
        enrolled_at: new Date(),
        progress_percent: 0,
      }),
    );
    console.log(`  Ghi danh học viên ID ${studentId} vào khóa học thành công.`);
  }

  // 8. Cập nhật thống kê khóa học (lessonCount, sectionCount)
  const finalLessonCount = await lessonRepo.count({
    where: { section: { courseId: course.id } },
  });
  const finalSectionCount = await sectionRepo.count({
    where: { courseId: course.id },
  });

  await courseRepo.update(course.id, {
    lessonCount: finalLessonCount,
    sectionCount: finalSectionCount,
    studentCount: 1,
    totalDuration: lessonData.reduce((acc, curr) => acc + curr.duration, 0),
  });

  console.log('Seed Master Course hoàn thành!');
}
