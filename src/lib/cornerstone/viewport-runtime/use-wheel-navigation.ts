export interface WheelNavigationState {
  delta: number;
  lastWheelAt: number;
  lastScrollAt: number;
}

const WHEEL_DELTA_THRESHOLD = 48;
const WHEEL_SCROLL_INTERVAL_MS = 36;
const WHEEL_IDLE_RESET_MS = 220;
const WHEEL_LINE_HEIGHT_PX = 18;
const MAX_WHEEL_SCROLL_STEPS_PER_EVENT = 3;

export function normalizeWheelDelta(event: WheelEvent, viewportHeight: number) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * WHEEL_LINE_HEIGHT_PX;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * Math.max(viewportHeight, 1);
  }

  return event.deltaY;
}

export function consumeWheelNavigationSteps(
  state: WheelNavigationState,
  event: WheelEvent,
  viewportHeight: number,
) {
  const now = performance.now();
  const normalizedDelta = normalizeWheelDelta(event, viewportHeight);

  if (now - state.lastWheelAt > WHEEL_IDLE_RESET_MS) {
    state.delta = 0;
  }

  state.lastWheelAt = now;
  state.delta += normalizedDelta;

  if (Math.abs(state.delta) < WHEEL_DELTA_THRESHOLD) {
    return 0;
  }

  if (now - state.lastScrollAt < WHEEL_SCROLL_INTERVAL_MS) {
    return 0;
  }

  const nextScrollSteps = Math.min(
    MAX_WHEEL_SCROLL_STEPS_PER_EVENT,
    Math.floor(Math.abs(state.delta) / WHEEL_DELTA_THRESHOLD),
  );

  if (nextScrollSteps < 1) {
    return 0;
  }

  const scrollDelta = state.delta > 0 ? nextScrollSteps : -nextScrollSteps;
  state.lastScrollAt = now;
  state.delta -=
    Math.sign(scrollDelta) * nextScrollSteps * WHEEL_DELTA_THRESHOLD;

  return scrollDelta;
}
