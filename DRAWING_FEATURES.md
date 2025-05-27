# Drawing Annotation Features

This document describes the new mouse drawing functionality added to the OpenSCAD WebUI that allows users to annotate 3D shapes directly on the render canvas.

## Features

The drawing system provides the following capabilities:

- **Mouse Drawing**: Click and drag on the render canvas to draw annotations
- **Touch Support**: Works on mobile devices with touch gestures
- **Customizable Colors**: Change drawing color using any CSS color value
- **Variable Line Width**: Adjust line thickness from 1-10 pixels
- **Clear Annotations**: Remove all drawings with a single command
- **Toggle Mode**: Enable/disable drawing mode as needed

## How to Use

### Basic Usage

1. **Enable Drawing Mode**:
   ```javascript
   window.enableDrawing();
   // or toggle on/off
   window.toggleDrawing();
   ```

2. **Start Drawing**:
   - When drawing mode is enabled, click and drag on the 3D render canvas
   - The cursor will change to a crosshair when drawing is enabled
   - Release the mouse button to finish a stroke

3. **Disable Drawing Mode**:
   ```javascript
   window.disableDrawing();
   ```

### Customization

**Change Drawing Color**:
```javascript
window.setDrawingColor('#ff0000');  // Red
window.setDrawingColor('blue');     // Blue
window.setDrawingColor('rgb(255, 0, 255)'); // Magenta
```

**Change Line Width**:
```javascript
window.setDrawingLineWidth(5); // 5 pixel wide lines
```

**Clear All Annotations**:
```javascript
window.clearAnnotations();
```

**Check Drawing State**:
```javascript
const state = window.getDrawingState();
console.log(state);
// Returns: { enabled: true/false, color: '#ff0000', lineWidth: 2, isDrawing: true/false }
```

## Available Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `enableDrawing()` | Enable drawing mode | None |
| `disableDrawing()` | Disable drawing mode | None |
| `toggleDrawing()` | Toggle drawing mode on/off | None |
| `clearAnnotations()` | Clear all drawn annotations | None |
| `setDrawingColor(color)` | Set drawing color | `color` (string): CSS color value |
| `setDrawingLineWidth(width)` | Set line width | `width` (number): Line width in pixels (1-10) |
| `getDrawingState()` | Get current drawing state | None |

## Implementation Details

### Technical Architecture

- **Overlay Canvas**: A transparent HTML5 canvas is overlaid on top of the Babylon.js render canvas
- **Event Handling**: Mouse and touch events are captured on the render canvas and translated to drawing operations
- **Responsive Design**: The annotation canvas automatically resizes with the render canvas
- **Performance**: Drawing operations are optimized for smooth real-time annotation

### Canvas Layering

```
┌─────────────────────────┐
│   Annotation Canvas     │ ← Drawing layer (z-index: 10)
│     (transparent)       │
├─────────────────────────┤
│   Babylon.js Canvas     │ ← 3D render layer
│   (renderCanvas)        │
└─────────────────────────┘
```

### Event Flow

1. User clicks on render canvas
2. If drawing enabled: Start drawing path
3. Mouse move events continue the path
4. Mouse up/leave events end the path
5. Touch events are converted to mouse events for mobile support

## Browser Compatibility

- **Desktop**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **Mobile**: iOS Safari, Chrome Mobile, Firefox Mobile
- **Requirements**: HTML5 Canvas support, ES6 modules

## Example Integration

Here's a complete example of integrating drawing controls into your UI:

```html
<div class="drawing-toolbar">
    <button onclick="window.toggleDrawing()">Toggle Drawing</button>
    <input type="color" onchange="window.setDrawingColor(this.value)" value="#ff0000">
    <input type="range" min="1" max="10" value="2" onchange="window.setDrawingLineWidth(this.value)">
    <button onclick="window.clearAnnotations()">Clear</button>
</div>
```

## Use Cases

- **Design Review**: Mark areas of interest on 3D models
- **Teaching**: Highlight specific features for educational purposes
- **Collaboration**: Annotate models for team discussions
- **Documentation**: Create visual notes on designs
- **Presentation**: Draw attention to specific model details

## Limitations

- Annotations are not persistent (cleared on page reload)
- Drawings are 2D overlays, not 3D annotations
- No undo/redo functionality (use clear all to reset)
- Limited to basic line drawing (no shapes or text)

## Future Enhancements

Potential improvements for future versions:
- Persistent annotation storage
- 3D annotation support
- Shape tools (rectangles, circles, arrows)
- Text annotation support
- Undo/redo functionality
- Export annotations with screenshots
