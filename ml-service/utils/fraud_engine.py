from config.fraud_weights import FRAUD_WEIGHTS, RISK_THRESHOLDS, RECOMMENDATIONS
from typing import Dict, Any, List


class FraudEngine:
    def __init__(self):
        self.weights = FRAUD_WEIGHTS
        self.thresholds = RISK_THRESHOLDS

    def _score_amount(self, amount: float) -> tuple[float, str]:
        w = self.weights["amount"]
        if amount < w["low"]["threshold"]:
            return w["low"]["score"], f"Low amount (${amount:.2f})"
        elif amount < w["medium"]["threshold"]:
            return w["medium"]["score"], f"Medium amount (${amount:.2f})"
        elif amount < w["high"]["threshold"]:
            return w["high"]["score"], f"High amount (${amount:.2f})"
        else:
            return w["critical"]["score"], f"Critical amount (${amount:.2f}) - extremely large"

    def _score_frequency(self, freq: int) -> tuple[float, str]:
        w = self.weights["transaction_frequency"]
        if freq <= w["normal"]["threshold"]:
            return w["normal"]["score"], None
        elif freq <= w["elevated"]["threshold"]:
            return w["elevated"]["score"], f"Elevated transaction frequency ({freq}/hour)"
        elif freq <= w["high"]["threshold"]:
            return w["high"]["score"], f"High transaction frequency ({freq}/hour)"
        else:
            return w["suspicious"]["score"], f"Suspicious transaction frequency ({freq}/hour)"

    def _score_failed_logins(self, fails: int) -> tuple[float, str]:
        w = self.weights["failed_logins"]
        if fails == 0:
            return 0, None
        elif fails <= w["low"]["threshold"]:
            return w["low"]["score"], f"{fails} recent failed login attempt(s)"
        elif fails <= w["medium"]["threshold"]:
            return w["medium"]["score"], f"{fails} failed login attempts - suspicious"
        else:
            return w["high"]["score"], f"{fails} failed login attempts - account under attack"

    def _score_transaction_hour(self, hour: int) -> tuple[float, str]:
        w = self.weights["transaction_hour"]
        if w["business_hours"]["start"] <= hour < w["business_hours"]["end"]:
            return 0, None
        elif w["evening"]["start"] <= hour <= w["evening"]["end"]:
            return w["evening"]["score"], f"Evening transaction at hour {hour}"
        else:
            return w["night"]["score"], f"Unusual time - transaction at {hour}:00 (nighttime)"

    def _score_account_age(self, days: int) -> tuple[float, str]:
        w = self.weights["account_age_days"]
        if days < w["new"]["threshold"]:
            return w["new"]["score"], f"New account ({days} days old)"
        elif days < w["recent"]["threshold"]:
            return w["recent"]["score"], f"Recently created account ({days} days old)"
        elif days < w["established"]["threshold"]:
            return w["established"]["score"], None
        else:
            return w["mature"]["score"], None

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        total_score = 0.0
        risk_factors: List[str] = []

        # Amount scoring
        score, reason = self._score_amount(features["amount"])
        total_score += score
        if reason:
            risk_factors.append(reason)

        # Frequency scoring
        score, reason = self._score_frequency(features["transaction_frequency"])
        total_score += score
        if reason:
            risk_factors.append(reason)

        # Failed logins
        score, reason = self._score_failed_logins(features["failed_logins"])
        total_score += score
        if reason:
            risk_factors.append(reason)

        # Location mismatch
        if features["location_mismatch"]:
            total_score += self.weights["location_mismatch"]["weight"]
            risk_factors.append("Location mismatch detected - transaction from unusual location")

        # Transaction hour
        score, reason = self._score_transaction_hour(features["transaction_hour"])
        total_score += score
        if reason:
            risk_factors.append(reason)

        # Account age
        score, reason = self._score_account_age(features["account_age_days"])
        total_score += score
        if reason:
            risk_factors.append(reason)

        # Previous fraud flags
        fraud_flag_score = min(
            features["previous_fraud_flags"] * self.weights["previous_fraud_flags"]["weight_per_flag"],
            self.weights["previous_fraud_flags"]["max_score"]
        )
        total_score += fraud_flag_score
        if features["previous_fraud_flags"] > 0:
            risk_factors.append(f"{features['previous_fraud_flags']} previous fraud flag(s) on account")

        # Device change
        if features["device_change"]:
            total_score += self.weights["device_change"]["weight"]
            risk_factors.append("New/unrecognized device detected")

        # Large amount flag
        if features["large_amount_flag"]:
            total_score += self.weights["large_amount_flag"]["weight"]
            risk_factors.append("Transaction flagged as unusually large for this account")

        # Normalize score to 0-100
        risk_score = min(round(total_score), 100)
        fraud_probability = round(risk_score / 100, 4)

        # Determine risk level
        risk_level = "SAFE"
        for level, bounds in self.thresholds.items():
            if bounds["min"] <= risk_score <= bounds["max"]:
                risk_level = level
                break

        return {
            "risk_score": risk_score,
            "fraud_probability": fraud_probability,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "recommendation": RECOMMENDATIONS[risk_level]
        }
