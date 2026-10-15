Motorcycle Helmet Compliance Detection System

A full-stack computer vision system built with YOLOv8, FastAPI, and React (Vite) for real-time motorcycle helmet compliance monitoring. The architecture decouples PyTorch model inference into an asynchronous REST microservice paired with a clean web dashboard.

System Architecture:
HelmetDetection/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── services/api.js
│   │   └── App.jsx
│   └── vite.config.js
├── models/
│   └── best.pt
├── Dockerfile
└── docker-compose.yml

Key Engineering Highlights:
- Singleton Model Initialization: Loads best.pt into memory once at server startup, avoiding redundant weight loading across concurrent HTTP requests.
- Dynamic Hyperparameter Tuning: Real-time adjustment of Confidence (conf) and Non-Maximum Suppression IoU (iou) thresholds directly from the UI.
- Structured Telemetry & Audit Export: Returns bounding box coordinates, class distributions, inference latency (ms), and downloadable CSV logs alongside Base64-encoded annotated frames.
- ABI-Safe Environment Pinning: Pinned numpy==1.26.4 (numpy<2) to guarantee C-extension compatibility between PyTorch and OpenCV on macOS/Linux x86_64 architectures.

Local Quickstart:

1. Start the FastAPI Backend:
cd backend
source ../venv/bin/activate
uvicorn app.main:app --reload --port 8000

2. Start the React Frontend:
cd frontend
npm install
npm run dev

3. Docker Deployment:
docker compose up --build
