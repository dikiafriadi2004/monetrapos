import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { SendEmailDto, SendSMSDto, SendWhatsAppDto } from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
