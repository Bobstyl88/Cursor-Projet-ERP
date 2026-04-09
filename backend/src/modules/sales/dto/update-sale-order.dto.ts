import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSaleOrderDto } from './create-sale-order.dto';

export class UpdateSaleOrderDto extends PartialType(
  OmitType(CreateSaleOrderDto, ['contactId'] as const),
) {}
