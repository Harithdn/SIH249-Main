"""Modular ML wrappers.
Full training/inference lives in app.main (single-service prototype);
these helpers expose feature engineering + advisory text for reuse.
"""
from .feature_engineering import rolling, trend, deviation

ADVISORY = "AI outputs are advisory and require authorized human review."

def priority_score(failure_risk: float, mission: float, downtime: float, criticality: float) -> float:
    """Prototype prioritization model (not an official military standard)."""
    return round(failure_risk * mission * downtime * criticality * 100, 1)
