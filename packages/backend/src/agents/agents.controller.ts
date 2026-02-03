import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AgentsService } from './agents.service';

@ApiTags('agents')
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all AI agents' })
  @ApiResponse({ status: 200, description: 'Returns all agents' })
  async getAllAgents() {
    return this.agentsService.getAllAgents();
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get agent by address' })
  @ApiResponse({ status: 200, description: 'Returns agent details' })
  async getAgent(@Param('address') address: string) {
    return this.agentsService.getAgent(address);
  }

  @Get(':address/performance')
  @ApiOperation({ summary: 'Get agent performance metrics' })
  @ApiResponse({ status: 200, description: 'Returns performance data' })
  async getAgentPerformance(@Param('address') address: string) {
    return this.agentsService.getAgentPerformance(address);
  }

  @Get(':address/decisions')
  @ApiOperation({ summary: 'Get agent decision history' })
  @ApiResponse({ status: 200, description: 'Returns decision history' })
  async getAgentDecisions(@Param('address') address: string) {
    return this.agentsService.getAgentDecisions(address);
  }

  @Post(':address/execute')
  @ApiOperation({ summary: 'Execute agent decision' })
  @ApiResponse({ status: 200, description: 'Decision executed' })
  async executeDecision(
    @Param('address') address: string,
    @Body() decision: any,
  ) {
    return this.agentsService.executeDecision(address, decision);
  }
}
