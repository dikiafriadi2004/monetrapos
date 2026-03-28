import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@Controller()
@ApiTags('Root')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'API Welcome Message' })
  getWelcome() {
    return this.appService.getWelcome();
  }
}
