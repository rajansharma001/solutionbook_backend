export class GetDashboardStatsQuery {
  constructor(public readonly timeframe?: 'daily' | 'weekly' | 'monthly' | 'yearly') {}
}
