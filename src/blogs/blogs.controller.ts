import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BlogsService } from './blogs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get('categories')
  getCategories() {
    return this.blogsService.getAllCategories();
  }

  @Get()
  getPublishedPosts() {
    return this.blogsService.getPublishedPosts();
  }

  @Get(':slug')
  getPostBySlug(@Param('slug') slug: string) {
    return this.blogsService.getPostBySlug(slug);
  }

  @Get('admin/posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  getAllPostsAdmin() {
    return this.blogsService.getAllPostsAdmin();
  }

  @Post('admin/posts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createPost(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateBlogPostDto,
  ) {
    return this.blogsService.createPost(req.user.sub, dto);
  }

  @Patch('admin/posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  updatePost(
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blogsService.updatePost(id, dto);
  }

  @Delete('admin/posts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deletePost(@Param('id') id: string) {
    return this.blogsService.deletePost(id);
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.blogsService.createCategory(dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteCategory(@Param('id') id: string) {
    return this.blogsService.deleteCategory(id);
  }
}
