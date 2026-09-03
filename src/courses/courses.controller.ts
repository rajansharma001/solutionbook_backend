import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import {
  CreateCourseDto,
  UpdateCourseDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  CreateQuizDto,
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
  SubmitQuizDto,
  SubmitAssignmentDto,
  CreateReviewDto,
} from './dto/course.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';


@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('teacher/my-courses')
  getMyCourses(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.findByTeacher(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 15,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coursesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post()
  create(
    @Request() req: { user: { sub: string } },
    @Body() createCourseDto: CreateCourseDto,
  ) {
    return this.coursesService.create(req.user.sub, createCourseDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Patch(':id')
  update(
    @Request() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.coursesService.update(
      id,
      req.user.sub,
      req.user.role,
      updateCourseDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post(':id/modules')
  addModule(
    @Request() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
    @Body() createModuleDto: CreateModuleDto,
  ) {
    return this.coursesService.addModule(
      id,
      req.user.sub,
      req.user.role,
      createModuleDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Patch('modules/:moduleId')
  updateModule(
    @Request() req: { user: { sub: string; role: string } },
    @Param('moduleId') moduleId: string,
    @Body() updateModuleDto: UpdateModuleDto,
  ) {
    return this.coursesService.updateModule(
      moduleId,
      req.user.sub,
      req.user.role,
      updateModuleDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Delete('modules/:moduleId')
  deleteModule(
    @Request() req: { user: { sub: string; role: string } },
    @Param('moduleId') moduleId: string,
  ) {
    return this.coursesService.deleteModule(
      moduleId,
      req.user.sub,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('modules/:moduleId/lessons')
  addLesson(
    @Request() req: { user: { sub: string; role: string } },
    @Param('moduleId') moduleId: string,
    @Body() createLessonDto: CreateLessonDto,
  ) {
    return this.coursesService.addLesson(
      moduleId,
      req.user.sub,
      req.user.role,
      createLessonDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Patch('lessons/:lessonId')
  updateLesson(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
    @Body() updateLessonDto: UpdateLessonDto,
  ) {
    return this.coursesService.updateLesson(
      lessonId,
      req.user.sub,
      req.user.role,
      updateLessonDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Delete('lessons/:lessonId')
  deleteLesson(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.deleteLesson(
      lessonId,
      req.user.sub,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post(':id/quizzes')
  addQuiz(
    @Request() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.coursesService.addQuiz(
      id,
      req.user.sub,
      req.user.role,
      createQuizDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get(':id/performance')
  getCoursePerformance(
    @Request() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
  ) {
    return this.coursesService.getCoursePerformance(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get(':id/teacher-students-progress')
  getTeacherStudentsProgress(
    @Request() req: { user: { sub: string; role: string } },
    @Param('id') id: string,
  ) {
    return this.coursesService.getTeacherStudentsProgress(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  // ─── Quiz & QuizQuestion Studio (Teacher / Admin) ─────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('lessons/:lessonId/quiz')
  getLessonQuiz(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.getLessonQuiz(lessonId, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('lessons/:lessonId/quiz')
  upsertLessonQuiz(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.coursesService.upsertLessonQuiz(lessonId, req.user.sub, req.user.role, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('quizzes/:quizId/questions')
  addQuizQuestion(
    @Request() req: { user: { sub: string; role: string } },
    @Param('quizId') quizId: string,
    @Body() dto: CreateQuizQuestionDto,
  ) {
    return this.coursesService.addQuizQuestion(quizId, req.user.sub, req.user.role, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Patch('questions/:questionId')
  updateQuizQuestion(
    @Request() req: { user: { sub: string; role: string } },
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.coursesService.updateQuizQuestion(questionId, req.user.sub, req.user.role, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Delete('questions/:questionId')
  deleteQuizQuestion(
    @Request() req: { user: { sub: string; role: string } },
    @Param('questionId') questionId: string,
  ) {
    return this.coursesService.deleteQuizQuestion(questionId, req.user.sub, req.user.role);
  }

  // ─── Assignment Studio (Teacher / Admin) ──────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Get('lessons/:lessonId/assignment')
  getLessonAssignment(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.getLessonAssignment(lessonId, req.user.sub, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('lessons/:lessonId/assignment')
  upsertLessonAssignment(
    @Request() req: { user: { sub: string; role: string } },
    @Param('lessonId') lessonId: string,
    @Body() dto: { description: string; submissionType: string; maxMarks: number; deadline?: string },
  ) {
    return this.coursesService.upsertLessonAssignment(lessonId, req.user.sub, req.user.role, dto);
  }

  // ─── Student Learning Workspace ────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @Get(':id/learn')
  getCourseLearnState(
    @Request() req: { user: { sub: string } },
    @Param('id') courseId: string,
  ) {
    return this.coursesService.getCourseLearnState(courseId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @Post(':id/lessons/:lessonId/complete')
  completeLesson(
    @Request() req: { user: { sub: string } },
    @Param('id') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.coursesService.completeLesson(courseId, lessonId, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @Post('lessons/:lessonId/quiz/submit')
  submitQuiz(
    @Request() req: { user: { sub: string } },
    @Param('lessonId') lessonId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.coursesService.submitQuiz(lessonId, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @Post('lessons/:lessonId/assignment/submit')
  submitAssignment(
    @Request() req: { user: { sub: string } },
    @Param('lessonId') lessonId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.coursesService.submitAssignment(lessonId, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'ADMIN')
  @Post(':id/reviews')
  createReview(
    @Request() req: { user: { sub: string } },
    @Param('id') courseId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.coursesService.createReview(courseId, req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Get('assignments/submissions')
  getTeacherSubmissions(@Request() req: { user: { sub: string } }) {
    return this.coursesService.getTeacherSubmissions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  @Post('assignments/submissions/:id/grade')
  gradeSubmission(
    @Request() req: { user: { sub: string } },
    @Param('id') submissionId: string,
    @Body() body: { marks: number; feedback: string; status: string },
  ) {
    return this.coursesService.gradeSubmission(req.user.sub, submissionId, body);
  }
}
