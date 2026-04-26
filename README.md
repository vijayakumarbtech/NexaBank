# NexaBank — Enterprise Banking & Fraud Risk Management Platform

A production-grade full-stack banking system with real-time fraud detection, blockchain audit trails, multi-role dashboards, and two-factor authentication.

---

## Architecture

```
Frontend (React/Vite) → Backend (Node.js/Express) → ML Service (Python/FastAPI)
                                    ↓
                            MongoDB Atlas (Database)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Socket.io-client, Recharts |
| Backend | Node.js, Express, Socket.io, Mongoose |
| ML Service | Python 3.10+, FastAPI, Uvicorn |
| Database | MongoDB Atlas |
| Auth | JWT (access + refresh tokens), bcrypt, OTP 2FA |
| Realtime | WebSocket (Socket.io) |

---

## Features

### Authentication
- JWT access tokens (15min) + refresh tokens (7 days)
- 2FA with 6-digit OTP (2 min expiry, 3 max attempts)
- Account lockout after 3 failed logins (2 min lock)
- Login attempt tracking with IP/device capture

### Transaction Pipeline
1. Transaction initiation
2. OTP verification
3. ML fraud analysis
4. Manager approval (if flagged)
5. Execution + blockchain audit

### Fraud Detection (ML Service)
- Feature-based weighted scoring (0–100)
- Risk levels: SAFE → SUSPICIOUS → HIGH_RISK → BLOCKED
- Features: amount, frequency, location mismatch, time-of-day, account age, device change, failed logins, prior fraud flags

### Blockchain Audit
- SHA-256 hashed immutable chain
- Chain integrity validation
- All security events logged

### Dashboards
- **User**: Balance, transactions, risk score, alerts
- **Manager**: Pending approvals, risk review panel
- **Admin**: Global stats, charts, user management, fraud logs, blockchain viewer, login attempts

---

## Setup

### Prerequisites
- Node.js v18+
- Python 3.10+
- MongoDB Atlas account

### 1. Clone & Configure

```bash
# Backend
cd backend
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, ML_API_URL, CLIENT_URL

# Frontend
cd frontend
cp .env.example .env
# Fill in VITE_API_URL

# ML Service
cd ml-service
cp .env.example .env
```

### 2. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install

# ML Service
cd ml-service && pip install -r requirements.txt
```

### 3. Run Locally

```bash
# Terminal 1 — ML Service
cd ml-service
uvicorn main:app --reload --port 8000

# Terminal 2 — Backend
cd backend
npm run dev

# Terminal 3 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- ML Service: http://localhost:8000

---

## Deployment

### ML Service → Render
1. Create new **Web Service** on Render
2. Set build command: `pip install -r requirements.txt`
3. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add env var: `PORT=8000`
5. Copy the service URL → use as `ML_API_URL` in backend

### Backend → Render
1. Create new **Web Service** on Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add all env vars from `.env.example`
5. Set `ML_API_URL` to your ML service URL
6. Set `CLIENT_URL` to your Vercel frontend URL
7. Copy the service URL → use as `VITE_API_URL` in frontend

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add env var: `VITE_API_URL` = your Render backend URL

### Database → MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com
2. Create a database user
3. Whitelist IPs (or allow all: 0.0.0.0/0)
4. Copy connection string → `MONGO_URI` in backend

---

## Environment Variables

### Backend `.env`
```
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/banking_platform
JWT_SECRET=your_32_char_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
ML_API_URL=https://your-ml-service.onrender.com
CLIENT_URL=https://your-frontend.vercel.app
NODE_ENV=production
OTP_EXPIRY_MINUTES=2
ACCOUNT_LOCK_MINUTES=2
MAX_LOGIN_ATTEMPTS=3
```

### Frontend `.env`
```
VITE_API_URL=https://your-backend.onrender.com
```

---

## Default Roles
- **user** — Can send money, view transactions
- **manager** — Can approve/reject flagged transactions
- **admin** — Full system access

To make someone an admin: Use the Admin Panel → Users tab → change role dropdown.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | Public | Register |
| POST | /api/auth/login | Public | Login step 1 |
| POST | /api/auth/verify-otp | Public | Login step 2 (OTP) |
| POST | /api/auth/refresh | Public | Refresh access token |
| POST | /api/auth/logout | User | Logout |
| GET | /api/user/balance | User | Get balance |
| GET | /api/user/notifications | User | Get notifications |
| POST | /api/transactions/initiate | User | Start transaction |
| POST | /api/transactions/verify-otp | User | Confirm with OTP |
| GET | /api/transactions | User | List transactions |
| POST | /api/transactions/manager/approve | Manager | Approve/reject |
| GET | /api/admin/dashboard | Admin | Global stats |
| GET | /api/admin/users | Admin | All users |
| GET | /api/admin/fraud-logs | Admin | Fraud log list |
| GET | /api/admin/blockchain | Admin | Blockchain chain |

---

## Notes

- **OTP in Dev Mode**: The OTP is returned in the API response for development. In production, integrate Twilio/SendGrid and remove from response.
- **ML Service**: Uses a pure Python rule-based weighted scoring system — no scikit-learn or pandas required.
- **Blockchain**: In-memory for this implementation. For production, persist blocks to MongoDB.
