from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
from datetime import datetime
from config.fraud_weights import FRAUD_WEIGHTS, RISK_THRESHOLDS
from utils.blockchain import Blockchain
from utils.fraud_engine import FraudEngine

app = FastAPI(title="Banking Fraud Detection ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

blockchain = Blockchain()
fraud_engine = FraudEngine()


class TransactionFeatures(BaseModel):
    user_id: str
    amount: float
    transaction_frequency: int
    failed_logins: int
    location_mismatch: bool
    transaction_hour: int
    account_age_days: int
    previous_fraud_flags: int
    device_change: bool
    large_amount_flag: bool


class AuditData(BaseModel):
    event_type: str
    user_id: str
    data: dict


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-fraud-detection", "timestamp": datetime.utcnow().isoformat()}


@app.post("/predict")
async def predict_fraud(features: TransactionFeatures):
    try:
        result = fraud_engine.predict(features.dict())
        return {
            "success": True,
            "user_id": features.user_id,
            "risk_score": result["risk_score"],
            "fraud_probability": result["fraud_probability"],
            "risk_level": result["risk_level"],
            "risk_factors": result["risk_factors"],
            "recommendation": result["recommendation"],
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/audit/log")
async def log_audit(audit: AuditData):
    try:
        block_data = {
            "event_type": audit.event_type,
            "user_id": audit.user_id,
            "data": audit.data,
            "timestamp": datetime.utcnow().isoformat()
        }
        block = blockchain.add_block(block_data)
        return {
            "success": True,
            "block_index": block["index"],
            "block_hash": block["hash"],
            "chain_valid": blockchain.is_valid()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit/chain")
async def get_chain():
    try:
        return {
            "success": True,
            "chain": blockchain.chain,
            "length": len(blockchain.chain),
            "is_valid": blockchain.is_valid()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/audit/validate")
async def validate_chain():
    is_valid = blockchain.is_valid()
    return {
        "success": True,
        "is_valid": is_valid,
        "chain_length": len(blockchain.chain),
        "message": "Chain integrity verified" if is_valid else "Chain has been tampered!"
    }


@app.get("/weights")
async def get_weights():
    return {"success": True, "weights": FRAUD_WEIGHTS, "thresholds": RISK_THRESHOLDS}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
