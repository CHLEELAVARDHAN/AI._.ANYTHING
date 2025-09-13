import React, { useEffect, useRef, useState } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Hands } from "@mediapipe/hands";
import * as drawing from "@mediapipe/drawing_utils";

function VisionAI({ onDetect, onExit }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [mood, setMood] = useState("neutral");
  const [gesture, setGesture] = useState(null);

  const moodRef = useRef(mood);
  const gestureRef = useRef(gesture);
  useEffect(() => { moodRef.current = mood; }, [mood]);
  useEffect(() => { gestureRef.current = gesture; }, [gesture]);

  const faceMeshRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);

  const moodColors = {
    happy: "yellow",
    sad: "blue",
    angry: "orange",
    surprised: "purple",
    neutral: "gray"
  };

  // ---- Mood detection + accuracy
  function detectMoodWithAccuracy(landmarks) {
    const leftMouth = landmarks[61];
    const rightMouth = landmarks[291];
    const topLip = landmarks[13];
    const bottomLip = landmarks[14];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const leftEyebrow = landmarks[105];
    const rightEyebrow = landmarks[334];

    const faceWidth = Math.abs(rightEye.x - leftEye.x) || 1;
    const mouthWidth = Math.abs(rightMouth.x - leftMouth.x) / faceWidth;
    const mouthOpen = Math.abs(bottomLip.y - topLip.y) / faceWidth;
    const eyebrowRaise = ((leftEye.y - leftEyebrow.y) + (rightEye.y - rightEyebrow.y)) / 2 / faceWidth;
    const mouthCornersDown = (leftMouth.y > topLip.y && rightMouth.y > topLip.y);

    let mood = "neutral";
    let accurate = true;

    if (mouthWidth > 0.6) mood = "happy";
    else if (mouthOpen > 0.25) mood = "surprised";
    else if (eyebrowRaise > 0.10) mood = "angry";
    else if (mouthCornersDown) mood = "sad";
    else accurate = false;

    // Threshold validation for confidence
    if ((mood === "happy" && mouthWidth < 0.55) ||
        (mood === "surprised" && mouthOpen < 0.2) ||
        (mood === "angry" && eyebrowRaise < 0.08) ||
        (mood === "sad" && !mouthCornersDown)) accurate = false;

    return { mood, accurate };
  }

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({ maxNumFaces: 1 });
    faceMeshRef.current = faceMesh;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({ maxNumHands: 1 });
    handsRef.current = hands;

    faceMesh.onResults((results) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      if (results.multiFaceLandmarks?.length > 0) {
        const lm = results.multiFaceLandmarks[0];
        drawing.drawConnectors(ctx, lm, null, { color: "#0f0" });

        const { mood: detectedMood, accurate } = detectMoodWithAccuracy(lm);
        setMood(detectedMood);

        // Draw box on face with mood color + accuracy border
        let minX = Math.min(...lm.map(p => p.x)) * canvas.width;
        let maxX = Math.max(...lm.map(p => p.x)) * canvas.width;
        let minY = Math.min(...lm.map(p => p.y)) * canvas.height;
        let maxY = Math.max(...lm.map(p => p.y)) * canvas.height;

        ctx.fillStyle = moodColors[detectedMood];
        ctx.globalAlpha = 0.2;
        ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = accurate ? "green" : "red";
        ctx.lineWidth = 3;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      }
    });

    hands.onResults((results) => {
      if (results.multiHandLandmarks?.length > 0) {
        const lm = results.multiHandLandmarks[0];
        drawing.drawConnectors(ctx, lm, null, { color: "#f00" });

        const thumb = lm[4];
        const index = lm[8];
        let detectedGesture = null;
        if (thumb.y < index.y) detectedGesture = "thumbs_up";

        setGesture(detectedGesture);
      }
    });

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => video.play().catch(err => console.warn("Video play blocked:", err));
    }).catch(err => console.error("Camera access error:", err));

    const camera = new Camera(video, {
      onFrame: async () => {
        try { await faceMesh.send({ image: video }); await hands.send({ image: video }); }
        catch (err) { console.error("Mediapipe send error:", err); }
      },
      width: 400,
      height: 300,
    });
    cameraRef.current = camera;
    camera.start();

    return () => cleanup();
  }, []);

  const cleanup = () => {
    if (cameraRef.current) try { cameraRef.current.stop(); } catch {}
    if (faceMeshRef.current) try { faceMeshRef.current.close(); } catch {}
    if (handsRef.current) try { handsRef.current.close(); } catch {}
    const v = videoRef.current;
    if (v?.srcObject) try { v.srcObject.getTracks().forEach(t => t.stop()); } catch {}
    if (v) v.srcObject = null;
  };

  const handleCaptureClick = () => {
    const currentMood = moodRef.current;
    const currentGesture = gestureRef.current;
    if (currentMood && currentMood !== "neutral") {
      onDetect?.({
        mood: currentMood,
        gesture: currentGesture,
        aiMessage: `The user looks ${currentMood}.Ask him Why..`, 
      });
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "10px" }}>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} width={400} height={300} />
      <p>Mood: {mood} | Gesture: {gesture || "None"}</p>

      <button onClick={handleCaptureClick} style={{
        background: "transparent", border: "2px solid #555", color: "#333",
        padding: "8px 16px", borderRadius: "12px", cursor: "pointer", margin: "5px",
        transition: "all 0.3s ease"
      }}
        onMouseOver={(e) => (e.target.style.background = "rgba(0,0,0,0.05)")}
        onMouseOut={(e) => (e.target.style.background = "transparent")}>
        📸 Capture Mood
      </button>

      <button onClick={() => { cleanup(); onExit?.(); }} style={{
        background: "transparent", border: "2px solid red", color: "red",
        padding: "8px 16px", borderRadius: "12px", cursor: "pointer", margin: "5px",
        transition: "all 0.3s ease"
      }}
        onMouseOver={(e) => (e.target.style.background = "rgba(255,0,0,0.1)")}
        onMouseOut={(e) => (e.target.style.background = "transparent")}>
        Exit
      </button>
    </div>
  );
}

export default VisionAI;
