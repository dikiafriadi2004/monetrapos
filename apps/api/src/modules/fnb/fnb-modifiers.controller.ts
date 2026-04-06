import { Controller, Get, Post, Patch, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { MemberJwtGuard } from '../auth/guards/member-jwt.guard';
import { FnbModifiersService } from './fnb-modifiers.service';

@Controller('fnb/modifiers')
@UseGuards(MemberJwtGuard)
export class FnbModifiersController {
  constructor(private readonly modifiersService: FnbModifiersService) {}

  @Post('groups')
  createGroup(@Request() req, @Body() dto: any) {
    return this.modifiersService.createGroup(req.user.companyId, dto);
  }

  @Get('groups')
  findAllGroups(@Request() req) {
    return this.modifiersService.findAllGroups(req.user.companyId);
  }

  @Get('groups/product/:productId')
  findGroupsForProduct(@Request() req, @Param('productId') productId: string) {
    return this.modifiersService.findGroupsForProduct(req.user.companyId, productId);
  }

  @Get('groups/:id')
  findOneGroup(@Request() req, @Param('id') id: string) {
    return this.modifiersService.findOneGroup(req.user.companyId, id);
  }

  @Patch('groups/:id')
  updateGroup(@Request() req, @Param('id') id: string, @Body() dto: any) {
    return this.modifiersService.updateGroup(req.user.companyId, id, dto);
  }

  @Delete('groups/:id')
  removeGroup(@Request() req, @Param('id') id: string) {
    return this.modifiersService.removeGroup(req.user.companyId, id);
  }

  @Post('groups/:groupId/options')
  createOption(@Request() req, @Param('groupId') groupId: string, @Body() dto: any) {
    return this.modifiersService.createOption(req.user.companyId, groupId, dto);
  }

  @Patch('groups/:groupId/options/:optionId')
  updateOption(@Request() req, @Param('groupId') groupId: string, @Param('optionId') optionId: string, @Body() dto: any) {
    return this.modifiersService.updateOption(req.user.companyId, groupId, optionId, dto);
  }

  @Delete('groups/:groupId/options/:optionId')
  removeOption(@Request() req, @Param('groupId') groupId: string, @Param('optionId') optionId: string) {
    return this.modifiersService.removeOption(req.user.companyId, groupId, optionId);
  }
}
