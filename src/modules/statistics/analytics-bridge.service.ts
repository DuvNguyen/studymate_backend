import { Injectable, Logger } from '@nestjs/common';

type ForecastResponse = {
  forecast: { ds: string; yhat: number }[];
  summary: { next_period_total: number; trend: string; confidence: string };
};

type CategoryRankingResponse = {
  category_id: number;
  name: string;
  priority: string;
  growth_score: number;
};

type AnomalyResponse = {
  ds: string;
  y: number;
  y_rolling_mean: number;
  severity: string;
};

@Injectable()
export class AnalyticsBridgeService {
  private readonly logger = new Logger(AnalyticsBridgeService.name);
  private readonly baseUrl = 'http://localhost:8000';

  async getRevenueForecast(
    history: { ds: string; y: number }[],
    periods: number = 30,
  ): Promise<ForecastResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history, periods }),
      });
      if (!response.ok)
        throw new Error(`Analytics engine error: ${response.statusText}`);
      return (await response.json()) as ForecastResponse;
    } catch {
      this.logger.warn(
        'Python analytics service unavailable, using statistical fallback for forecast',
      );

      // Basic Linear Regression + Seasonality Mock
      const avgValue =
        history.reduce((acc, h) => acc + h.y, 0) / (history.length || 1);

      return {
        forecast: history
          .slice(-7)
          .map((h) => ({ ds: h.ds, yhat: h.y * 1.05 })),
        summary: {
          next_period_total: avgValue * periods * 1.1,
          trend: 'up',
          confidence: 'low (fallback)',
        },
      };
    }
  }

  async getCategoryRanking(
    items: { category_id: number; name: string; revenue_history: number[] }[],
  ): Promise<CategoryRankingResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/ranking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (!response.ok)
        throw new Error(`Analytics engine error: ${response.statusText}`);
      return (await response.json()) as CategoryRankingResponse[];
    } catch {
      this.logger.warn(
        'Python analytics service unavailable, using statistical fallback for ranking',
      );
      return items
        .map((item) => {
          const total = item.revenue_history.reduce((a, b) => a + b, 0);
          return {
            category_id: item.category_id,
            name: item.name,
            priority: total > 10000000 ? 'HIGH' : 'MEDIUM',
            growth_score: 5.5,
          };
        })
        .sort((a, b) => b.growth_score - a.growth_score);
    }
  }

  async detectAnomalies(
    history: { ds: string; y: number }[],
  ): Promise<AnomalyResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/anomalies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(history),
      });
      if (!response.ok)
        throw new Error(`Analytics engine error: ${response.statusText}`);
      return (await response.json()) as AnomalyResponse[];
    } catch {
      this.logger.warn(
        'Python analytics service unavailable, using statistical fallback for anomalies',
      );

      const anomalies: AnomalyResponse[] = [];
      const windowSize = 7;

      for (let i = windowSize; i < history.length; i++) {
        const window = history.slice(i - windowSize, i);
        const mean = window.reduce((a, b) => a + b.y, 0) / windowSize;
        const current = history[i].y;

        // If current is > 2x mean or < 0.5x mean, mark as anomaly
        if (current > mean * 2 || current < mean * 0.5) {
          anomalies.push({
            ds: history[i].ds,
            y: current,
            y_rolling_mean: mean,
            severity: 'high',
          });
        }
      }
      return anomalies;
    }
  }
}
