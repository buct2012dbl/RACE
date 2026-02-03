import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  async getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformance(@Query('period') period: string) {
    return this.analyticsService.getPerformance(period);
  }
}
