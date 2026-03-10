---
name: "cornerstone3d"
description: "Provides guidance for AI code generation using Cornerstone3D medical imaging library. Invoke when working with medical imaging, DICOM data, or building radiology applications with Cornerstone3D."
---

# Cornerstone3D Development Skill

This skill provides comprehensive guidance for AI code generation using the Cornerstone3D library, a JavaScript framework for building web-based medical imaging applications.

## Core Architecture Concepts

### 1. Rendering Engine System

Cornerstone3D uses a centralized `RenderingEngine` that manages multiple viewports through an offscreen WebGL canvas powered by vtk.js:

```typescript
import { RenderingEngine, Enums } from '@cornerstonejs/core';

// Initialize rendering engine
const renderingEngineId = 'myEngine';
const renderingEngine = new RenderingEngine(renderingEngineId);

// Create viewports
renderingEngine.setViewports([
  {
    viewportId: 'ctAxial',
    type: Enums.ViewportType.ORTHOGRAPHIC,
    element: htmlElement1,
    defaultOptions: {
      orientation: Enums.OrientationAxis.AXIAL,
    },
  },
  {
    viewportId: 'ctSagittal',
    type: Enums.ViewportType.ORTHOGRAPHIC,
    element: htmlElement2,
    defaultOptions: {
      orientation: Enums.OrientationAxis.SAGITTAL,
    },
  }
]);
```

**Key Points:**
- Single `RenderingEngine` can manage multiple viewports
- Uses offscreen rendering for better performance
- Supports both `setViewports()` (batch) and `enableElement()` (individual) APIs

### 2. Viewport Types

Cornerstone3D supports different viewport types for various imaging scenarios:

- **StackViewport**: For 2D image stacks (DICOM series)
- **VolumeViewport**: For 3D volume rendering with MPR capabilities
- **VolumeViewport3D**: For 3D volume rendering
- **VideoViewport**: For video playback
- **WSIViewport**: For whole slide imaging

### 3. Cache System

The library uses a sophisticated caching system with separate caches for images, volumes, and geometry:

```typescript
import { cache, volumeLoader } from '@cornerstonejs/core';

// Create and cache a volume
const volumeId = 'cornerstoneStreamingImageVolume:CT_VOLUME';
const volume = await volumeLoader.createAndCacheVolume(volumeId, {
  imageIds: dicomImageIds,
});

// Load the volume
volume.load();

// Set volume on viewport
viewport.setVolumes([{ volumeId }]);
```

**Cache Characteristics:**
- Image cache: Volatile, automatically managed
- Volume cache: Non-volatile, must be explicitly released
- Default max cache size: 3GB
- Individual volume limit: 2GB

### 4. Tool System Architecture

Cornerstone3D uses a `ToolGroup` system to manage interactive tools:

```typescript
import * as cornerstoneTools from '@cornerstonejs/tools';

// Add tools to library
cornerstoneTools.addTool(PanTool);
cornerstoneTools.addTool(ZoomTool);
cornerstoneTools.addTool(LengthTool);

// Create tool group
const toolGroup = ToolGroupManager.createToolGroup('toolGroupId');

// Add tools to group
toolGroup.addTool(PanTool.toolName);
toolGroup.addTool(ZoomTool.toolName);
toolGroup.addTool(LengthTool.toolName);

// Set tool modes
toolGroup.setToolActive(PanTool.toolName, {
  bindings: [{ mouseButton: MouseBindings.Auxiliary }],
});

toolGroup.setToolActive(LengthTool.toolName, {
  bindings: [{ mouseButton: MouseBindings.Primary }],
});

// Associate viewports with tool group
toolGroup.addViewport('viewportId', 'renderingEngineId');
```

### 5. Event System

Cornerstone3D uses a centralized event system for communication:

```typescript
import { eventTarget, Events } from '@cornerstonejs/core';

// Listen for events
eventTarget.addEventListener(Events.IMAGE_RENDERED, (evt) => {
  console.log('Image rendered:', evt.detail);
});

eventTarget.addEventListener(Events.VOI_MODIFIED, (evt) => {
  console.log('VOI modified:', evt.detail);
});
```

## Key Development Patterns

### 1. Initialization Pattern

```typescript
import { init } from '@cornerstonejs/core';

// Initialize cornerstone with configuration
await init({
  rendering: {
    renderingEngineMode: 'next', // or 'tiled'
    webGLContextCount: 7, // Default is 7
  },
});
```

### 2. Image Loading Pattern

```typescript
// For stack viewports
await viewport.setStack(imageIds);

// For volume viewports
const volume = await volumeLoader.createAndCacheVolume(volumeId, { imageIds });
volume.load();
await viewport.setVolumes([{ volumeId }]);
```

### 3. Tool Configuration Pattern

```typescript
// Always follow this sequence:
// 1. Add tool to library
cornerstoneTools.addTool(ToolClass);

// 2. Create tool group
const toolGroup = ToolGroupManager.createToolGroup(groupId);

// 3. Add tool to group
toolGroup.addTool(ToolClass.toolName);

// 4. Set tool mode
toolGroup.setToolActive(ToolClass.toolName, {
  bindings: [/* binding configuration */],
});

// 5. Associate viewports
toolGroup.addViewport(viewportId, renderingEngineId);
```

### 4. Error Handling Pattern

```typescript
try {
  const volume = cache.getVolume(volumeId);
  if (!volume) {
    throw new Error(`Volume ${volumeId} not found in cache`);
  }
  
  // Use volume
} catch (error) {
  console.error('Volume operation failed:', error);
  // Handle gracefully - often involves recreating the volume
}
```

## Common Pitfalls to Avoid

### 1. Memory Management
- **DO**: Explicitly release volumes when no longer needed
- **DON'T**: Assume cache will automatically clean up volumes
- **USE**: `cache.removeVolume(volumeId)` for cleanup

### 2. Tool Group Management
- **DO**: Use one tool group per viewport type
- **DON'T**: Add viewports to multiple tool groups
- **REMEMBER**: Viewport-tool group relationship is 1:1

### 3. Rendering Optimization
- **DO**: Use `renderViewports([specificIds])` instead of `render()`
- **DON'T**: Call render unnecessarily - let events trigger rendering
- **USE**: Event-driven rendering when possible

### 4. DICOM Data Handling
- **DO**: Use proper DICOM image IDs with correct schemes
- **DON'T**: Assume all DICOM data has the same orientation
- **VALIDATE**: Image spacing, orientation, and patient position

## Best Practices for AI Code Generation

### 1. Always Check for Existing Patterns
Before generating code, search for existing examples in:
- `/packages/core/examples/` - Core functionality examples
- `/packages/tools/examples/` - Tool-specific examples
- `/utils/demo/helpers/` - Common utility patterns

### 2. Follow Type Safety
Cornerstone3D is fully typed. Always:
- Use proper TypeScript interfaces
- Import types from `@cornerstonejs/core` and `@cornerstonejs/tools`
- Handle nullable types appropriately

### 3. Event-Driven Architecture
Design code to be event-driven:
- Listen for appropriate events rather than polling
- Use debounced events for performance-critical operations
- Clean up event listeners properly

### 4. Performance Considerations
- Use progressive loading for large volumes
- Implement proper cache management
- Optimize rendering with selective viewport updates
- Consider WebGL context limitations

## Integration Patterns

### With OHIF Viewer
```typescript
// OHIF integrates with Cornerstone3D through viewport components
// Use OHIF's extension system for custom tools and viewports
```

### With Custom DICOM Servers
```typescript
// Implement custom image loaders for proprietary archives
// Use DICOMweb standards for compatibility
```

### With AI/ML Models
```typescript
// Use the @cornerstonejs/ai package for AI integration
// Implement custom segmentation tools
// Handle model inference results appropriately
```

## Testing Patterns

### Unit Testing
```typescript
// Use the test utilities from /utils/test/testUtils
import { setupTestEnvironment, cleanupTestEnvironment } from '../../../utils/test/testUtils';

// Set up test environment before each test
beforeEach(() => {
  testEnv = setupTestEnvironment({ renderingEngineId });
});

afterEach(() => {
  cleanupTestEnvironment({ renderingEngineId });
});
```

### Integration Testing
- Test viewport interactions
- Validate tool behavior across different viewport types
- Ensure proper event propagation

## Common Use Cases

### 1. Basic Stack Viewer
```typescript
// Display a single DICOM series in a stack viewport
// Use StackViewport with setStack()
```

### 2. MPR Volume Viewer
```typescript
// Display volumetric data with multi-planar reconstruction
// Use VolumeViewport with orthogonal orientations
```

### 3. Annotation Tools
```typescript
// Implement measurement and annotation tools
// Use AnnotationTool base class
// Handle frame of reference for 3D annotations
```

### 4. Segmentation Workflow
```typescript
// Implement segmentation tools
// Use segmentation state management
// Handle labelmap volumes appropriately
```

This skill provides the foundational knowledge needed to generate correct and efficient code using the Cornerstone3D library. Always refer to the official documentation and existing examples when implementing specific features.