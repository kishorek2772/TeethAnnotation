import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle, Rect, Text, Group, Image as KonvaImage, Label, Tag, Arrow, Line } from 'react-konva';
import Konva from 'konva';
import './App.css';

interface Shape {
  id: string;
  type: 'circle' | 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  comment: string;
  showComment: boolean;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  commentX?: number; 
  commentY?: number;
}

interface Props {
  initialImage: string | null;
  initialAnnotations: string;
  onSaveAnnotations: (data: any) => void;
}

const AnnotationAppKonva: React.FC<Props> = ({ initialImage, initialAnnotations, onSaveAnnotations }) => {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'rectangle' | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [textColor, setTextColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [commentBoxPosition, setCommentBoxPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });
  
  // Helper function to get shape top center point for arrow start
  const getShapeTopCenter = (shape: Shape) => {
    if (shape.type === 'circle') {
      return { 
        x: shape.x, 
        y: shape.y - (shape.radius || shape.width / 2) 
      };
    } else {
      return { 
        x: shape.x + shape.width / 2, 
        y: shape.y 
      };
    }
  };

  // Helper function to get comment center point for arrow end
  const getCommentCenter = (shape: Shape) => {
    const commentX = shape.commentX || (shape.x + 30);
    const commentY = shape.commentY || (shape.y - 30);
    return {
      x: commentX + 50, // center of comment box (assuming width ~100)
      y: commentY + 15  // center of comment box (assuming height ~30)
    };
  };

  useEffect(() => {
    if (!initialImage) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = initialImage;
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      setStageSize({ width: img.width * ratio, height: img.height * ratio });
      setUploadedImage(img);
    };
  }, [initialImage]);

  useEffect(() => {
    try {
      const parsed = typeof initialAnnotations === 'string' ? JSON.parse(initialAnnotations) : [];
      setShapes(parsed);
    } catch (e) {
      console.warn('Invalid annotation format');
    }
  }, [initialAnnotations]);

  const animateScale = (node: Konva.Node, scale: number) => {
    node.to({ scaleX: scale, scaleY: scale, duration: 0.2, easing: Konva.Easings.EaseInOut });
  };

  const handleShapeDragStart = (e: any) => animateScale(e.target, 0.7);

  const handleShapeDragEnd = (shapeId: string, e: any) => {
    const node = e.target;
    const newX = node.x();
    const newY = node.y();
    animateScale(node, 1);
    const updated = shapes.map(s => s.id === shapeId ? { ...s, x: newX, y: newY } : s);
    setShapes(updated);
    onSaveAnnotations(updated);
  };

  const handleShapeClick = (shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;
    setSelectedShape(shapeId);
    setCommentText(shape.comment || '');
    setIsBold(shape.isBold || false);
    setIsItalic(shape.isItalic || false);
    setIsUnderline(shape.isUnderline || false);
    setFontSize(shape.fontSize || 15);
    setShowCommentBox(true);

    // Position comment box near shape
    const offset = 30;
    setCommentBoxPosition({
      top: shape.y + offset,
      left: shape.x + offset
    });
  };

  const applyComment = () => {
    if (!selectedShape) return;
    const updatedShapes = shapes.map((shape) =>
      shape.id === selectedShape
        ? {
            ...shape,
            comment: commentText,
            showComment: true,
            isBold,
            isItalic,
            isUnderline,
            fontSize,
            commentX: shape.commentX || (shape.x + 30),
            commentY: shape.commentY || (shape.y - 30),
          }
        : shape
    );
    setShapes(updatedShapes);
    onSaveAnnotations(updatedShapes);
    setShowCommentBox(false);
    setSelectedShape(null);
    setCommentText('');
  };

  const handleStageMouseDown = (e: any) => {
    if (!selectedTool) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    setDragStart(pos);
    setIsDrawing(true);
    setCurrentShape({
      id: Date.now().toString(),
      type: selectedTool,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      comment: '',
      showComment: false
    });
  };

  const handleStageMouseMove = (e: any) => {
    if (!isDrawing || !currentShape || !dragStart) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const dx = pos.x - dragStart.x;
    const dy = pos.y - dragStart.y;

    if (currentShape.type === 'rectangle') {
      setCurrentShape({
        ...currentShape,
        x: dx < 0 ? pos.x : dragStart.x,
        y: dy < 0 ? pos.y : dragStart.y,
        width: Math.abs(dx),
        height: Math.abs(dy)
      });
    } else if (currentShape.type === 'circle') {
      const radius = Math.sqrt(dx * dx + dy * dy);
      setCurrentShape({ ...currentShape, radius, width: radius * 2, height: radius * 2 });
    }
  };

  const handleStageMouseUp = () => {
    if (!isDrawing || !currentShape) return;
    setShapes(prev => {
      const updated = [...prev, currentShape];
      onSaveAnnotations(updated);
      return updated;
    });
    setIsDrawing(false);
    setCurrentShape(null);
  };

  const handleCommentDragMove = (shapeId: string, e: any) => {
    const updatedShapes = shapes.map((s) =>
      s.id === shapeId
        ? { ...s, commentX: e.target.x(), commentY: e.target.y() }
        : s
    );
    setShapes(updatedShapes);
  };

  const applyFormatToSelection = (format: string) => {
    // Placeholder function for format application
  };

  const applyColorToSelection = () => {
    // Placeholder function for color application
  };

  const applyTextAlignment = (alignment: 'left' | 'center' | 'right') => {
    setTextAlign(alignment);
  };

  return (
    <div className="konva-wrapper" style={{ position: 'relative' }}>
      <div className="toolbar flex items-center gap-3 bg-white shadow px-4 py-2 rounded-md mb-4">
        <button
          onClick={() => setSelectedTool('rectangle')}
          className={`px-2 py-1 rounded ${selectedTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          🟦 Rect
        </button>
        <button
          onClick={() => setSelectedTool('circle')}
          className={`px-2 py-1 rounded ${selectedTool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
        >
          ⚪ Circle
        </button>
        <button
          onClick={() => {
            setSelectedTool(null);
            setSelectedShape(null);
          }}
          className="px-2 py-1 rounded bg-gray-100"
        >
          ✖ Deselect
        </button>
        
        {/* FONT CONTROLS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
          <button
            onClick={() => setFontSize((prev) => Math.max(8, prev - 1))}
            style={{ fontSize: 16, padding: '0 8px' }}
          >
            −
          </button>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{ width: 40, textAlign: 'center' }}
          />
          <button
            onClick={() => setFontSize((prev) => Math.min(72, prev + 1))}
            style={{ fontSize: 16, padding: '0 8px' }}
          >
            +
          </button>

          {/* STYLING CONTROLS */}
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              onClick={() => {
                setIsBold(!isBold);
                applyFormatToSelection('bold');
              }}
              style={{
                fontWeight: 'bold',
                background: isBold ? '#ccc' : 'transparent',
                border: 'none',
                padding: '0 6px',
              }}
            >
              B
            </button>
            <button
              onClick={() => {
                setIsItalic(!isItalic);
                applyFormatToSelection('italic');
              }}
              style={{
                fontStyle: 'italic',
                background: isItalic ? '#ccc' : 'transparent',
                border: 'none',
                padding: '0 6px',
              }}
            >
              I
            </button>
            <button
              onClick={() => {
                setIsUnderline(!isUnderline);
                applyFormatToSelection('underline');
              }}
              style={{
                textDecoration: 'underline',
                background: isUnderline ? '#ccc' : 'transparent',
                border: 'none',
                padding: '0 6px',
              }}
            >
              U
            </button>
          </div>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text Color */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Color:</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            title="Text color"
          />
          <button
            onClick={applyColorToSelection}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            title="Apply color to selected text"
          >
            Apply
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text Alignment */}
        <div className="flex gap-1">
          <button
            onClick={() => applyTextAlignment('left')}
            className={`p-2 rounded transition-colors ${textAlign === 'left' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align left"
          >
            ≡
          </button>
          <button
            onClick={() => applyTextAlignment('center')}
            className={`p-2 rounded transition-colors ${textAlign === 'center' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align center"
          >
            ≣
          </button>
          <button
            onClick={() => applyTextAlignment('right')}
            className={`p-2 rounded transition-colors ${textAlign === 'right' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align right"
          >
            ≡
          </button>
        </div>
      </div>

      <Stage
        style={{ cursor: selectedTool ? 'crosshair' : 'default' }}
        width={stageSize.width}
        height={stageSize.height}
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {uploadedImage && (
            <KonvaImage image={uploadedImage} width={stageSize.width} height={stageSize.height} />
          )}

          {isDrawing && currentShape && (
            currentShape.type === 'circle' ? (
              <Circle
                x={currentShape.x}
                y={currentShape.y}
                radius={currentShape.radius}
                stroke="red"
                strokeWidth={2}
                dash={[4, 4]}
              />
            ) : (
              <Rect
                x={currentShape.x}
                y={currentShape.y}
                width={currentShape.width}
                height={currentShape.height}
                stroke="red"
                strokeWidth={2}
                dash={[4, 4]}
              />
            )
          )}

          {shapes.map(shape => (
            <Group key={shape.id}>
              {shape.type === 'rectangle' ? (
                <Rect
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  stroke="red"
                  strokeWidth={2}
                  draggable
                  onClick={() => handleShapeClick(shape.id)}
                  onDragStart={handleShapeDragStart}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                />
              ) : (
                <Circle
                  x={shape.x}
                  y={shape.y}
                  radius={shape.radius || shape.width / 2}
                  stroke="red"
                  strokeWidth={2}
                  draggable
                  onClick={() => handleShapeClick(shape.id)}
                  onDragStart={handleShapeDragStart}
                  onDragEnd={(e) => handleShapeDragEnd(shape.id, e)}
                />
              )}

              {/* Arrow connecting shape to comment */}
              {shape.showComment && shape.comment && shape.commentX !== undefined && shape.commentY !== undefined && (
                <Group>
                  {(() => {
                    const shapeTopCenter = getShapeTopCenter(shape);
                    const commentCenter = getCommentCenter(shape);
                    
                    // Calculate arrow head points
                    const angle = Math.atan2(commentCenter.y - shapeTopCenter.y, commentCenter.x - shapeTopCenter.x);
                    const arrowLength = 10;
                    const arrowAngle = Math.PI / 6;
                    
                    const arrowHead1 = {
                      x: commentCenter.x - arrowLength * Math.cos(angle - arrowAngle),
                      y: commentCenter.y - arrowLength * Math.sin(angle - arrowAngle)
                    };
                    
                    const arrowHead2 = {
                      x: commentCenter.x - arrowLength * Math.cos(angle + arrowAngle),
                      y: commentCenter.y - arrowLength * Math.sin(angle + arrowAngle)
                    };
                    
                    return (
                      <Group>
                        {/* Arrow line */}
                        <Line
                          points={[shapeTopCenter.x, shapeTopCenter.y, commentCenter.x, commentCenter.y]}
                          stroke="#666"
                          strokeWidth={2}
                          dash={[5, 5]}
                        />
                        {/* Arrow head */}
                        <Line
                          points={[
                            commentCenter.x, commentCenter.y,
                            arrowHead1.x, arrowHead1.y,
                            commentCenter.x, commentCenter.y,
                            arrowHead2.x, arrowHead2.y
                          ]}
                          stroke="#666"
                          strokeWidth={2}
                          lineCap="round"
                          lineJoin="round"
                        />
                      </Group>
                    );
                  })()}
                </Group>
              )}

              {/* Comment box */}
              {shape.showComment && shape.comment && (
                <Group
                  draggable
                  x={shape.commentX || shape.x + 30}
                  y={shape.commentY || shape.y - 30}
                  onDragMove={(e) => handleCommentDragMove(shape.id, e)}
                  onDragEnd={(e) => {
                    const updatedShapes = shapes.map((s) =>
                      s.id === shape.id
                        ? { ...s, commentX: e.target.x(), commentY: e.target.y() }
                        : s
                    );
                    setShapes(updatedShapes);
                    onSaveAnnotations(updatedShapes);
                  }}
                >
                  <Label>
                    <Tag
                      fill="#e53935"
                      cornerRadius={4}
                      lineJoin="round"
                      shadowColor="black"
                      shadowBlur={10}
                      shadowOffset={{ x: 2, y: 2 }}
                      shadowOpacity={0.2}
                    />
                    <Text
                      text={shape.comment}
                      fontSize={shape.fontSize || 14}
                      fontStyle={`${shape.isBold ? 'bold' : ''} ${shape.isItalic ? 'italic' : ''}`.trim()}
                      textDecoration={shape.isUnderline ? 'underline' : undefined}
                      fill="#fff"
                      padding={6}
                      fontFamily="Arial"
                    />
                  </Label>
                </Group>
              )}
            </Group>
          ))}
        </Layer>
      </Stage>

      {showCommentBox && (
        <div
          className="comment-ui"
          style={{
            position: 'absolute',
            top: commentBoxPosition.top,
            left: commentBoxPosition.left,
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: 8,
            padding: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: 300,
            zIndex: 10,
          }}
        >
          {/* COMMENT TEXTAREA */}
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type comment..."
            style={{
              width: '100%',
              height: 70,
              resize: 'none',
              padding: 8,
              fontSize: 14,
              borderRadius: 4,
              border: '1px solid #ccc',
            }}
          />

          {/* APPLY BUTTON */}
          <button
            onClick={applyComment}
            style={{
              width: '100%',
              background: '#e53935',
              color: '#fff',
              border: 'none',
              padding: 8,
              borderRadius: 4,
              fontWeight: 'bold',
            }}
          >
            Apply Comment
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotationAppKonva;