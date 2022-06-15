import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import './App.css';

import '@mediapipe/face_mesh';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

function App() {
  const [tracks, setTracks] = useState<any[]>([]);
  const canvasRef = useRef(null);
  const webcamRef = useRef<Webcam>(null);
  const [detector, setDetector] = useState <any>(null);
  const camWidth = 720;
  const camHeight = 720;

  useEffect(() => {
    async function loadModel() {
      const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      const detectorConfig: faceLandmarksDetection.MediaPipeFaceMeshMediaPipeModelConfig = {
        refineLandmarks: false,
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
    tracks.forEach(track => {
      const canvas = canvasRef.current as any;
      const ctx = canvas.getContext('2d');
      ctx.fillRect(...track);
    });
  }, [tracks])

  const videoConstraints = {
    facingMode: "user",
    height: camWidth,
    width: camHeight,
  };

  function draw(points: any) {
    if (canvasRef.current) {
      const [, , middlePoint] = points;
      const [x, y] = middlePoint;
      const xCam = (x * 100) / camWidth; // * 1.2
      const yCam = (y * 100) / camHeight;


      const newPoint = (tracks: number[][], xCam: number, yCam: number) => {
        const margin = 0;
        let lastX = margin;
        let lastY = margin;
        if (tracks.length > 0) {
          [lastX, lastY] = tracks.reverse()[0];
        }

        const newX = ((xCam) - lastX) * (window.innerWidth / 100);
        const newY = ((yCam) - lastY) * (window.innerHeight / 100);
        console.log(newX, newY);

        return [newX, newY, 2, 2];
      }

      setTracks(tracks => [...tracks, newPoint(tracks ,xCam, yCam)]);
    }
  }

  useEffect(() => {
    async function detect() {
      if (webcamRef.current) {
        const webcamCurrent = webcamRef.current as any;
        if (webcamCurrent.video.readyState === 4) {
          const video = webcamRef.current.video;
          const predictions = await detector.estimateFaces(video, {flipHorizontal: false});
          if (predictions.length > 0) {
            console.log(predictions[0]);
            debugger;
            // const { leftEyeIris } = predictions[0].annotations;
            // draw(leftEyeIris);
          }
        }
      }
    }
  
    const interval = setInterval(() => {
      if (detector && webcamRef) {
        console.log("try to detect")
        detect();
      }
    }, 60);

    return () => clearInterval(interval);
  }, [detector]);

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
