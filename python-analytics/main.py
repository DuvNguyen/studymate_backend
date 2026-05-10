from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from prophet import Prophet
from sklearn.linear_model import LinearRegression
import datetime

app = FastAPI(title="StudyMate Analytics Engine")

class RevenueData(BaseModel):
    ds: str  # Date string YYYY-MM-DD
    y: float # Revenue value

class ForecastRequest(BaseModel):
    history: List[RevenueData]
    periods: int = 30  # Days to forecast

class RankingItem(BaseModel):
    category_id: int
    name: str
    revenue_history: List[float] # Monthly revenue for last N months

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/forecast")
async def forecast_revenue(request: ForecastRequest):
    if len(request.history) < 10:
        raise HTTPException(status_code=400, detail="Insufficient data for forecasting. Need at least 10 data points.")
    
    try:
        df = pd.DataFrame([item.model_dump() for item in request.history])
        df['ds'] = pd.to_datetime(df['ds'])
        
        m = Prophet(daily_seasonality=True, yearly_seasonality=len(request.history) > 365)
        m.fit(df)
        
        future = m.make_future_dataframe(periods=request.periods)
        forecast = m.predict(future)
        
        # Extract forecast for specific periods
        results = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(request.periods)
        results['ds'] = results['ds'].dt.strftime('%Y-%m-%d')
        
        return {
            "forecast": results.to_dict(orient='records'),
            "summary": {
                "next_period_total": results['yhat'].sum(),
                "trend": "up" if results['yhat'].iloc[-1] > results['yhat'].iloc[0] else "down"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ranking")
async def rank_categories(items: List[RankingItem]):
    results = []
    
    for item in items:
        rev = np.array(item.revenue_history)
        if len(rev) < 2:
            growth = 0
        else:
            # Simple linear trend
            X = np.arange(len(rev)).reshape(-1, 1)
            model = LinearRegression().fit(X, rev)
            growth = model.coef_[0]
            
        results.append({
            "category_id": item.category_id,
            "name": item.name,
            "current_revenue": rev[-1] if len(rev) > 0 else 0,
            "growth_score": float(growth),
            "priority": "HIGH" if growth > np.mean([i.revenue_history[-1] for i in items if i.revenue_history]) * 0.1 else "NORMAL"
        })
        
    # Sort by growth score descending
    results.sort(key=lambda x: x['growth_score'], reverse=True)
    return results

@app.post("/anomalies")
async def detect_anomalies(history: List[RevenueData]):
    if len(history) < 7:
        return {"anomalies": [], "message": "Need at least 7 days of data"}
        
    df = pd.DataFrame([item.model_dump() for item in history])
    df['y_rolling_mean'] = df['y'].rolling(window=7).mean()
    df['y_rolling_std'] = df['y'].rolling(window=7).std()
    
    # Threshold for anomaly: 2 standard deviations from mean
    df['is_anomaly'] = (df['y'] > df['y_rolling_mean'] + 2 * df['y_rolling_std']) | \
                        (df['y'] < df['y_rolling_mean'] - 2 * df['y_rolling_std'])
    
    anomalies = df[df['is_anomaly'] == True].copy()
    anomalies['ds'] = anomalies['ds'].astype(str)
    
    return anomalies[['ds', 'y', 'y_rolling_mean']].to_dict(orient='records')

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
