import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Courses and Enrollments (e2e)', () => {
  let app: INestApplication<App>;
  let teacherToken: string;
  let studentToken: string;
  let courseId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Setup: Login as Teacher
    const resTeacher = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'teacher@solutionbook.local', password: 'password123' })
      .expect(201);
    teacherToken = resTeacher.body.accessToken;

    // Setup: Login as Student
    const resStudent = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'student@solutionbook.local', password: 'password123' })
      .expect(201);
    studentToken = resStudent.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Courses', () => {
    it('/courses (POST) - Teacher can create a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Learn Math',
          description: 'A comprehensive math course',
          price: 50,
        })
        .expect(201);

      courseId = res.body.id;
      expect(courseId).toBeDefined();
      expect(res.body.title).toEqual('Learn Math');
    });

    it('/courses (GET) - Student can view courses', async () => {
      const res = await request(app.getHttpServer())
        .get('/courses')
        .expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('/courses/:id/modules (POST) - Teacher can add a module', async () => {
      const res = await request(app.getHttpServer())
        .post(`/courses/${courseId}/modules`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({
          title: 'Algebra Basics',
          content: 'This is the first module',
        })
        .expect(201);

      expect(res.body.title).toEqual('Algebra Basics');
      expect(res.body.courseId).toEqual(courseId);
    });
  });

  describe('Enrollments', () => {
    it('/enrollments (POST) - Student can enroll in a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: courseId,
        })
        .expect(201);

      expect(res.body.courseId).toEqual(courseId);
    });

    it('/enrollments/my-enrollments (GET) - Student can view their enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/enrollments/my-enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBeTruthy();
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].course.title).toEqual('Learn Math');
    });
  });
});
