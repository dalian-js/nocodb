import { Controller, Get, Param, Request, Response, UseGuards } from '@nestjs/common'
import { GlobalGuard } from '../../guards/global/global.guard'
import { Acl, ExtractProjectIdMiddleware } from '../../middlewares/extract-project-id/extract-project-id.middleware'
import { ApiDocsService } from './api-docs.service';
import getSwaggerHtml from './template/swaggerHtml';
import getRedocHtml from './template/redocHtml';

@Controller()
export class ApiDocsController {
  constructor(private readonly apiDocsService: ApiDocsService) {}

  @Get('/api/v1/db/meta/projects/:projectId/swagger.json')
  @UseGuards(ExtractProjectIdMiddleware, GlobalGuard)
  @Acl('swaggerJson')
  async swaggerJson(@Param('projectId') projectId: string, @Request() req) {
    const swagger = await this.apiDocsService.swaggerJson({
      projectId: projectId,
      siteUrl: req.ncSiteUrl,
    });

    return swagger;
  }

  @Get('/api/v1/db/meta/projects/:projectId/swagger')
  swaggerHtml(@Param('projectId') projectId: string, @Response() res) {
    res.send(getSwaggerHtml({ ncSiteUrl: process.env.NC_PUBLIC_URL || '' }));
  }

  @Get('/api/v1/db/meta/projects/:projectId/redoc')
  redocHtml(@Param('projectId') projectId: string, @Response() res) {
    res.send(getRedocHtml({ ncSiteUrl: process.env.NC_PUBLIC_URL || '' }));
  }
}
