import React, { useEffect, useRef, useState } from 'react';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import Webcam from 'react-webcam';
import './App.css';

import '@tensorflow/tfjs-backend-webgl';

function App() {
  const [tracks, setTracks] = useState<any[]>([]);
  const canvasRef = useRef(null);
  const webcamRef = useRef<Webcam>(null);
  const [model, setModel] = useState <any>(null);
  const camWidth = 720;
  const camHeight = 720;

  useEffect(() => {
    async function loadModel() {
      const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedPackages.mediapipeFacemesh);
      setModel(model);
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
      const {innerWidth, innerHeight} = window;
      points.forEach((point: any) => {
        const [x, y] = point;
        setTracks([...tracks, [ ((x * 100) / camWidth) * (innerWidth / 100), ((y * 100) / camHeight) * (innerHeight / 100), 2, 1]]);
      });  
    }
  }

  async function detect() {
    if (webcamRef.current) {
      const webcamCurrent = webcamRef.current as any;
      if (webcamCurrent.video.readyState === 4) {
        const video = webcamRef.current.video;
        const predictions = await model.estimateFaces({ input: video });        
        if (predictions.length > 0) {
          const { leftEyeIris } = predictions[0].annotations;
          draw(leftEyeIris);
        }
      }
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (model && webcamRef) {
        detect();
      }
    }, 60);

    return () => clearInterval(interval);
  }, [model]);

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
