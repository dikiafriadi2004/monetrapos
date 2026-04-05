import { Controller, Post, Get, Patch, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './notification.entity';
import { SendEmailDto, SendSMSDto, SendWhatsAppDto } from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /** GET /notifications — Get notifications for current user/company */
  @Get()
  @ApiOperation({ summary: 'Get notifications' })
  async getNotifications(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('isRead') isRead?: string,
  ) {
    const companyId = req.user?.companyId;
    const take = limit ? parseInt(limit, 10) : 20;
    const where: any = { companyId };
    if (isRead === 'false') where.isRead = false;
    else if (isRead === 'true') where.isRead = true;

    const [data, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
    });
    return { data, total };
  }

  /** PATCH /notifications/read-all — Mark all as read */
  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req: any) {
    const companyId = req.user?.companyId;
    await this.notificationRepo.update(
      { companyId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    return { success: true };
  }

  /** PATCH /notifications/:id/read — Mark single notification as read */
  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const companyId = req.user?.companyId;
    await this.notificationRepo.update(
      { id, companyId },
      { isRead: true, readAt: new Date() },
    );
    return { success: true };
  }

  @Post('email')
  @ApiOperation({ summary: 'Send email notification' })
  sendEmail(@Body() dto: SendEmailDto) {
    return this.notificationsService.sendEmail(dto);
  }

  @Post('sms')
  @ApiOperation({ summary: 'Send SMS notification' })
  sendSMS(@Body() dto: SendSMSDto) {
    return this.notificationsService.sendSMS(dto);
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Send WhatsApp notification' })
  sendWhatsApp(@Body() dto: SendWhatsAppDto) {
    return this.notificationsService.sendWhatsApp(dto);
  }
}
