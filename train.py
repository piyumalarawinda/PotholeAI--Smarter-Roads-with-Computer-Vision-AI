from ultralytics import YOLO

model = YOLO("yolo11n.pt")

results = model.train(
    data="dataset/data.yaml",
    epochs=20,
    imgsz=640,
    batch=16,
    name="pothole_detector"
)