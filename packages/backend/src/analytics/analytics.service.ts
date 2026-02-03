import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticsService {
  async getDashboard() {
    return {
      tvl: '125450',
      activeAgents: 3,
      avgAPY: '8.7',
      riskScore: 0.35,
      totalRevenue: '12340',
      totalProfit: '9870',
      recentActivity: [
        {
          type: 'INVESTMENT',
          agent: '0x9fE4...a6e0',
          amount: '15000',
          protocol: 'Aave',
          timestamp: Date.now() - 3600000,
        },
        {
          type: 'REBALANCE',
          agent: '0xCf7E...0Fc9',
          timestamp: Date.now() - 7200000,
        },
      ],
    };
  }

  async getPerformance(period: string = '7d') {
    const data = [];
    const days = period === '30d' ? 30 : 7;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0],
        tvl: 100000 + Math.random() * 25000,
        revenue: Math.random() * 500,
        apy: 7 + Math.random() * 3,
      });
    }

    return { period, data };
  }
}
