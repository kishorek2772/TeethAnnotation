import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle, Rect, Text, Group, Image as KonvaImage, Label, Tag, Line } from 'react-konva';
import Konva from 'konva';
import { Undo, Redo, Bold, Italic, Underline, Minus, Plus, AlignLeft, AlignCenter, AlignRight, Palette } from 'lucide-react';

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
  textAlign?: 'left' | 'center' | 'right';
}

interface Props {
  initialImage: string | null;
  initialAnnotations: string;
  onSaveAnnotations: (data: any) => void;
}

const AnnotationAppKonva: React.FC<Props> = ({ initialImage, initialAnnotations, onSaveAnnotations }) => {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<'circle' | 'rectangle' | null>(null);
  const [selectedShape, setSelectedShape] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const commentRef = useRef<HTMLDivElement>(null);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [textColor, setTextColor] = useState('#000000');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [commentBoxPosition, setCommentBoxPosition] = useState<{ top: number; left: number }>({ top: 100, left: 100 });

  // Add to history
  const addToHistory = (newShapes: Shape[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newShapes]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo function
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousShapes = [...history[newIndex]];
      setShapes(previousShapes);
      onSaveAnnotations(previousShapes);
    }
  };

  // Redo function
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextShapes = [...history[newIndex]];
      setShapes(nextShapes);
      onSaveAnnotations(nextShapes);
    }
  };

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

  // Text formatting functions for selected text
  const applyBoldToSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontWeight = 'bold';
    
    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    selection.removeAllRanges();
  };

  const applyItalicToSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontStyle = 'italic';
    
    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    selection.removeAllRanges();
  };

  const applyUnderlineToSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.textDecoration = 'underline';
    
    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    selection.removeAllRanges();
  };

  const applyFontSizeToSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.fontSize = `${fontSize}px`;
    
    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    selection.removeAllRanges();
  };

  const applyColorToSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement('span');
    span.style.color = textColor;
    
    try {
      range.surroundContents(span);
    } catch (e) {
      const contents = range.extractContents();
      span.appendChild(contents);
      range.insertNode(span);
    }
    
    selection.removeAllRanges();
  };

  const applyTextAlignment = (alignment: 'left' | 'center' | 'right') => {
    setTextAlign(alignment);
    if (commentRef.current) {
      commentRef.current.style.textAlign = alignment;
    }
  };

  useEffect(() => {
    if (!initialImage) {
      // Load sample teeth image
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = "https://images.pexels.com/photos/6812540/pexels-photo-6812540.jpeg?auto=compress&cs=tinysrgb&w=800";
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 600;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        const scaledWidth = img.width * ratio;
        const scaledHeight = img.height * ratio;
        
        // Center the image
        const offsetX = (maxWidth - scaledWidth) / 2;
        const offsetY = (maxHeight - scaledHeight) / 2;
        
        setStageSize({ width: maxWidth, height: maxHeight });
        setImageOffset({ x: offsetX, y: offsetY });
        setUploadedImage(img);
      };
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = initialImage;
    img.onload = () => {
      const maxWidth = 800;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      const scaledWidth = img.width * ratio;
      const scaledHeight = img.height * ratio;
      
      // Center the image
      const offsetX = (maxWidth - scaledWidth) / 2;
      const offsetY = (maxHeight - scaledHeight) / 2;
      
      setStageSize({ width: maxWidth, height: maxHeight });
      setImageOffset({ x: offsetX, y: offsetY });
      setUploadedImage(img);
    };
  }, [initialImage]);

  useEffect(() => {
    try {
      const parsed = typeof initialAnnotations === 'string' ? JSON.parse(initialAnnotations) : [];
      setShapes(parsed);
      setHistory([parsed]);
      setHistoryIndex(0);
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
    addToHistory(updated);
    onSaveAnnotations(updated);
  };

  const handleShapeClick = (shapeId: string) => {
    const shape = shapes.find(s => s.id === shapeId);
    if (!shape) return;

    setSelectedShape(shapeId);
    setIsBold(shape.isBold || false);
    setIsItalic(shape.isItalic || false);
    setIsUnderline(shape.isUnderline || false);
    setFontSize(shape.fontSize || 15);
    setTextAlign(shape.textAlign || 'left');
    setShowCommentBox(true);

    const offset = 30;
    setCommentBoxPosition({
      top: shape.y + offset,
      left: shape.x + offset
    });

    // Set the actual comment content inside the box
    setTimeout(() => {
      if (commentRef.current) {
        commentRef.current.innerHTML = shape.comment || '';
        commentRef.current.style.textAlign = shape.textAlign || 'left';
      }
    }, 0);
  };

  const applyComment = () => {
    if (!selectedShape || !commentRef.current) return;
    
    const htmlContent = commentRef.current.innerHTML;
    const textContent = commentRef.current.textContent || '';
    
    const updatedShapes = shapes.map((shape) =>
      shape.id === selectedShape
        ? {
            ...shape,
            comment: htmlContent, // Store HTML content for rich formatting
            showComment: true,
            isBold,
            isItalic,
            isUnderline,
            fontSize,
            textAlign,
            commentX: shape.commentX || (shape.x + 30),
            commentY: shape.commentY || (shape.y - 30),
          }
        : shape
    );
    setShapes(updatedShapes);
    addToHistory(updatedShapes);
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
    const newShapes = [...shapes, currentShape];
    setShapes(newShapes);
    addToHistory(newShapes);
    onSaveAnnotations(newShapes);
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

  // Calculate image dimensions for centering
  const getImageDimensions = () => {
    if (!uploadedImage) return { width: 0, height: 0, x: 0, y: 0 };
    
    const maxWidth = stageSize.width;
    const maxHeight = stageSize.height;
    const ratio = Math.min(maxWidth / uploadedImage.width, maxHeight / uploadedImage.height);
    const scaledWidth = uploadedImage.width * ratio;
    const scaledHeight = uploadedImage.height * ratio;
    
    return {
      width: scaledWidth,
      height: scaledHeight,
      x: (stageSize.width - scaledWidth) / 2,
      y: (stageSize.height - scaledHeight) / 2
    };
  };

  const imageDimensions = getImageDimensions();

  // Helper function to convert HTML to plain text for Konva display
  const htmlToPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="konva-wrapper" style={{ position: 'relative' }}>
      <div className="toolbar flex items-center gap-3 bg-white shadow px-4 py-2 rounded-md mb-4">
        {/* Drawing Tools */}
        <button
          onClick={() => setSelectedTool('rectangle')}
          className={`px-3 py-2 rounded transition-colors ${selectedTool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          🟦 Rectangle
        </button>
        <button
          onClick={() => setSelectedTool('circle')}
          className={`px-3 py-2 rounded transition-colors ${selectedTool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
        >
          ⚪ Circle
        </button>
        <button
          onClick={() => {
            setSelectedTool(null);
            setSelectedShape(null);
          }}
          className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ✖ Deselect
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* Undo/Redo */}
        <button
          onClick={handleUndo}
          disabled={historyIndex <= 0}
          className={`p-2 rounded transition-colors ${historyIndex <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          onClick={handleRedo}
          disabled={historyIndex >= history.length - 1}
          className={`p-2 rounded transition-colors ${historyIndex >= history.length - 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
          title="Redo"
        >
          <Redo size={16} />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>
        
        {/* Font Size Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFontSize((prev) => Math.max(8, prev - 1))}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Decrease font size"
          >
            <Minus size={14} />
          </button>
          <input
            type="number"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-12 text-center text-sm border border-gray-300 rounded px-1 py-1"
            min="8"
            max="72"
          />
          <button
            onClick={() => setFontSize((prev) => Math.min(72, prev + 1))}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
            title="Increase font size"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Text Styling Controls */}
        <div className="flex gap-1">
          <button
            onClick={() => setIsBold(!isBold)}
            className={`p-2 rounded transition-colors ${isBold ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => setIsItalic(!isItalic)}
            className={`p-2 rounded transition-colors ${isItalic ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => setIsUnderline(!isUnderline)}
            className={`p-2 rounded transition-colors ${isUnderline ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Underline"
          >
            <Underline size={16} />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text Color */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            title="Text color"
          />
        </div>

        <div className="w-px h-6 bg-gray-300 mx-2"></div>

        {/* Text Alignment */}
        <div className="flex gap-1">
          <button
            onClick={() => applyTextAlignment('left')}
            className={`p-2 rounded transition-colors ${textAlign === 'left' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => applyTextAlignment('center')}
            className={`p-2 rounded transition-colors ${textAlign === 'center' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => applyTextAlignment('right')}
            className={`p-2 rounded transition-colors ${textAlign === 'right' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
            title="Align right"
          >
            <AlignRight size={16} />
          </button>
        </div>
      </div>

      <Stage
        style={{ 
          cursor: selectedTool ? 'crosshair' : 'default',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}
        width={stageSize.width}
        height={stageSize.height}
        ref={stageRef}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
      >
        <Layer>
          {uploadedImage && (
            <KonvaImage 
              image={uploadedImage} 
              x={imageDimensions.x}
              y={imageDimensions.y}
              width={imageDimensions.width} 
              height={imageDimensions.height} 
            />
          )}

          {isDrawing && currentShape && (
            currentShape.type === 'circle' ? (
              <Circle
                x={currentShape.x}
                y={currentShape.y}
                radius={currentShape.radius}
                stroke="#ef4444"
                strokeWidth={2}
                dash={[4, 4]}
              />
            ) : (
              <Rect
                x={currentShape.x}
                y={currentShape.y}
                width={currentShape.width}
                height={currentShape.height}
                stroke="#ef4444"
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
                  stroke="#ef4444"
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
                  stroke="#ef4444"
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
                    addToHistory(updatedShapes);
                    onSaveAnnotations(updatedShapes);
                  }}
                >
                  <Label>
                    <Tag
                      fill="#ef4444"
                      cornerRadius={6}
                      lineJoin="round"
                      shadowColor="black"
                      shadowBlur={10}
                      shadowOffset={{ x: 2, y: 2 }}
                      shadowOpacity={0.2}
                    />
                    <Text
                      text={htmlToPlainText(shape.comment)}
                      fontSize={shape.fontSize || 14}
                      fontStyle={`${shape.isBold ? 'bold' : ''} ${shape.isItalic ? 'italic' : ''}`.trim()}
                      textDecoration={shape.isUnderline ? 'underline' : undefined}
                      fill="#fff"
                      padding={8}
                      fontFamily="Arial"
                      align={shape.textAlign || 'left'}
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
            border: '1px solid #d1d5db',
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            width: 380,
            zIndex: 10,
          }}
        >
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comment Text
            </label>
            <div
              ref={commentRef}
              contentEditable
              className="w-full min-h-[80px] p-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                textDecoration: isUnderline ? 'underline' : 'none',
                textAlign: textAlign,
                direction: 'ltr',
                unicodeBidi: 'normal',
              }}
              onInput={(e) => {
                const target = e.target as HTMLDivElement;
                setCommentText(target.textContent || '');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey === false) {
                  e.preventDefault();
                  const br = document.createElement('br');
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(br);
                    range.setStartAfter(br);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain');
                document.execCommand('insertText', false, text);
              }}
              suppressContentEditableWarning={true}
            />
          </div>

          {/* Selection-based formatting controls */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="text-xs text-gray-600 mb-2">Select text and apply formatting:</div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={applyBoldToSelection}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                title="Apply bold to selected text"
              >
                <Bold size={12} />
              </button>
              <button
                onClick={applyItalicToSelection}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                title="Apply italic to selected text"
              >
                <Italic size={12} />
              </button>
              <button
                onClick={applyUnderlineToSelection}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                title="Apply underline to selected text"
              >
                <Underline size={12} />
              </button>
              <button
                onClick={applyFontSizeToSelection}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                title="Apply current font size to selected text"
              >
                Size: {fontSize}px
              </button>
              <button
                onClick={applyColorToSelection}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors flex items-center gap-1"
                title="Apply current color to selected text"
              >
                <Palette size={12} />
                Color
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={applyComment}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none py-2 px-4 rounded-lg cursor-pointer font-medium transition-colors"
            >
              Apply Comment
            </button>
            <button
              onClick={() => {
                setShowCommentBox(false);
                setSelectedShape(null);
                setCommentText('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationAppKonva;