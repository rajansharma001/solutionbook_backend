import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ForumService } from './forum.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateForumCategoryDto } from './dto/create-forum-category.dto';
import { CreateForumPostDto } from './dto/create-forum-post.dto';
import { AddForumCommentDto } from './dto/add-forum-comment.dto';

interface RequestWithUser {
  user: { sub: string; role?: string };
}

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @UseGuards(JwtAuthGuard)
  @Get('categories')
  async getCategories(@Request() req: RequestWithUser) {
    return this.forumService.getCategories(req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('categories')
  async createCategory(
    @Request() req: RequestWithUser,
    @Body() dto: CreateForumCategoryDto,
  ) {
    return this.forumService.createCategory(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('categories/:id/join')
  async joinCategory(@Request() req: RequestWithUser, @Param('id') categoryId: string) {
    return this.forumService.joinCategory(req.user.sub, categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('categories/:id/leave')
  async leaveCategory(@Request() req: RequestWithUser, @Param('id') categoryId: string) {
    return this.forumService.leaveCategory(req.user.sub, categoryId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('categories/:slug')
  async getCategoryBySlug(@Request() req: RequestWithUser, @Param('slug') slug: string) {
    return this.forumService.getCategoryBySlug(req.user.sub, slug);
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string) {
    return this.forumService.getPost(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Post('posts')
  async createPost(
    @Request() req: RequestWithUser,
    @Body() dto: CreateForumPostDto,
  ) {
    return this.forumService.createPost(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Post('posts/:id/comments')
  async addComment(
    @Request() req: RequestWithUser,
    @Param('id') postId: string,
    @Body() dto: AddForumCommentDto,
  ) {
    return this.forumService.addComment(req.user.sub, postId, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Post('posts/:id/upvote')
  async upvotePost(
    @Request() req: RequestWithUser,
    @Param('id') postId: string,
  ) {
    return this.forumService.upvotePost(req.user.sub, postId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('STUDENT', 'TEACHER', 'ADMIN')
  @Post('comments/:id/upvote')
  async upvoteComment(
    @Request() req: RequestWithUser,
    @Param('id') commentId: string,
  ) {
    return this.forumService.upvoteComment(req.user.sub, commentId);
  }
}
