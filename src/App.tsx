import React, { useState, useRef } from 'react';
import { Stage, Layer, Circle, Text, Group } from 'react-konva';
import Konva from 'konva';
import './App.css';

interface ToothData {
  id: number;
  status: 'healthy' | 'cavity' | 'filled' | 'missing';
  x: number;
  y: number;
}

interface Annotation {
  id: string;
  text: string;
  x: number;
  y: number;
}

const App: React.FC = () => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [teeth, setTeeth] = useState<ToothData[]>(() => {
    const initialTeeth: ToothData[] = [];
    
    // Upper teeth (1-16)
    for (let i = 1; i <= 16; i++) {
      initialTeeth.push({
        id: i,
        status: 'healthy',
        x: 50 + (i - 1) * 45,
        y: 100
      });
    }
    
    // Lower teeth (17-32)
    for (let i = 17; i <= 32; i++) {
      initialTeeth.push({
        id: i,
        status: 'healthy',
        x: 50 + (32 - i) * 45,
        y: 200
      });
    }
    
    return initialTeeth;
  });

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationText, setAnnotationText] = useState('');
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);

  const getToothColor = (tooth: ToothData) => {
    if (selectedTooth === tooth.id) return '#3b82f6';
    
    switch (tooth.status) {
      case 'healthy': return '#ffffff';
      case 'cavity': return '#ef4444';
      case 'filled': return '#14b8a6';
      case 'missing': return '#6b7280';
      default: return '#ffffff';
    }
  };

  const handleToothClick = (toothId: number) => {
    setSelectedTooth(toothId);
  };

  const updateToothStatus = (status: ToothData['status']) => {
    if (selectedTooth === null) return;
    
    setTeeth(prev => prev.map(tooth => 
      tooth.id === selectedTooth 
        ? { ...tooth, status }
        : tooth
    ));
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isAddingAnnotation || !annotationText.trim()) return;
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      text: annotationText,
      x: pos.x,
      y: pos.y
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    setAnnotationText('');
    setIsAddingAnnotation(false);
  };

  const handleAnnotationClick = (annotationId: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== annotationId));
  };

  const addAnnotation = () => {
    if (!annotationText.trim()) return;
    setIsAddingAnnotation(true);
  };

  const exportData = () => {
    const data = {
      teeth: teeth.map(tooth => ({
        id: tooth.id,
        status: tooth.status
      })),
      annotations: annotations
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teeth-annotation-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedToothData = teeth.find(tooth => tooth.id === selectedTooth);

  return (
    <div className="app">
      <div className="header">
        <h1>🦷 Teeth Annotation Tool</h1>
        <p>Click on teeth to select them, then use the controls below to annotate</p>
      </div>

      <div className="canvas-container">
        <Stage
          ref={stageRef}
          width={800}
          height={350}
          onClick={handleStageClick}
          className="konva-stage"
        >
          <Layer>
            {/* Upper teeth label */}
            <Text
              text="Upper Teeth"
              x={350}
              y={60}
              fontSize={16}
              fontFamily="Arial"
              fill="#374151"
              align="center"
            />
            
            {/* Lower teeth label */}
            <Text
              text="Lower Teeth"
              x={350}
              y={240}
              fontSize={16}
              fontFamily="Arial"
              fill="#374151"
              align="center"
            />

            {/* Render teeth */}
            {teeth.map(tooth => (
              <Group key={tooth.id}>
                <Circle
                  x={tooth.x}
                  y={tooth.y}
                  radius={18}
                  fill={getToothColor(tooth)}
                  stroke="#374151"
                  strokeWidth={2}
                  onClick={() => handleToothClick(tooth.id)}
                  onTap={() => handleToothClick(tooth.id)}
                  shadowColor="black"
                  shadowBlur={3}
                  shadowOpacity={0.3}
                  shadowOffsetX={1}
                  shadowOffsetY={1}
                />
                <Text
                  text={tooth.id.toString()}
                  x={tooth.x}
                  y={tooth.y - 6}
                  fontSize={12}
                  fontFamily="Arial"
                  fill={selectedTooth === tooth.id ? '#ffffff' : '#374151'}
                  align="center"
                  width={36}
                  onClick={() => handleToothClick(tooth.id)}
                  onTap={() => handleToothClick(tooth.id)}
                />
              </Group>
            ))}

            {/* Render annotations */}
            {annotations.map(annotation => (
              <Group key={annotation.id}>
                <Circle
                  x={annotation.x}
                  y={annotation.y}
                  radius={4}
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth={1}
                />
                <Text
                  text={annotation.text}
                  x={annotation.x + 8}
                  y={annotation.y - 8}
                  fontSize={12}
                  fontFamily="Arial"
                  fill="#374151"
                  padding={4}
                  onClick={() => handleAnnotationClick(annotation.id)}
                  onTap={() => handleAnnotationClick(annotation.id)}
                />
              </Group>
            ))}
          </Layer>
        </Stage>
      </div>

      <div className="controls">
        <div className="control-section">
          <h3>Selected Tooth: {selectedTooth ? `#${selectedTooth}` : 'None'}</h3>
          {selectedToothData && (
            <p className="tooth-status">
              Current Status: <span className={`status-${selectedToothData.status}`}>
                {selectedToothData.status.charAt(0).toUpperCase() + selectedToothData.status.slice(1)}
              </span>
            </p>
          )}
        </div>

        <div className="control-section">
          <h4>Tooth Status</h4>
          <div className="button-group">
            <button 
              onClick={() => updateToothStatus('healthy')}
              disabled={!selectedTooth}
              className="btn btn-healthy"
            >
              Healthy
            </button>
            <button 
              onClick={() => updateToothStatus('cavity')}
              disabled={!selectedTooth}
              className="btn btn-cavity"
            >
              Cavity
            </button>
            <button 
              onClick={() => updateToothStatus('filled')}
              disabled={!selectedTooth}
              className="btn btn-filled"
            >
              Filled
            </button>
            <button 
              onClick={() => updateToothStatus('missing')}
              disabled={!selectedTooth}
              className="btn btn-missing"
            >
              Missing
            </button>
          </div>
        </div>

        <div className="control-section">
          <h4>Annotations</h4>
          <div className="annotation-controls">
            <input
              type="text"
              value={annotationText}
              onChange={(e) => setAnnotationText(e.target.value)}
              placeholder="Enter annotation text..."
              className="annotation-input"
            />
            <button 
              onClick={addAnnotation}
              disabled={!annotationText.trim()}
              className="btn btn-primary"
            >
              Add Annotation
            </button>
          </div>
          {isAddingAnnotation && (
            <p className="instruction">Click on the canvas to place the annotation</p>
          )}
        </div>

        <div className="control-section">
          <button onClick={exportData} className="btn btn-export">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;