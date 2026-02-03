import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';

@ApiTags('contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get('addresses')
  @ApiOperation({ summary: 'Get deployed contract addresses' })
  async getContractAddresses() {
    return this.contractsService.getContractAddresses();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get protocol statistics' })
  async getProtocolStats() {
    return this.contractsService.getProtocolStats();
  }
}
