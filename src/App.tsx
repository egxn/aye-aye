import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import './App.css';

import '@mediapipe/face_mesh';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

function App() {
  const IRIS = "leftIris";
  const EYE = "leftEye";
  const [eyeBounds, setEyeBounds] = useState<{left: number, right: number, top: number, bottom: number} | null>(null);
  const [point, setPoint] = useState<{x: number, y:number} | null>(null);
  const canvasRef = useRef(null);
  const webcamRef = useRef<Webcam>(null);
  const [detector, setDetector] = useState <faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const camWidth = 720;
  const camHeight = 720;

  useEffect(() => {
    async function loadModel() {
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
        refineLandmarks: true,
        runtime: 'mediapipe', // or 'tfjs'
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
      }
      const detector = await faceLandmarksDetection.createDetector(model, detectorConfig);

      setDetector(detector);
    }

    loadModel();
  }, []);

  useEffect(() => {
    if (canvasRef) {
      const canvas = canvasRef.current as any;
      const ctx = canvas.getContext('2d');
      const {innerWidth, innerHeight} = window;
      const { width, height } = ctx.canvas.width;
      if (width !== innerWidth || height !== innerHeight) {
        ctx.canvas.width = innerWidth;
        ctx.canvas.height = innerHeight;
      }
    }
  }, [canvasRef]);


  useEffect(() => {
    const canvas = canvasRef.current as any;
    const ctx = canvas.getContext('2d');

    if (eyeBounds && point) {
      const {x, y} = point;
      const {left, right, top, bottom} = eyeBounds;
      const pointX = ((((x-left) * 100) / (right - left)) / 100) * canvas.width;
      const pointY = ((((y-top)  * 100) / (bottom - top)) / 100) * canvas.height;
      // @TODO pointY
      ctx.fillRect(pointX, camHeight / 2 ,2,2);
    }
  }, [eyeBounds, point])

  const videoConstraints = {
    facingMode: "user",
    height: camWidth,
    width: camHeight,
  };

  function draw(
    newPoint: { x: number, y: number },
    bounds: { left: number, right: number, top: number, bottom: number},
    point: { x: number, y: number} | null) {
    if (canvasRef.current) {
      setPoint(newPoint);
      if (!point || (newPoint?.x > point?.x + 10) ) {
        setEyeBounds(bounds);
      }
    }
  }

  useEffect(() => {
    async function detect() {
      if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.readyState === 4 && detector) {
        const predictions = await detector.estimateFaces(webcamRef.current.video, {flipHorizontal: false});
        if (predictions.length > 0) {
          const eyeBoundsX = predictions[0].keypoints
            .filter(({ name }) => name === EYE)
            .sort((a, b) => a.x - b.x)
            .map(({ x }) => x);

          const eyeBoundsY = predictions[0].keypoints
            .filter(({ name }) => name === EYE)
            .sort((a, b) => a.y - b.y)
            .map(({ y }) => y);

          const [left] = eyeBoundsX;
          const [right] = eyeBoundsX.slice(-1);
          const [top] = eyeBoundsY;
          const [bottom] = eyeBoundsY.slice(-1);

          const { x, y, i } = predictions[0].keypoints
            .filter(({ name }) => name === IRIS)
            .reduce<{ x: number, y:number, i: number }>
              ((acc, { x, y }) => ({ x: acc.x + x, y: acc.y + y, i: acc.i + 1 }), { x: 0, y: 0, i: 0 });

          draw({ x: x / i, y: y / i }, {left, right, top, bottom}, point);
        }
      }
    }
  
    const interval = setInterval(() => {
      if (detector && webcamRef) {
        detect();
      }
    }, 60);

    return () => clearInterval(interval);
  }, [detector, eyeBounds, point]);

  return (
    <div className="App">
      <canvas className="canvas" ref={canvasRef} />
      <Webcam 
        audio={false} 
        className="cam"
        ref={webcamRef} 
        videoConstraints={videoConstraints} 
      />
    </div>
  );
}

export default App;
