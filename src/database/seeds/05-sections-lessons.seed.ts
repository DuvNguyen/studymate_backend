import { DataSource } from 'typeorm';
import { Course } from '../entities/course.entity';
import { Section } from '../entities/section.entity';
import { Lesson } from '../entities/lesson.entity';

export async function seedSectionsAndLessons(dataSource: DataSource) {
  const courseRepo = dataSource.getRepository(Course);
  const sectionRepo = dataSource.getRepository(Section);
  const lessonRepo = dataSource.getRepository(Lesson);

  const course = await courseRepo.findOne({ where: { id: 1 } });
  if (!course) {
    console.log('Không tìm thấy Course ID 1, bỏ qua seed sections & lessons.');
    return;
  }

  // Tạo Section 1
  const section1 = sectionRepo.create({
    courseId: 1,
    title: 'Chương 1: Giới thiệu chung',
    position: 1,
  });
  const savedSection1 = await sectionRepo.save(section1);

  await lessonRepo.save([
    {
      sectionId: savedSection1.id,
      title: 'Bài 1: Làm quen',
      isPreview: true,
      position: 1,
      durationSecs: 120,
    },
    {
      sectionId: savedSection1.id,
      title: 'Bài 2: Cài đặt công cụ',
      isPreview: false,
      position: 2,
      durationSecs: 300,
    },
  ]);

  // Tạo Section 2
  const section2 = sectionRepo.create({
    courseId: 1,
    title: 'Chương 2: Kiến thức cốt lõi',
    position: 2,
  });
  const savedSection2 = await sectionRepo.save(section2);

  await lessonRepo.save([
    {
      sectionId: savedSection2.id,
      title: 'Bài 3: Cấu trúc cơ bản',
      isPreview: false,
      position: 1,
      durationSecs: 400,
    },
    {
      sectionId: savedSection2.id,
      title: 'Bài 4: Thực hành',
      isPreview: false,
      position: 2,
      durationSecs: 500,
    },
  ]);

  console.log('Seed Sections & Lessons cho Course 1 thành công.');
}
