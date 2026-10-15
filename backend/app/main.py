from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from app.services.detector import detector

app = FastAPI(title="Helmet Compliance AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {"status": "online", "model_loaded": True, "classes": detector.model.names}

@app.post("/api/predict/image")
async def predict_image(
    file: UploadFile = File(...),
    conf: float = Query(0.45, ge=0.1, le=1.0),
    iou: float = Query(0.45, ge=0.1, le=1.0)
):
    image_bytes = await file.read()
    return detector.predict_image(image_bytes, conf=conf, iou=iou)
