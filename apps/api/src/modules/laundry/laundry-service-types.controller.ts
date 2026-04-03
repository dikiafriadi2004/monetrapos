import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LaundryServiceTypesService } from './laundry-service-types.service';
import { CreateLaundryServiceTypeDto } from './dto/create-laundry-service-type.dto';
// TODO: Import actual guards when auth module is updated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('laundry/service-types')
// @UseGuards(JwtAuthGuard)
export class LaundryServiceTypesController {
  constructor(private readonly serviceTypesService: LaundryServiceTypesService) {}

  @Post()
  create(@Body() createDto: CreateLaundryServiceTypeDto, @Request() req) {
    return this.serviceTypesService.create(createDto, req.user.company_id);
  }

  @Get()
  findAll(@Request() req) {
    return this.serviceTypesService.findAll(req.user.company_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.serviceTypesService.findOne(id, req.user.company_id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLaundryServiceTypeDto>,
    @Request() req,
  ) {
    return this.serviceTypesService.update(id, updateDto, req.user.company_id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.serviceTypesService.remove(id, req.user.company_id);
  }
}
