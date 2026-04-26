FRAUD_WEIGHTS = {
    "amount": {
        "low": {"threshold": 1000, "score": 0},
        "medium": {"threshold": 5000, "score": 15},
        "high": {"threshold": 20000, "score": 30},
        "critical": {"score": 45}
    },
    "transaction_frequency": {
        "normal": {"threshold": 5, "score": 0},
        "elevated": {"threshold": 10, "score": 10},
        "high": {"threshold": 20, "score": 20},
        "suspicious": {"score": 30}
    },
    "failed_logins": {
        "none": {"threshold": 0, "score": 0},
        "low": {"threshold": 2, "score": 10},
        "medium": {"threshold": 5, "score": 20},
        "high": {"score": 35}
    },
    "location_mismatch": {"weight": 20},
    "transaction_hour": {
        "business_hours": {"start": 8, "end": 20, "score": 0},
        "evening": {"start": 20, "end": 23, "score": 5},
        "night": {"score": 15}
    },
    "account_age_days": {
        "new": {"threshold": 30, "score": 20},
        "recent": {"threshold": 90, "score": 10},
        "established": {"threshold": 365, "score": 5},
        "mature": {"score": 0}
    },
    "previous_fraud_flags": {"weight_per_flag": 15, "max_score": 45},
    "device_change": {"weight": 15},
    "large_amount_flag": {"weight": 20}
}

RISK_THRESHOLDS = {
    "SAFE": {"min": 0, "max": 25},
    "SUSPICIOUS": {"min": 26, "max": 55},
    "HIGH_RISK": {"min": 56, "max": 80},
    "BLOCKED": {"min": 81, "max": 100}
}

RECOMMENDATIONS = {
    "SAFE": "Transaction approved. No action required.",
    "SUSPICIOUS": "Transaction flagged for review. Manager approval recommended.",
    "HIGH_RISK": "Transaction blocked pending manual review. OTP re-verification required.",
    "BLOCKED": "Transaction blocked. Security team notified. Account under review."
}
