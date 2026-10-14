import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

interface DragToDismissOptions {
  enabled?: boolean;
  /** Drag distance (px) past which releasing dismisses. */
  threshold?: number;
  /** Downward speed (px/ms) that also dismisses, for quick flicks. */
  velocity?: number;
  onDismiss: () => void;
}

/**
 * Vertical drag-to-dismiss for a bottom sheet.
 *
 * Pointer events are used so it works with mouse, touch and pen. The consumer
 * applies `offset` as a `translateY` and disables its CSS transition while
 * `dragging` is true.
 */
export function useDragToDismiss({
  enabled = true,
  threshold = 110,
  velocity = 0.6,
  onDismiss,
}: DragToDismissOptions) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startTime = useRef(0);
  const currentOffset = useRef(0);
  const isDragging = useRef(false);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled) return;
      startY.current = event.clientY;
      startTime.current = Date.now();
      currentOffset.current = 0;
      isDragging.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!isDragging.current) return;
      const next = Math.max(0, event.clientY - startY.current);
      currentOffset.current = next;
      setOffset(next);
    },
    [],
  );

  const finish = useCallback(() => {
    if (!isDragging.current) return;
    const elapsed = Math.max(1, Date.now() - startTime.current);
    const speed = currentOffset.current / elapsed;
    const shouldDismiss = currentOffset.current > threshold || speed > velocity;

    isDragging.current = false;
    setDragging(false);
    setOffset(0);
    if (shouldDismiss) onDismiss();
  }, [onDismiss, threshold, velocity]);

  return {
    offset,
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
