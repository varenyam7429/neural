import { useEffect, useState, useRef } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export default function useFaceTracking(videoRef) {
  const [metrics, setMetrics] = useState({
    faceDetected: false,
    lookingAwayPercent: 0,
    centeredPercent: 100,
    blinkRate: 0,
    presenceScore: 70,
  });

  const faceLandmarkerRef = useRef(null);

  useEffect(() => {
    let interval;

    const init = async () => {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const faceLandmarker = await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-assets/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        }
      );

      faceLandmarkerRef.current = faceLandmarker;

      interval = setInterval(() => {
        if (!videoRef.current || !faceLandmarkerRef.current) return;

        const result = faceLandmarkerRef.current.detectForVideo(
          videoRef.current,
          Date.now()
        );

        if (result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0];

          const leftEye = landmarks[33];
          const rightEye = landmarks[263];

          const dx = Math.abs(leftEye.x - rightEye.x);

          const lookingAway = dx < 0.05;

          const newPresence = lookingAway ? 55 : 85;

          setMetrics({
            faceDetected: true,
            lookingAwayPercent: lookingAway ? 60 : 10,
            centeredPercent: lookingAway ? 40 : 90,
            blinkRate: Math.floor(Math.random() * 10 + 12),
            presenceScore: newPresence,
          });
        } else {
          setMetrics((prev) => ({
            ...prev,
            faceDetected: false,
            presenceScore: 50,
          }));
        }
      }, 500);
    };

    init();

    return () => clearInterval(interval);
  }, [videoRef]);

  return metrics;
}