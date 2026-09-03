import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarksController {
  constructor(private readonly bookmarksService: BookmarksService) {}

  @Get()
  getUserBookmarks(@Request() req: { user: { sub: string } }) {
    return this.bookmarksService.getUserBookmarks(req.user.sub);
  }

  @Post()
  createBookmark(
    @Request() req: { user: { sub: string } },
    @Body() dto: CreateBookmarkDto,
  ) {
    return this.bookmarksService.createBookmark(req.user.sub, dto);
  }

  @Delete(':id')
  deleteBookmark(@Param('id') id: string, @Request() req: { user: { sub: string } }) {
    return this.bookmarksService.deleteBookmark(id, req.user.sub);
  }
}
