import React, { useState, useRef } from 'react';
import { Stage, Layer, Circle, Rect, Text, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import './App.css';

interface Shape {
  id: string;
  type: 'circle' | 'rectangle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  comment: string;
  showComment: boolean;
}

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'rectangle' | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate stage size based on image dimensions
        const maxWidth = 800;
        const maxHeight = 600;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        setStageSize({
          width: img.width * ratio,
          height: img.height * ratio
        });
        
        setUploadedImage(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage || !selectedTool) return;

    // Don't create shape if clicking on existing shape (but allow clicking on image)
    if (e.target !== stage && e.target.getClassName() !== 'Image') return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (selectedTool === 'circle') {
      // Start drawing circle
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'circle',
        x: pos.x,
        y: pos.y,
        radius: 0,
        comment: '',
        showComment: false,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    } else if (selectedTool === 'rectangle') {
      // Start drawing rectangle
      const newShape: Shape = {
        id: Date.now().toString(),
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        width: 0,
        height: 0,
        comment: '',
        showComment: false,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawing || !currentShape) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getPointerPosition();
    if (!pos) return;

    if (selectedTool === 'circle') {
      // Calculate radius based on distance from start point
      const deltaX = pos.x - currentShape.x;
      const deltaY = pos.y - currentShape.y;
      const radius = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      setCurrentShape({
        ...currentShape,
        radius: radius,
      });
    } else if (selectedTool === 'rectangle') {
      const width = pos.x - currentShape.x;
      const height = pos.y - currentShape.y;

      setCurrentShape({
        ...currentShape,
        width: Math.abs(width),
        height: Math.abs(height),
        x: width < 0 ? pos.x : currentShape.x,
        y: height < 0 ? pos.y : currentShape.y,
      });
    }
  };

  const handleStageMouseUp = () => {
    if (!isDrawing || !currentShape) return;

    // Only add shape if it has some size
    let shouldAdd = false;
    
    if (currentShape.type === 'circle' && currentShape.radius && currentShape.radius > 5) {
      shouldAdd = true;
    } else if (currentShape.type === 'rectangle' && 
               currentShape.width && currentShape.height && 
               currentShape.width > 5 && currentShape.height > 5) {
      shouldAdd = true;
    }

    if (shouldAdd) {
      setShapes(prev => [...prev, currentShape]);
    }

    setIsDrawing(false);
    setCurrentShape(null);
    setSelectedTool(null);
  };

  const handleShapeClick = (shapeId: string) => {
    setSelectedShape(shapeId);
    setShowCommentBox(true);
    const shape = shapes.find(s => s.id === shapeId);
    setCommentText(shape?.comment || '');
  };

  const handleShapeDragEnd = (shapeId: string, newPos: { x: number; y: number }) => {
    setShapes(prev => prev.map(shape => 
      shape.id === shapeId 
        ? { ...shape, x: newPos.x, y: newPos.y }
        : shape
    ));
  };

  const applyComment = () => {
    if (!selectedShape) return;

    setShapes(prev => prev.map(shape => 
      shape.id === selectedShape 
        ? { ...shape, comment: commentText, showComment: true }
        : shape
    ));

    setShowCommentBox(false);
    setSelectedShape(null);
    setCommentText('');
  };

  const deleteShape = (shapeId: string) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
    if (selectedShape === shapeId) {
      setShowCommentBox(false);
      setSelectedShape(null);
      setCommentText('');
    }
  };

  const clearAll = () => {
    setShapes([]);
    setShowCommentBox(false);
    setSelectedShape(null);
    setCommentText('');
  };

  const exportData = () => {
    const data = {
      shapes: shapes.map(shape => ({
        id: shape.id,
        type: shape.type,
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        radius: shape.radius,
        comment: shape.comment
      })),
      imageInfo: uploadedImage ? {
        width: uploadedImage.width,
        height: uploadedImage.height
      } : null
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teeth-annotation-data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app">
      <div className="header">
        <h1>🦷 Teeth Image Annotation Tool</h1>
        <p>Upload a teeth image, add shapes, and annotate with comments</p>
      </div>

      <div className="controls-top">
        <div className="upload-section">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-upload"
          >
            📁 Upload Teeth Image
          </button>
        </div>

        <div className="tools-section">
          <h4>Annotation Tools</h4>
          <div className="button-group">
            <button 
              onClick={() => setSelectedTool('circle')}
              className={`btn ${selectedTool === 'circle' ? 'btn-active' : 'btn-tool'}`}
            >
              ⭕ Circle
            </button>
            <button 
              onClick={() => setSelectedTool('rectangle')}
              className={`btn ${selectedTool === 'rectangle' ? 'btn-active' : 'btn-tool'}`}
            >
              ⬜ Rectangle
            </button>
            <button 
              onClick={() => setSelectedTool(null)}
              className="btn btn-secondary"
            >
              ✋ Select
            </button>
          </div>
        </div>
      </div>

      <div className="canvas-container">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
          onMouseMove={handleStageMouseMove}
          onMouseUp={handleStageMouseUp}
          className="konva-stage"
        >
          <Layer>
            {/* Render uploaded image */}
            {uploadedImage && (
              <KonvaImage
                image={uploadedImage}
                width={stageSize.width}
                height={stageSize.height}
                listening={true}
              />
            )}

            {/* Render shapes */}
            {shapes.map(shape => (
              <Group key={shape.id}>
                {shape.type === 'circle' ? (
                  <Circle
                    x={shape.x}
                    y={shape.y}
                    radius={shape.radius || 20}
                    fill="rgba(255, 0, 0, 0.3)"
                    stroke="#ff0000"
                    strokeWidth={2}
                    draggable
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e.target.position())}
                  />
                ) : (
                  <Rect
                    x={shape.x}
                    y={shape.y}
                    width={shape.width || 40}
                    height={shape.height || 30}
                    fill="rgba(0, 0, 255, 0.3)"
                    stroke="#0000ff"
                    strokeWidth={2}
                    draggable
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e.target.position())}
                  />
                )}

                {/* Render comment if exists */}
                {shape.showComment && shape.comment && (
                  <Group>
                    <Rect
                      x={shape.x + (shape.radius || shape.width || 40) + 10}
                      y={shape.y - 10}
                      width={Math.max(shape.comment.length * 8, 100)}
                      height={30}
                      fill="white"
                      stroke="#333"
                      strokeWidth={1}
                      cornerRadius={5}
                      shadowColor="black"
                      shadowBlur={5}
                      shadowOpacity={0.3}
                    />
                    <Text
                      text={shape.comment}
                      x={shape.x + (shape.radius || shape.width || 40) + 15}
                      y={shape.y - 5}
                      fontSize={12}
                      fontFamily="Arial"
                      fill="#333"
                      width={Math.max(shape.comment.length * 8, 90)}
                    />
                  </Group>
                )}
              </Group>
            ))}

            {/* Render current shape being drawn */}
            {isDrawing && currentShape && (
              <>
                {currentShape.type === 'circle' ? (
                  <Circle
                    x={currentShape.x}
                    y={currentShape.y}
                    radius={currentShape.radius || 0}
                    fill="rgba(255, 0, 0, 0.2)"
                    stroke="#ff0000"
                    strokeWidth={2}
                    dash={[5, 5]}
                  />
                ) : (
                  <Rect
                    x={currentShape.x}
                    y={currentShape.y}
                    width={currentShape.width || 0}
                    height={currentShape.height || 0}
                    fill="rgba(0, 0, 255, 0.2)"
                    stroke="#0000ff"
                    strokeWidth={2}
                    dash={[5, 5]}
                  />
                )}
              </>
            )}
          </Layer>
        </Stage>

        {!uploadedImage && (
          <div className="upload-placeholder">
            <p>📷 Upload a teeth image to start annotating</p>
          </div>
        )}
      </div>

      {/* Comment Box */}
      {showCommentBox && (
        <div className="comment-box">
          <h4>Add Comment</h4>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Enter your comment here..."
            className="comment-textarea"
          />
          <div className="comment-actions">
            <button onClick={applyComment} className="btn btn-primary">
              Apply Comment
            </button>
            <button 
              onClick={() => {
                setShowCommentBox(false);
                setSelectedShape(null);
                setCommentText('');
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="controls-bottom">
        <div className="shapes-list">
          <h4>Annotations ({shapes.length})</h4>
          {shapes.length === 0 ? (
            <p className="no-shapes">No annotations yet. Select a tool and click on the image to add shapes.</p>
          ) : (
            <div className="shapes-grid">
              {shapes.map(shape => (
                <div key={shape.id} className="shape-item">
                  <span className="shape-info">
                    {shape.type === 'circle' ? '⭕' : '⬜'} 
                    {shape.comment || 'No comment'}
                  </span>
                  <button 
                    onClick={() => deleteShape(shape.id)}
                    className="btn btn-delete"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button onClick={clearAll} className="btn btn-warning">
            Clear All
          </button>
          <button onClick={exportData} className="btn btn-export">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;