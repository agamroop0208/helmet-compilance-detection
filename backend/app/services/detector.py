import time
import base64
import gc
import cv2
import numpy as np
import torch
from ultralytics import YOLO
from app.core.config import MODEL_PATH

class HelmetDetectorService:
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HelmetDetectorService, cls).__new__(cls)
            torch.set_num_threads(2)
            torch.set_num_interop_threads(1)
            cls._model = YOLO(str(MODEL_PATH))
            # Warmup inference to initialize CUDA/CPU graph caches
            dummy = np.zeros((320, 320, 3), dtype=np.uint8)
            cls._model.predict(source=dummy, imgsz=320, verbose=False)
        return cls._instance

    def is_ready(self) -> bool:
        return self._model is not None

    def predict_image(self, image_bytes: bytes, conf: float = 0.35, iou: float = 0.45) -> dict:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Invalid image file buffer.")

        h, w = frame.shape[:2]
        max_dim = 640
        if max(h, w) > max_dim:
            scale = max_dim / float(max(h, w))
            frame = cv2.resize(frame, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

        start = time.perf_counter()
        with torch.no_grad():
            results = self._model.predict(
                source=frame,
                conf=conf,
                iou=iou,
                imgsz=320,
                device="cpu",
                verbose=False
            )
        inference_ms = round((time.perf_counter() - start) * 1000, 2)

        res = results[0]
        annotated_bgr = res.plot()

        encode_params = [int(cv2.IMWRITE_JPEG_QUALITY), 80]
        _, buffer = cv2.imencode(".jpg", annotated_bgr, encode_params)
        b64_img = base64.b64encode(buffer).decode("utf-8")

        detections = []
        class_counts = {}
        names = res.names

        if res.boxes is not None:
            for box in res.boxes:
                cls_id = int(box.cls[0].item())
                cls_name = names.get(cls_id, f"class_{cls_id}")
                score = round(float(box.conf[0].item()), 4)
                coords = [round(float(x), 1) for x in box.xyxy[0].tolist()]

                class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
                detections.append({
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": score,
                    "bbox": coords
                })

        del results, res, frame, annotated_bgr
        gc.collect()

        return {
            "total_objects": len(detections),
            "class_counts": class_counts,
            "inference_time_ms": inference_ms,
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{b64_img}"
        }

detector_service = HelmetDetectorService()
