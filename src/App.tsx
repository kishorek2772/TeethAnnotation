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
  commentStyle: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: number;
  };
  showComment: boolean;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'doctor' | 'patient'>('doctor');
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'rectangle' | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentStyle, setCommentStyle] = useState({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 12
  });
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
    // Disable shape creation in patient view
    if (currentView === 'patient') return;
    
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
        commentStyle: {
          bold: false,
          italic: false,
          underline: false,
          fontSize: 12
        },
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
        commentStyle: {
          bold: false,
          italic: false,
          underline: false,
          fontSize: 12
        },
        showComment: false,
      };
      setCurrentShape(newShape);
      setIsDrawing(true);
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Disable drawing in patient view
    if (currentView === 'patient') return;
    
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
    // Disable drawing in patient view
    if (currentView === 'patient') return;
    
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
    // In patient view, just toggle comment visibility
    if (currentView === 'patient') {
      setShapes(prev => prev.map(shape => 
        shape.id === shapeId 
          ? { ...shape, showComment: !shape.showComment }
          : shape
      ));
      return;
    }
    
    setSelectedShape(shapeId);
    setShowCommentBox(true);
    const shape = shapes.find(s => s.id === shapeId);
    setCommentText(shape?.comment || '');
    setCommentStyle(shape?.commentStyle || {
      bold: false,
      italic: false,
      underline: false,
      fontSize: 12
    });
  };

  const handleShapeDragEnd = (shapeId: string, newPos: { x: number; y: number }) => {
    // Disable dragging in patient view
    if (currentView === 'patient') return;
    
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
        ? { ...shape, comment: commentText, commentStyle: commentStyle, showComment: true }
        : shape
    ));

    setShowCommentBox(false);
    setSelectedShape(null);
    setCommentText('');
    setCommentStyle({
      bold: false,
      italic: false,
      underline: false,
      fontSize: 12
    });
  };

  const deleteShape = (shapeId: string) => {
    setShapes(prev => prev.filter(shape => shape.id !== shapeId));
    if (selectedShape === shapeId) {
      setShowCommentBox(false);
      setSelectedShape(null);
      setCommentText('');
      setCommentStyle({
        bold: false,
        italic: false,
        underline: false,
        fontSize: 12
      });
    }
  };

  const clearAll = () => {
    setShapes([]);
    setShowCommentBox(false);
    setSelectedShape(null);
    setCommentText('');
    setCommentStyle({
      bold: false,
      italic: false,
      underline: false,
      fontSize: 12
    });
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
        comment: shape.comment,
        commentStyle: shape.commentStyle
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
        <div className="view-switcher">
          <button 
            onClick={() => setCurrentView('doctor')}
            className={`btn ${currentView === 'doctor' ? 'btn-active' : 'btn-tool'}`}
          >
            👨‍⚕️ Doctor View
          </button>
          <button 
            onClick={() => setCurrentView('patient')}
            className={`btn ${currentView === 'patient' ? 'btn-active' : 'btn-tool'}`}
          >
            🧑‍🦲 Patient View
          </button>
        </div>
        <h1>🦷 {currentView === 'doctor' ? 'Teeth Annotation Tool' : 'Patient Consultation View'}</h1>
        <p>
          {currentView === 'doctor' 
            ? 'Upload a teeth image, add shapes, and annotate with comments'
            : 'View your annotated teeth image with doctor\'s comments'
          }
        </p>
      </div>

      {currentView === 'doctor' && (
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
      )}

      {currentView === 'patient' && uploadedImage && (
        <div className="patient-info">
          <div className="patient-instructions">
            <h3>📋 How to View Your Annotations</h3>
            <p>Click on any highlighted area (circles or rectangles) to view the doctor's comments about that specific area of your teeth.</p>
          </div>
        </div>
      )}

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
                    draggable={currentView === 'doctor'}
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
                    draggable={currentView === 'doctor'}
                    onClick={() => handleShapeClick(shape.id)}
                    onDragEnd={(e) => handleShapeDragEnd(shape.id, e.target.position())}
                  />
                )}

                {/* Render comment if exists */}
                {((currentView === 'doctor' && shape.showComment) || (currentView === 'patient' && shape.showComment)) && shape.comment && (
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
                      fontSize={shape.commentStyle.fontSize}
                      fontFamily="Arial"
                      fill="#333"
                      width={Math.max(shape.comment.length * 8, 90)}
                      fontStyle={shape.commentStyle.italic ? 'italic' : 'normal'}
                      textDecoration={shape.commentStyle.underline ? 'underline' : ''}
                      fontVariant={shape.commentStyle.bold ? 'bold' : 'normal'}
                    />
                  </Group>
                )}
              </Group>
            ))}

            {/* Render current shape being drawn */}
            {isDrawing && currentShape && currentView === 'doctor' && (
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

        {!uploadedImage && currentView === 'doctor' && (
          <div className="upload-placeholder">
            <p>📷 Upload a teeth image to start annotating</p>
          </div>
        )}

        {!uploadedImage && currentView === 'patient' && (
          <div className="upload-placeholder">
            <p>👨‍⚕️ No teeth image available. Please switch to Doctor View to upload an image.</p>
          </div>
        )}
      </div>

      {/* Comment Box */}
      {showCommentBox && currentView === 'doctor' && (
        <div className="comment-box">
          <h4>Add Comment</h4>
          
          {/* Formatting Toolbar */}
          <div className="formatting-toolbar">
            <div className="format-group">
              <button
                type="button"
                onClick={() => setCommentStyle(prev => ({ ...prev, bold: !prev.bold }))}
                className={`format-btn ${commentStyle.bold ? 'active' : ''}`}
                title="Bold"
              >
                <strong>B</strong>
              </button>
              <button
                type="button"
                onClick={() => setCommentStyle(prev => ({ ...prev, italic: !prev.italic }))}
                className={`format-btn ${commentStyle.italic ? 'active' : ''}`}
                title="Italic"
              >
                <em>I</em>
              </button>
              <button
                type="button"
                onClick={() => setCommentStyle(prev => ({ ...prev, underline: !prev.underline }))}
                className={`format-btn ${commentStyle.underline ? 'active' : ''}`}
                title="Underline"
              >
                <u>U</u>
              </button>
            </div>
            
            <div className="format-group">
              <label htmlFor="fontSize">Size:</label>
              <select
                id="fontSize"
                value={commentStyle.fontSize}
                onChange={(e) => setCommentStyle(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="font-size-select"
              >
                <option value={10}>10px</option>
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
                <option value={20}>20px</option>
                <option value={24}>24px</option>
              </select>
            </div>
          </div>
          
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Enter your comment here..."
            className="comment-textarea"
            style={{
              fontWeight: commentStyle.bold ? 'bold' : 'normal',
              fontStyle: commentStyle.italic ? 'italic' : 'normal',
              textDecoration: commentStyle.underline ? 'underline' : 'none',
              fontSize: `${commentStyle.fontSize}px`
            }}
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
                setCommentStyle({
                  bold: false,
                  italic: false,
                  underline: false,
                  fontSize: 12
                });
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentView === 'doctor' && (
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
      )}

      {currentView === 'patient' && (
        <div className="shapes-list">
          <h4>📝 Doctor's Annotations ({shapes.length})</h4>
          {shapes.length === 0 ? (
            <p className="no-shapes">No annotations available. Your doctor hasn't added any comments yet.</p>
          ) : (
            <div className="shapes-grid">
              {shapes.map(shape => (
                <div key={shape.id} className="shape-item">
                  <span className="shape-info">
                    {shape.type === 'circle' ? '⭕' : '⬜'} 
                    {shape.comment || 'No comment'}
                  </span>
                  <button 
                    onClick={() => handleShapeClick(shape.id)}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                  >
                    {shape.showComment ? '👁️ Hide' : '👁️ Show'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;