import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCityDto {
  @ApiProperty({
    example: 'Capelle aan den IJssel',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
