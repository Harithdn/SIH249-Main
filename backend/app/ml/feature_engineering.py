"""Feature engineering helpers (rolling stats, trends, deviations)."""
import numpy as np

def rolling(series, w=5):
    s = np.asarray(series, dtype=float)
    if len(s) < w: return float(np.mean(s)) if len(s) else 0.0
    return float(np.mean(s[-w:]))

def trend(series):
    s = np.asarray(series, dtype=float)
    if len(s) < 3: return 0.0
    x = np.arange(len(s))
    return float(np.polyfit(x, s, 1)[0])

def deviation(value, baseline):
    return float((value - baseline) / baseline) if baseline else 0.0
