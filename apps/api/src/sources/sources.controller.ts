import { Controller, Get, Param, ParseBoolPipe, Query, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../auth/public.decorator.js';
import { inline } from '../common/content-disposition.js';
import { SourcesService } from './sources.service.js';

/** Registry of the official sources: global, not per tenant. */
@Public()
@Controller('sources')
export class SourcesController {
  constructor(private readonly service: SourcesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  /** Archived copy, opened in the browser; `?text=true` for the extracted text of a PDF or XLS. */
  @Get(':id/file')
  async file(@Param('id') id: string, @Res({ passthrough: true }) res: Response, @Query('text', new ParseBoolPipe({ optional: true })) text?: boolean) {
    const { fileName, contentType, content } = await this.service.file(id, text ?? false);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', inline(fileName));
    return new StreamableFile(content);
  }
}
