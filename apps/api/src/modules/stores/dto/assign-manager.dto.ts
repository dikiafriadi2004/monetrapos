import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignManagerDto {
  @ApiProperty({ 
    example: 'uuid-of-manager',
    description: 'User ID of the manager to assign to this store'
  })
  @IsUUID()
  managerId: string;
}
