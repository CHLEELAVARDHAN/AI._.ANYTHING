# server.py
import os, io, base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import cv2
from deepface import DeepFace

app = Flask(__name__)
CORS(app)

# -------------------- Config --------------------
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max

# -------------------- Emotion API --------------------
@app.route("/api/emotion", methods=["POST"])
def emotion_api():
    data = request.get_json(silent=True)
    if not data or "image" not in data:
        return jsonify({"error": "image (base64) required"}), 400

    b64 = data["image"].split(",", 1)[1] if "," in data["image"] else data["image"]

    try:
        img_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        frame = np.array(img)
        frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

        result = DeepFace.analyze(frame_bgr, actions=['emotion'], enforce_detection=False)
        if isinstance(result, list):
            result = result[0]

        emotion = result['dominant_emotion']
        scores = result['emotion']
        confidence = float(scores[emotion])

        return jsonify({"emotion": emotion, "scores": scores, "confidence": confidence})
    except Exception as e:
        return jsonify({"error": f"emotion inference failed: {e}"}), 500

# -------------------- Simple Chat API --------------------
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    user_msg = data.get("message", "")
    return jsonify({"reply": f"AI says: {user_msg}"})

# -------------------- File Upload --------------------
@app.route("/upload-file", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    return jsonify({"message": f"File {file.filename} uploaded successfully"})

# -------------------- Folder Upload --------------------
@app.route("/upload-folder", methods=["POST"])
def upload_folder():
    print("Files received:", request.files)
    files = request.files.getlist("files") or request.files.getlist("files[]")
    if not files:
        return jsonify({"error": "No files provided"}), 400
    saved_files = []
    for f in files:
        path = os.path.join(app.config['UPLOAD_FOLDER'], f.filename)
        f.save(path)
        saved_files.append(f.filename)
    return jsonify({"message": f"{len(saved_files)} files uploaded", "files": saved_files})

# -------------------- Run Server --------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
