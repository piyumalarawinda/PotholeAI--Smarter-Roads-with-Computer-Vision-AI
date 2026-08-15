import time
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

model = YOLO("models/best.pt")

@app.get("/")
def home():
    return {"status": "Pothole Detection API is running"}

@app.post("/detect")
async def detect(file: UploadFile = File(...), conf: float = 0.25):
    image_bytes = await file.read()
    image = Image.open(io.BytesIO(image_bytes))

    start_time = time.perf_counter()
    results = model(image, conf=conf)
    inference_time_ms = (time.perf_counter() - start_time) * 1000

    boxes = results[0].boxes
    detections = []
    
    for b in boxes:
        x1, y1, x2, y2 = b.xyxy[0].tolist()
        conf_val = float(b.conf[0])
        cls_id = int(b.cls[0])
        cls_name = model.names[cls_id] if hasattr(model, 'names') and cls_id in model.names else "pothole"
        detections.append({
            "confidence": conf_val,
            "bbox": [round(x, 1) for x in [x1, y1, x2, y2]],
            "class": cls_name
        })

    # Get annotated image as numpy array, convert to PIL
    result_img_array = results[0].plot()
    result_img = Image.fromarray(result_img_array[..., ::-1])  # BGR to RGB

    # Encode as base64 so it can be sent in JSON
    buffered = io.BytesIO()
    result_img.save(buffered, format="JPEG")
    img_base64 = base64.b64encode(buffered.getvalue()).decode()

    return {
        "count": len(boxes),
        "detections": detections,
        "image": img_base64,
        "inference_time_ms": round(inference_time_ms, 2)
    }