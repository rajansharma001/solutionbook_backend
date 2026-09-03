import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

class UpdateRoleDto {
  @IsString()
  role!: string;
}

class UpdateStatusDto {
  @IsBoolean()
  isActive!: boolean;
}

class RejectCourseDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

class CreateEnrollmentDto {
  @IsString()
  studentId!: string;

  @IsString()
  courseId!: string;
}


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ───────────────────────────────────────────────────────────────

  @Get('stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Users ───────────────────────────────────────────────────────────────────

  @Get('users')
  getAllUsers(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.getAllUsers(search, page, limit);
  }

  @Patch('users/:id/role')
  updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Patch('users/:id/status')
  updateUserStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.adminService.updateUserStatus(id, dto.isActive);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  // ─── Courses ─────────────────────────────────────────────────────────────────

  @Get('courses')
  getAllCourses(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.getAllCourses(status, page, limit);
  }

  @Patch('courses/:id/approve')
  approveCourse(@Param('id') id: string) {
    return this.adminService.approveCourse(id);
  }

  @Patch('courses/:id/reject')
  rejectCourse(@Param('id') id: string, @Body() dto: RejectCourseDto) {
    return this.adminService.rejectCourse(id, dto.reason);
  }

  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }

  // ─── Enrollments ─────────────────────────────────────────────────────────────

  @Get('enrollments')
  getAllEnrollments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.getAllEnrollments(page, limit);
  }

  @Post('enrollments')
  createEnrollment(@Body() dto: CreateEnrollmentDto) {
    return this.adminService.createEnrollment(dto.studentId, dto.courseId);
  }

  @Delete('enrollments/:id')
  deleteEnrollment(@Param('id') id: string) {
    return this.adminService.deleteEnrollment(id);
  }

  @Post('users/:id/send-verification')
  sendUserVerification(@Param('id') id: string) {
    return this.adminService.sendUserVerification(id);
  }

  @Get('students-progress')
  getStudentsProgress() {
    return this.adminService.getStudentsProgress();
  }

  @Get('students-progress/:id')
  getStudentDetailProgress(@Param('id') id: string) {
    return this.adminService.getStudentDetailProgress(id);
  }

  // ─── System Settings ──────────────────────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  updateSettings(@Body() body: any) {
    return this.adminService.updateSettings(body);
  }

  // ─── Certificates Management ──────────────────────────────────────────────────

  @Get('certificates')
  getAllCertificates() {
    return this.adminService.getAllCertificates();
  }

  @Post('certificates')
  manualAwardCertificate(@Body() dto: { studentId: string; courseId: string }) {
    return this.adminService.manualAwardCertificate(dto.studentId, dto.courseId);
  }

  @Delete('certificates/:id')
  revokeCertificate(@Param('id') id: string) {
    return this.adminService.revokeCertificate(id);
  }

  // ─── Reviews Moderation ───────────────────────────────────────────────────────

  @Get('reviews')
  getAllReviews() {
    return this.adminService.getAllReviews();
  }

  @Delete('reviews/:id')
  moderateReview(@Param('id') id: string) {
    return this.adminService.moderateReview(id);
  }
}

