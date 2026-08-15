from ultralytics import YOLO
import os

model = YOLO("models/best.pt")

test_dir = "dataset/test/images"
image_files = os.listdir(test_dir)[:5]
#print("Found images:", image_files[:5])  # show first 5 filenames to confirm

#first_image = os.path.join(test_dir, image_files[0])
##print("Using:", first_image)

#results = model(first_image)
#results[0].show()
#results[0].save("output.jpg")

for img_name in image_files:
    img_path = os.path.join(test_dir, img_name)
    results = model(img_path)
    results[0].save(f"output_{img_name}")

print("Done — check output_*.jpg files")