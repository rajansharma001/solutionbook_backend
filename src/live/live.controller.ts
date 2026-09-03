import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  Redirect,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { LiveService } from './live.service';
import { YoutubeService } from './youtube.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EnrollmentGuard } from './guards/enrollment.guard';
import { ConfigService } from '@nestjs/config';

interface RequestWithUser {
  user: {
    sub: string;
    role: string;
  };
}

@Controller('live')
export class LiveController {
  constructor(
    private readonly liveService: LiveService,
    private readonly youtubeService: YoutubeService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async createClass(
    @Request() req: RequestWithUser,
    @Body() data: { title: string; description?: string; courseIds: string[]; startTime: string; endTime?: string; requireEnrollment: boolean; assignedTeacherId?: string },
  ) {
    return this.liveService.createLiveClass(req.user.sub, req.user.role, data);
  }

  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async startBroadcast(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    return this.liveService.startBroadcast(req.user.sub, req.user.role, id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async endBroadcast(@Request() req: RequestWithUser, @Param('id') id: string) {
    return this.liveService.endBroadcast(req.user.sub, req.user.role, id);
  }

  @Get('youtube/connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  connectYoutube(
    @Request() req: RequestWithUser,
    @Query('returnUrl') returnUrl: string,
  ) {
    const state = JSON.stringify({
      userId: req.user.sub,
      returnUrl: returnUrl || '/teacher/dashboard/live/create',
    });
    const url = this.youtubeService.generateAuthUrl(state);
    return { url };
  }

  @Get('youtube/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  async getYoutubeStatus() {
    const connected = await this.youtubeService.isConnected('dummy'); // Uses global admin account now
    return { connected };
  }

  @Post('youtube/upload-video')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEACHER')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'temp');
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          cb(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('video/')) {
          return cb(new BadRequestException('Only video files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB limit
    }),
  )
  async uploadVideo(
    @Request() req: RequestWithUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { title: string; description: string },
  ) {
    if (!file) throw new BadRequestException('Video file is required');

    try {
      const result = await this.youtubeService.uploadVideo(
        req.user.sub,
        body.title || file.originalname,
        body.description || 'Uploaded via SolutionBook',
        file.path,
      );

      // Clean up temp file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      return result;
    } catch (err) {
      // Clean up temp file on error too
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw err;
    }
  }

  @Get('teacher/my-classes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEACHER', 'ADMIN')
  async getTeacherClasses(@Request() req: RequestWithUser) {
    return this.liveService.getTeacherClasses(req.user.sub);
  }

  @Get('calendar')
  @UseGuards(JwtAuthGuard)
  async getStudentCalendar(@Request() req: RequestWithUser) {
    return this.liveService.getStudentCalendar(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, EnrollmentGuard)
  async getLiveClass(@Param('id') id: string) {
    return this.liveService.findById(id);
  }

  @Get('course/:courseId')
  @UseGuards(JwtAuthGuard)
  async getClassesForCourse(@Param('courseId') courseId: string) {
    return this.liveService.getClassesForCourse(courseId);
  }

}
