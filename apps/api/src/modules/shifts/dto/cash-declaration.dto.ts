import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CashDeclarationDto {
  @ApiProperty({ example: 5, description: 'Number of Rp 100.000 bills' })
  @IsNumber()
  @Min(0)
  cash100k: number = 0;

  @ApiProperty({ example: 10, description: 'Number of Rp 50.000 bills' })
  @IsNumber()
  @Min(0)
  cash50k: number = 0;

  @ApiProperty({ example: 15, description: 'Number of Rp 20.000 bills' })
  @IsNumber()
  @Min(0)
  cash20k: number = 0;

  @ApiProperty({ example: 20, description: 'Number of Rp 10.000 bills' })
  @IsNumber()
  @Min(0)
  cash10k: number = 0;

  @ApiProperty({ example: 10, description: 'Number of Rp 5.000 bills' })
  @IsNumber()
  @Min(0)
  cash5k: number = 0;

  @ApiProperty({ example: 5, description: 'Number of Rp 2.000 bills' })
  @IsNumber()
  @Min(0)
  cash2k: number = 0;

  @ApiProperty({ example: 10, description: 'Number of Rp 1.000 bills' })
  @IsNumber()
  @Min(0)
  cash1k: number = 0;

  @ApiProperty({ example: 5000, description: 'Total coins amount' })
  @IsNumber()
  @Min(0)
  coins: number = 0;

  // Calculate total cash
  calculateTotal(): number {
    return (
      this.cash100k * 100000 +
      this.cash50k * 50000 +
      this.cash20k * 20000 +
      this.cash10k * 10000 +
      this.cash5k * 5000 +
      this.cash2k * 2000 +
      this.cash1k * 1000 +
      this.coins
    );
  }
}
