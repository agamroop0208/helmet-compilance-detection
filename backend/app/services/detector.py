import cv2
import base64
import time
import numpy as np
from pathlib import Path
from ultralytics import YOLO

class HelmetDetector:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(HelmetDetector, cls).__new__(cls)
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            model_path = base_dir / "models" / "best.pt"
            if not model_path.exists():
                raise FileNotFoundError(f"Model weights not found at {model_path}")
            cls._instance.model = YOLO(str(model_path))
        return cls._instance

    def predict_image(self, image_bytes: bytes, conf: float = 0.45, iou: float = 0.45):
        np_arr = np.frombuffer(image_bytes, np.uint8)
        orig_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        t0 = time.perf_counter()
        results = self.model.predict(source=orig_bgr, conf=conf, iou=iou, verbose=False)
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        counts = {"helmet": 0, "no_helmet": 0, "person": 0}
        detections = []

        if results and len(results[0].boxes) > 0:
            boxes = results[0].boxes
            for i in range(len(boxes)):
                cls_id = int(boxes.cls[i].item())
                score = round(float(boxes.conf[i].item()), 3)
                label = self.model.names.get(cls_id, str(cls_id)).lower()
                bbox = [round(x, 1) for x in boxes.xyxy[i].tolist()]

                if "no" in label or "without" in label:
                    counts["no_helmet"] += 1
                elif "helmet" in label:
                    counts["helmet"] += 1
                elif "person" in label or "rider" in label or "motor" in label:
                    counts["person"] += 1

                detections.append({
                    "id": i + 1,
                    "class_name": self.model.names.get(cls_id, str(cls_id)),
                    "confidence": score,
                    "bbox": bbox
                })

        annotated_bgr = results[0].plot()
        _, buffer = cv2.imencode(".jpg", annotated_bgr)
        b64_img = base64.b64encode(buffer).decode("utf-8")

        return {
            "status": "VIOLATION" if counts["no_helmet"] > 0 else "COMPLIANT",
            "latency_ms": latency_ms,
            "fps": round(1000.0 / max(latency_ms, 1), 1),
            "counts": counts,
            "detections": detections,
            "annotated_image": f"data:image/jpeg;base64,{b64_img}"
        }

detector = HelmetDetector()
