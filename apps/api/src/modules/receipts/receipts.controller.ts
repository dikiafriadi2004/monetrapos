import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ReceiptsService } from './receipts.service';
import { GenerateReceiptDto, EmailReceiptDto, PrintReceiptDto } from './dto';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate receipt in specified format' })
  generateReceipt(@Body() dto: GenerateReceiptDto) {
    return this.receiptsService.generateReceipt(dto);
  }

  @Post('email')
  @ApiOperation({ summary: 'Send receipt via email' })
  emailReceipt(@Body() dto: EmailReceiptDto) {
    return this.receiptsService.emailReceipt(dto);
  }

  @Post('print')
  @ApiOperation({ summary: 'Print receipt to thermal printer' })
  printReceipt(@Body() dto: PrintReceiptDto) {
    return this.receiptsService.printReceipt(dto);
  }
}
