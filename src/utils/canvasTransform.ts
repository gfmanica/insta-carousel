import type { CanvasLayer, ImageCrop } from '../types/carousel';

export type InteractionMode =
  | 'move'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-sw'
  | 'resize-se'
  | 'resize-n'
  | 'resize-s'
  | 'resize-e'
  | 'resize-w'
  | 'rotate';

export interface DragState {
  layerId: string;
  layerType: 'image' | 'text';
  mode: InteractionMode;
  startClientX: number;
  startClientY: number;
  initialX: number;
  initialY: number;
  initialW: number;
  initialH: number;
  initialRotation: number;
  aspectRatio: number;
  initialCrop: ImageCrop;
}

export interface SnapGuide {
  pos: number;
  kind: 'block' | 'layer';
}

export interface LiveLayerPatch {
  layerId: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  crop?: ImageCrop;
}

export interface DragComputeResult {
  patch: LiveLayerPatch;
  snapX: SnapGuide | null;
  snapY: SnapGuide | null;
}

const SNAP_THRESHOLD = 12;

export function computeDragTransform(
  dragState: DragState,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
  zoom: number,
  slidesCount: number,
  slideW: number,
  totalHeight: number,
  otherLayers: CanvasLayer[]
): DragComputeResult {
  const dx = (clientX - dragState.startClientX) / zoom;
  const dy = (clientY - dragState.startClientY) / zoom;

  if (dragState.mode === 'move') {
    let nextX = dragState.initialX + dx;
    let nextY = dragState.initialY + dy;
    let snappedX: SnapGuide | null = null;
    let snappedY: SnapGuide | null = null;

    const centerX = nextX + dragState.initialW / 2;
    const rightX = nextX + dragState.initialW;

    for (let i = 0; i <= slidesCount; i++) {
      const seamX = i * slideW;
      if (Math.abs(centerX - seamX) < SNAP_THRESHOLD) {
        nextX = seamX - dragState.initialW / 2;
        snappedX = { pos: seamX, kind: 'block' };
        break;
      }
      if (Math.abs(nextX - seamX) < SNAP_THRESHOLD) {
        nextX = seamX;
        snappedX = { pos: seamX, kind: 'block' };
        break;
      }
      if (Math.abs(rightX - seamX) < SNAP_THRESHOLD) {
        nextX = seamX - dragState.initialW;
        snappedX = { pos: seamX, kind: 'block' };
        break;
      }
      if (i < slidesCount) {
        const slideMidX = i * slideW + slideW / 2;
        if (Math.abs(centerX - slideMidX) < SNAP_THRESHOLD) {
          nextX = slideMidX - dragState.initialW / 2;
          snappedX = { pos: slideMidX, kind: 'block' };
          break;
        }
        if (Math.abs(nextX - slideMidX) < SNAP_THRESHOLD) {
          nextX = slideMidX;
          snappedX = { pos: slideMidX, kind: 'block' };
          break;
        }
        if (Math.abs(rightX - slideMidX) < SNAP_THRESHOLD) {
          nextX = slideMidX - dragState.initialW;
          snappedX = { pos: slideMidX, kind: 'block' };
          break;
        }
      }
    }

    if (snappedX === null) {
      for (const other of otherLayers) {
        const oLeft = other.x;
        const oCenter = other.x + other.width / 2;
        const oRight = other.x + other.width;

        if (Math.abs(nextX - oLeft) < SNAP_THRESHOLD) {
          nextX = oLeft;
          snappedX = { pos: oLeft, kind: 'layer' };
          break;
        }
        if (Math.abs(nextX - oRight) < SNAP_THRESHOLD) {
          nextX = oRight;
          snappedX = { pos: oRight, kind: 'layer' };
          break;
        }
        if (Math.abs(nextX - oCenter) < SNAP_THRESHOLD) {
          nextX = oCenter;
          snappedX = { pos: oCenter, kind: 'layer' };
          break;
        }
        if (Math.abs(rightX - oLeft) < SNAP_THRESHOLD) {
          nextX = oLeft - dragState.initialW;
          snappedX = { pos: oLeft, kind: 'layer' };
          break;
        }
        if (Math.abs(rightX - oRight) < SNAP_THRESHOLD) {
          nextX = oRight - dragState.initialW;
          snappedX = { pos: oRight, kind: 'layer' };
          break;
        }
        if (Math.abs(rightX - oCenter) < SNAP_THRESHOLD) {
          nextX = oCenter - dragState.initialW;
          snappedX = { pos: oCenter, kind: 'layer' };
          break;
        }
        if (Math.abs(centerX - oCenter) < SNAP_THRESHOLD) {
          nextX = oCenter - dragState.initialW / 2;
          snappedX = { pos: oCenter, kind: 'layer' };
          break;
        }
      }
    }

    const centerY = nextY + dragState.initialH / 2;
    const bottomY = nextY + dragState.initialH;
    const midY = totalHeight / 2;

    if (Math.abs(nextY) < SNAP_THRESHOLD) {
      nextY = 0;
      snappedY = { pos: 0, kind: 'block' };
    } else if (Math.abs(bottomY - totalHeight) < SNAP_THRESHOLD) {
      nextY = totalHeight - dragState.initialH;
      snappedY = { pos: totalHeight, kind: 'block' };
    } else if (Math.abs(centerY - midY) < SNAP_THRESHOLD) {
      nextY = midY - dragState.initialH / 2;
      snappedY = { pos: midY, kind: 'block' };
    } else if (Math.abs(nextY - midY) < SNAP_THRESHOLD) {
      nextY = midY;
      snappedY = { pos: midY, kind: 'block' };
    } else if (Math.abs(bottomY - midY) < SNAP_THRESHOLD) {
      nextY = midY - dragState.initialH;
      snappedY = { pos: midY, kind: 'block' };
    } else if (Math.abs(bottomY) < SNAP_THRESHOLD) {
      nextY = -dragState.initialH;
      snappedY = { pos: 0, kind: 'block' };
    } else if (Math.abs(nextY - totalHeight) < SNAP_THRESHOLD) {
      nextY = totalHeight;
      snappedY = { pos: totalHeight, kind: 'block' };
    }

    if (snappedY === null) {
      for (const other of otherLayers) {
        const oTop = other.y;
        const oMid = other.y + other.height / 2;
        const oBottom = other.y + other.height;

        if (Math.abs(nextY - oTop) < SNAP_THRESHOLD) {
          nextY = oTop;
          snappedY = { pos: oTop, kind: 'layer' };
          break;
        }
        if (Math.abs(nextY - oBottom) < SNAP_THRESHOLD) {
          nextY = oBottom;
          snappedY = { pos: oBottom, kind: 'layer' };
          break;
        }
        if (Math.abs(nextY - oMid) < SNAP_THRESHOLD) {
          nextY = oMid;
          snappedY = { pos: oMid, kind: 'layer' };
          break;
        }
        if (Math.abs(bottomY - oTop) < SNAP_THRESHOLD) {
          nextY = oTop - dragState.initialH;
          snappedY = { pos: oTop, kind: 'layer' };
          break;
        }
        if (Math.abs(bottomY - oBottom) < SNAP_THRESHOLD) {
          nextY = oBottom - dragState.initialH;
          snappedY = { pos: oBottom, kind: 'layer' };
          break;
        }
        if (Math.abs(bottomY - oMid) < SNAP_THRESHOLD) {
          nextY = oMid - dragState.initialH;
          snappedY = { pos: oMid, kind: 'layer' };
          break;
        }
        if (Math.abs(centerY - oMid) < SNAP_THRESHOLD) {
          nextY = oMid - dragState.initialH / 2;
          snappedY = { pos: oMid, kind: 'layer' };
          break;
        }
      }
    }

    return {
      patch: {
        layerId: dragState.layerId,
        x: Math.round(nextX),
        y: Math.round(nextY),
      },
      snapX: snappedX,
      snapY: snappedY,
    };
  }

  // Inline Image Crop on the 4 side handles
  if (
    dragState.layerType === 'image' &&
    (dragState.mode === 'resize-n' ||
      dragState.mode === 'resize-s' ||
      dragState.mode === 'resize-e' ||
      dragState.mode === 'resize-w')
  ) {
    let snappedX: SnapGuide | null = null;
    let snappedY: SnapGuide | null = null;

    const ic = dragState.initialCrop;
    const pxPerCropX = dragState.initialW / Math.max(0.02, ic.width);
    const pxPerCropY = dragState.initialH / Math.max(0.02, ic.height);
    const minSize = 40;

    let newX = dragState.initialX;
    let newY = dragState.initialY;
    let newW = dragState.initialW;
    let newH = dragState.initialH;
    let cropX = ic.x;
    let cropY = ic.y;
    let cropW = ic.width;
    let cropH = ic.height;

    if (dragState.mode === 'resize-e') {
      const maxW = (1 - ic.x) * pxPerCropX;
      newW = Math.max(minSize, Math.min(maxW, dragState.initialW + dx));
      for (let i = 0; i <= slidesCount; i++) {
        const seamX = i * slideW;
        if (Math.abs(newX + newW - seamX) < SNAP_THRESHOLD && seamX - newX >= minSize && seamX - newX <= maxW) {
          newW = seamX - newX;
          snappedX = { pos: seamX, kind: 'block' };
          break;
        }
        if (i < slidesCount) {
          const midX = i * slideW + slideW / 2;
          if (Math.abs(newX + newW - midX) < SNAP_THRESHOLD && midX - newX >= minSize && midX - newX <= maxW) {
            newW = midX - newX;
            snappedX = { pos: midX, kind: 'block' };
            break;
          }
        }
      }
      if (!snappedX) {
        for (const other of otherLayers) {
          for (const xp of [other.x, other.x + other.width / 2, other.x + other.width]) {
            if (Math.abs(newX + newW - xp) < SNAP_THRESHOLD && xp - newX >= minSize && xp - newX <= maxW) {
              newW = xp - newX;
              snappedX = { pos: xp, kind: 'layer' };
              break;
            }
          }
          if (snappedX) break;
        }
      }
      cropW = Math.max(0.02, Math.min(1 - ic.x, newW / pxPerCropX));
    } else if (dragState.mode === 'resize-w') {
      const minDx = -ic.x * pxPerCropX;
      const maxDx = dragState.initialW - minSize;
      let clampedDx = Math.max(minDx, Math.min(maxDx, dx));
      newX = dragState.initialX + clampedDx;
      for (let i = 0; i <= slidesCount; i++) {
        const seamX = i * slideW;
        const candidateDx = seamX - dragState.initialX;
        if (Math.abs(newX - seamX) < SNAP_THRESHOLD && candidateDx >= minDx && candidateDx <= maxDx) {
          clampedDx = candidateDx;
          newX = seamX;
          snappedX = { pos: seamX, kind: 'block' };
          break;
        }
        if (i < slidesCount) {
          const midX = i * slideW + slideW / 2;
          const midDx = midX - dragState.initialX;
          if (Math.abs(newX - midX) < SNAP_THRESHOLD && midDx >= minDx && midDx <= maxDx) {
            clampedDx = midDx;
            newX = midX;
            snappedX = { pos: midX, kind: 'block' };
            break;
          }
        }
      }
      if (!snappedX) {
        for (const other of otherLayers) {
          for (const xp of [other.x, other.x + other.width / 2, other.x + other.width]) {
            const candidateDx = xp - dragState.initialX;
            if (Math.abs(newX - xp) < SNAP_THRESHOLD && candidateDx >= minDx && candidateDx <= maxDx) {
              clampedDx = candidateDx;
              newX = xp;
              snappedX = { pos: xp, kind: 'layer' };
              break;
            }
          }
          if (snappedX) break;
        }
      }
      newW = dragState.initialW - clampedDx;
      cropX = Math.max(0, Math.min(1 - 0.02, ic.x + clampedDx / pxPerCropX));
      cropW = Math.max(0.02, Math.min(1 - cropX, newW / pxPerCropX));
    } else if (dragState.mode === 'resize-s') {
      const maxH = (1 - ic.y) * pxPerCropY;
      newH = Math.max(minSize, Math.min(maxH, dragState.initialH + dy));
      for (const by of [totalHeight / 2, totalHeight]) {
        if (Math.abs(newY + newH - by) < SNAP_THRESHOLD && by - newY >= minSize && by - newY <= maxH) {
          newH = by - newY;
          snappedY = { pos: by, kind: 'block' };
          break;
        }
      }
      if (!snappedY) {
        for (const other of otherLayers) {
          for (const yp of [other.y, other.y + other.height / 2, other.y + other.height]) {
            if (Math.abs(newY + newH - yp) < SNAP_THRESHOLD && yp - newY >= minSize && yp - newY <= maxH) {
              newH = yp - newY;
              snappedY = { pos: yp, kind: 'layer' };
              break;
            }
          }
          if (snappedY) break;
        }
      }
      cropH = Math.max(0.02, Math.min(1 - ic.y, newH / pxPerCropY));
    } else if (dragState.mode === 'resize-n') {
      const minDy = -ic.y * pxPerCropY;
      const maxDy = dragState.initialH - minSize;
      let clampedDy = Math.max(minDy, Math.min(maxDy, dy));
      newY = dragState.initialY + clampedDy;
      for (const by of [0, totalHeight / 2]) {
        const candidateDy = by - dragState.initialY;
        if (Math.abs(newY - by) < SNAP_THRESHOLD && candidateDy >= minDy && candidateDy <= maxDy) {
          clampedDy = candidateDy;
          newY = by;
          snappedY = { pos: by, kind: 'block' };
          break;
        }
      }
      if (!snappedY) {
        for (const other of otherLayers) {
          for (const yp of [other.y, other.y + other.height / 2, other.y + other.height]) {
            const candidateDy = yp - dragState.initialY;
            if (Math.abs(newY - yp) < SNAP_THRESHOLD && candidateDy >= minDy && candidateDy <= maxDy) {
              clampedDy = candidateDy;
              newY = yp;
              snappedY = { pos: yp, kind: 'layer' };
              break;
            }
          }
          if (snappedY) break;
        }
      }
      newH = dragState.initialH - clampedDy;
      cropY = Math.max(0, Math.min(1 - 0.02, ic.y + clampedDy / pxPerCropY));
      cropH = Math.max(0.02, Math.min(1 - cropY, newH / pxPerCropY));
    }

    return {
      patch: {
        layerId: dragState.layerId,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
        crop: {
          x: +cropX.toFixed(4),
          y: +cropY.toFixed(4),
          width: +cropW.toFixed(4),
          height: +cropH.toFixed(4),
        },
      },
      snapX: snappedX,
      snapY: snappedY,
    };
  }

  if (dragState.mode.startsWith('resize-')) {
    const keepRatio = !shiftKey;
    let snappedX: SnapGuide | null = null;
    let snappedY: SnapGuide | null = null;

    let newW = dragState.initialW;
    let newH = dragState.initialH;
    let newX = dragState.initialX;
    let newY = dragState.initialY;

    if (dragState.mode === 'resize-se') {
      newW = Math.max(40, dragState.initialW + dx);
      newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH + dy);
    } else if (dragState.mode === 'resize-sw') {
      newW = Math.max(40, dragState.initialW - dx);
      newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH + dy);
      newX = dragState.initialX + (dragState.initialW - newW);
    } else if (dragState.mode === 'resize-ne') {
      newW = Math.max(40, dragState.initialW + dx);
      newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH - dy);
      newY = dragState.initialY + (dragState.initialH - newH);
    } else if (dragState.mode === 'resize-nw') {
      newW = Math.max(40, dragState.initialW - dx);
      newH = keepRatio ? newW / dragState.aspectRatio : Math.max(40, dragState.initialH - dy);
      newX = dragState.initialX + (dragState.initialW - newW);
      newY = dragState.initialY + (dragState.initialH - newH);
    } else if (dragState.mode === 'resize-e') {
      newW = Math.max(40, dragState.initialW + dx);
    } else if (dragState.mode === 'resize-w') {
      newW = Math.max(40, dragState.initialW - dx);
      newX = dragState.initialX + (dragState.initialW - newW);
    } else if (dragState.mode === 'resize-s') {
      newH = Math.max(40, dragState.initialH + dy);
    } else if (dragState.mode === 'resize-n') {
      newH = Math.max(40, dragState.initialH - dy);
      newY = dragState.initialY + (dragState.initialH - newH);
    }

    if (dragState.mode.includes('n') && Math.abs(newY) < SNAP_THRESHOLD) {
      const diff = newY;
      newY = 0;
      newH += diff;
      if (keepRatio) newW = newH * dragState.aspectRatio;
      snappedY = { pos: 0, kind: 'block' };
    } else if (dragState.mode.includes('n') && Math.abs(newY - totalHeight / 2) < SNAP_THRESHOLD) {
      const diff = newY - totalHeight / 2;
      newY = totalHeight / 2;
      newH += diff;
      if (keepRatio) newW = newH * dragState.aspectRatio;
      snappedY = { pos: totalHeight / 2, kind: 'block' };
    } else if (dragState.mode.includes('s') && Math.abs(newY + newH - totalHeight) < SNAP_THRESHOLD) {
      newH = totalHeight - newY;
      if (keepRatio) newW = newH * dragState.aspectRatio;
      snappedY = { pos: totalHeight, kind: 'block' };
    } else if (dragState.mode.includes('s') && Math.abs(newY + newH - totalHeight / 2) < SNAP_THRESHOLD) {
      newH = totalHeight / 2 - newY;
      if (keepRatio) newW = newH * dragState.aspectRatio;
      snappedY = { pos: totalHeight / 2, kind: 'block' };
    }

    if (snappedY === null) {
      for (const other of otherLayers) {
        for (const yp of [other.y, other.y + other.height / 2, other.y + other.height]) {
          if (dragState.mode.includes('n') && Math.abs(newY - yp) < SNAP_THRESHOLD) {
            const diff = newY - yp;
            newY = yp;
            newH += diff;
            if (keepRatio) newW = newH * dragState.aspectRatio;
            snappedY = { pos: yp, kind: 'layer' };
            break;
          }
          if (dragState.mode.includes('s') && Math.abs(newY + newH - yp) < SNAP_THRESHOLD) {
            newH = yp - newY;
            if (keepRatio) newW = newH * dragState.aspectRatio;
            snappedY = { pos: yp, kind: 'layer' };
            break;
          }
        }
        if (snappedY !== null) break;
      }
    }

    for (let i = 0; i <= slidesCount; i++) {
      const seamX = i * slideW;
      if (dragState.mode.includes('w') && Math.abs(newX - seamX) < SNAP_THRESHOLD) {
        const diff = newX - seamX;
        newX = seamX;
        newW += diff;
        if (keepRatio) newH = newW / dragState.aspectRatio;
        snappedX = { pos: seamX, kind: 'block' };
        break;
      }
      if (dragState.mode.includes('e') && Math.abs(newX + newW - seamX) < SNAP_THRESHOLD) {
        newW = seamX - newX;
        if (keepRatio) newH = newW / dragState.aspectRatio;
        snappedX = { pos: seamX, kind: 'block' };
        break;
      }
      if (i < slidesCount) {
        const midX = i * slideW + slideW / 2;
        if (dragState.mode.includes('w') && Math.abs(newX - midX) < SNAP_THRESHOLD) {
          const diff = newX - midX;
          newX = midX;
          newW += diff;
          if (keepRatio) newH = newW / dragState.aspectRatio;
          snappedX = { pos: midX, kind: 'block' };
          break;
        }
        if (dragState.mode.includes('e') && Math.abs(newX + newW - midX) < SNAP_THRESHOLD) {
          newW = midX - newX;
          if (keepRatio) newH = newW / dragState.aspectRatio;
          snappedX = { pos: midX, kind: 'block' };
          break;
        }
      }
    }

    if (snappedX === null) {
      for (const other of otherLayers) {
        for (const xp of [other.x, other.x + other.width / 2, other.x + other.width]) {
          if (dragState.mode.includes('w') && Math.abs(newX - xp) < SNAP_THRESHOLD) {
            const diff = newX - xp;
            newX = xp;
            newW += diff;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = { pos: xp, kind: 'layer' };
            break;
          }
          if (dragState.mode.includes('e') && Math.abs(newX + newW - xp) < SNAP_THRESHOLD) {
            newW = xp - newX;
            if (keepRatio) newH = newW / dragState.aspectRatio;
            snappedX = { pos: xp, kind: 'layer' };
            break;
          }
        }
        if (snappedX !== null) break;
      }
    }

    return {
      patch: {
        layerId: dragState.layerId,
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      },
      snapX: snappedX,
      snapY: snappedY,
    };
  }

  return {
    patch: {
      layerId: dragState.layerId,
      rotation: Math.round((dragState.initialRotation + dx * 0.45) % 360),
    },
    snapX: null,
    snapY: null,
  };
}
