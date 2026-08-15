import streamlit as st
from ultralytics import YOLO
from PIL import Image
import numpy as np
import time

# Page config
st.set_page_config(
    page_title="Pothole Detector",
    page_icon="🕳️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .main {
        background-color: #0e1117;
    }
    .stApp {
        background: linear-gradient(135deg, #faf6f0 0%, #f0e9de 100%);
    }
  h1 {
    color: #ffffff;
    text-align: center;
    font-weight: 800;
    font-size: 42px;
    padding-bottom: 0px;
    letter-spacing: 2px;
    text-transform: uppercase;
}
    .subtitle {
        text-align: center; /*Upload a road image and let AI find the potholes instantly*/
        color: #a0a0c0;
        font-size: 18px;
        margin-bottom: 30px;
    }
    .stButton>button {
        background: linear-gradient(90deg, #ff6b6b, #ee5253);
        color: white;
        border-radius: 12px;
        border: none;
        padding: 12px 30px;
        font-weight: 600;
        font-size: 16px;
        width: 100%;
        transition: all 0.3s;
    }
    .stButton>button:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 15px rgba(238, 82, 83, 0.4);
    }
    .metric-card {
        background: rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .metric-card h2 {
    color: #ffffff;
    font-size: 32px;
    margin: 0;
}
.metric-card p {
    color: #c0c0d8;
    margin: 5px 0 0 0;
    font-size: 14px;
}
    .detection-item {
        background: rgba(255, 107, 107, 0.15);
        border-left: 4px solid #ff6b6b;
        border-radius: 8px;
        padding: 10px 15px;
        margin: 8px 0;
        color: #ffffff;
        font-size: 15px;
    }
    [data-testid="stFileUploader"] {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 16px;
        padding: 20px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
    }
    </style>
""", unsafe_allow_html=True)

# Load model
@st.cache_resource
def load_model():
    return YOLO("models/best.pt")

model = load_model()

# Header
st.markdown("<h1>🕳️ Pothole Detection AI</h1>", unsafe_allow_html=True)
st.markdown("<p class='subtitle'>Upload a road image and let AI find the potholes instantly</p>", unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.markdown("### ⚙️ Settings")
    confidence_threshold = st.slider("Confidence Threshold", 0.0, 1.0, 0.25, 0.05)
    st.markdown("---")
    st.markdown("### 📊 Model Info")
    st.info("**Model:** YOLOv11 Nano\n\n**Task:** Object Detection\n\n**Class:** Pothole")
    st.markdown("---")
    st.markdown("### ℹ️ About")
    st.write("This app uses a custom-trained YOLO model to detect potholes in road images in real-time.")

# Main layout
col1, col2 = st.columns([1, 1], gap="large")

with col1:
    st.markdown("#### 📤 Upload Image")
    uploaded_file = st.file_uploader("", type=["jpg", "jpeg", "png"], label_visibility="collapsed")

    if uploaded_file is not None:
        image = Image.open(uploaded_file)
        st.image(image, use_container_width=True)
        detect_btn = st.button("🔍 Detect Potholes")

with col2:
    st.markdown("#### 🎯 Detection Result")

    if uploaded_file is not None and 'detect_btn' in dir() and detect_btn:
        with st.spinner("Analyzing image..."):
            time.sleep(0.3)
            results = model(np.array(image), conf=confidence_threshold)
            result_img = results[0].plot()

        st.image(result_img, use_container_width=True)

        boxes = results[0].boxes
        num_detections = len(boxes)

        st.markdown("---")
        m1, m2, m3 = st.columns(3)
        with m1:
            st.markdown(f"<div class='metric-card'><h2>{num_detections}</h2><p>Potholes Found</p></div>", unsafe_allow_html=True)
        with m2:
            avg_conf = float(np.mean([float(b.conf[0]) for b in boxes])) if num_detections > 0 else 0
            st.markdown(f"<div class='metric-card'><h2>{avg_conf:.0%}</h2><p>Avg Confidence</p></div>", unsafe_allow_html=True)
        with m3:
            severity = "High" if num_detections > 3 else "Moderate" if num_detections > 0 else "None"
            st.markdown(f"<div class='metric-card'><h2>{severity}</h2><p>Road Risk</p></div>", unsafe_allow_html=True)

        if num_detections > 0:
            st.markdown("#### 📋 Detection Details")
            for i, box in enumerate(boxes):
                conf = float(box.conf[0])
                st.markdown(f"<div class='detection-item'>🕳️ Pothole {i+1} — {conf:.1%} confidence</div>", unsafe_allow_html=True)
        else:
            st.success("✅ No potholes detected — road looks clear!")
    else:
        st.markdown(
            "<div style='text-align:center; padding: 60px 20px; color: #6b7280;'>"
            "Upload an image and click Detect to see results here"
            "</div>", unsafe_allow_html=True
        )

# Footer
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color: #6b7280; font-size: 14px;'>Built with YOLOv11 & Streamlit</p>",
    unsafe_allow_html=True
)