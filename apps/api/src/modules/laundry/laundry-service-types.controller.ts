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
import { AuthGuard } from '@nestjs/passport';
import { LaundryServiceTypesService } from './laundry-service-types.service';
import { CreateLaundryServiceTypeDto } from './dto/create-laundry-service-type.dto';

@Controller('laundry/service-types')
@UseGuards(AuthGuard('jwt'))
export class LaundryServiceTypesController {
  constructor(private readonly serviceTypesService: LaundryServiceTypesService) {}

  @Post()
  create(@Body() createDto: CreateLaundryServiceTypeDto, @Request() req) {
    return this.serviceTypesService.create(createDto, req.user.companyId);
  }

  @Get()
  findAll(@Request() req) {
    return this.serviceTypesService.findAll(req.user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.serviceTypesService.findOne(id, req.user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLaundryServiceTypeDto>,
    @Request() req,
  ) {
    return this.serviceTypesService.update(id, updateDto, req.user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.serviceTypesService.remove(id, req.user.companyId);
  }
}
