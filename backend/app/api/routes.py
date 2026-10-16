from fastapi import APIRouter, File, UploadFile, Query, HTTPException
from app.services.detector import detector_service
from app.schemas.detection import DetectionResponse

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": detector_service.is_ready()
    }

@router.post("/predict/image", response_model=DetectionResponse)
async def predict_image(
    file: UploadFile = File(...),
    conf: float = Query(0.35, ge=0.05, le=1.0),
    iou: float = Query(0.45, ge=0.05, le=1.0)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a supported image.")
    
    await file.seek(0)
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file payload.")

    try:
        results = detector_service.predict_image(contents, conf=conf, iou=iou)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
