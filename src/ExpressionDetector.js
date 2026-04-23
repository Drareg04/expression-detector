import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

// Dimensions del vídeo
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

// Traduccions de les expressions per mostrar a l'usuari
const expressionTranslations = {
  neutral: 'Neutral',
  happy: 'Feliç 😊',
  sad: 'Trist 😢',
  angry: 'Enfadat 😠',
  fearful: 'Espantat 😨',
  disgusted: 'Disgustat 🤢',
  surprised: 'Sorprès 😮',
};

// Mapa d'emocions a colors (Reacció 1)
const emotionColorMap = {
  happy: '#a5d6a5',      // Verd clar
  angry: '#ef9a9a',      // Vermell clar
  sad: '#90caf9',        // Blau clar
  neutral: '#e0e0e0',    // Gris clar
  fearful: '#ce93d8',    // Lila
  disgusted: '#a1887f',  // Marró clar
  surprised: '#fff176',  // Groc clar
  default: '#f0f0f0',    // Color per defecte (sense rostre)
};

const ExpressionDetector = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectedExpression, setDetectedExpression] = useState('Detectant...');
  const [currentEmotion, setCurrentEmotion] = useState('default'); // per al color de fons
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // 1. Carregar models d'IA
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      console.log('Carregant models...');
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('Models carregats correctament.');
      } catch (error) {
        console.error('Error carregant els models:', error);
      }
    };
    loadModels();

    // Neteja l'interval en desmuntar el component
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 2. Funció per iniciar la detecció en temps real
  const startDetection = () => {
    // Evitar múltiples intervals (si la càmera es reinicia)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (webcamRef.current && webcamRef.current.video && canvasRef.current && modelsLoaded) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        const displaySize = { width: VIDEO_WIDTH, height: VIDEO_HEIGHT };
        faceapi.matchDimensions(canvas, displaySize);

        // Detecció: rostre, punts facials i expressions
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        if (detections.length > 0) {
          const expressions = detections[0].expressions;
          // Emoció dominant (clau en anglès)
          const dominantEmotionKey = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );

          // Actualitzar estat per al text i per al color
          setDetectedExpression(expressionTranslations[dominantEmotionKey] || dominantEmotionKey);
          setCurrentEmotion(dominantEmotionKey);

          // Dibuixar resultats al canvas (inclou els 68 punts facials)
          const resizedDetections = faceapi.resizeResults(detections, displaySize);
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);

          // Dibuixar rectangle de la cara
          faceapi.draw.drawDetections(canvas, resizedDetections);
          // Dibuixar l'expressió (text + probabilitat)
          faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
          // ** REACCIÓ 2: Dibuixar els 68 punts facials (ulls, nas, boca) **
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        } else {
          setDetectedExpression('Sense rostre detectat');
          setCurrentEmotion('default');
          // Netejar el canvas si no hi ha detecció
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 500); // Actualització cada 500ms per a un rendiment fluid
  };

  // 3. Funció que s'activa quan la càmera està llesta
  const handleVideoOnPlay = () => {
    startDetection();
  };

  // 4. Determinar el color de fons segons l'emoció (Reacció 1)
  const backgroundColor = emotionColorMap[currentEmotion] || emotionColorMap.default;

  // 5. Renderitzar la interfície
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: backgroundColor,    // Color dinàmic
        transition: 'background-color 0.3s ease', // Transició suau
        padding: '20px',
      }}
    >
      <h2>El Reflex de l'Emoció - Interfície Natural</h2>
      {!modelsLoaded ? (
        <p>Carregant models d'IA, si us plau, espereu...</p>
      ) : (
        <p style={{ fontWeight: 'bold', color: 'green' }}>✅ Models Carregats!</p>
      )}

      {/* Contenidor per a la webcam i el canvas superposat */}
      <div style={{ position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT, boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
        <Webcam
          ref={webcamRef}
          audio={false}
          width={VIDEO_WIDTH}
          height={VIDEO_HEIGHT}
          videoConstraints={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, facingMode: 'user' }}
          onUserMedia={handleVideoOnPlay}
          style={{ position: 'absolute', top: 0, left: 0, borderRadius: '8px' }}
        />
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, borderRadius: '8px' }}
        />
      </div>

      {modelsLoaded && (
        <h3 style={{ marginTop: '20px', fontSize: '1.8rem', textShadow: '1px 1px white' }}>
          😀 Estat d'ànim detectat: {detectedExpression}
        </h3>
      )}
    </div>
  );
};

export default ExpressionDetector;