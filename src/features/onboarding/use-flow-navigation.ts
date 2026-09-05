import { useEffect, useState } from 'react';
import type { AvatarStage } from '../../../shared/avatar';

export const TOTAL_STEPS = 9;

interface FlowLocation {
  step: number;
  checkpoint: AvatarStage | null;
}

function readFlowLocation(): FlowLocation {
  const params = new URLSearchParams(window.location.search);
  const requestedStep = Number(params.get('step'));
  const step = Number.isInteger(requestedStep)
    ? Math.min(TOTAL_STEPS - 1, Math.max(0, requestedStep - 1))
    : 0;
  const requestedCheckpoint = Number(params.get('checkpoint'));
  const checkpoint =
    requestedCheckpoint === 1 ||
    requestedCheckpoint === 2 ||
    requestedCheckpoint === 3
      ? requestedCheckpoint
      : null;

  return { step, checkpoint };
}

function flowPath(step: number, checkpoint: AvatarStage | null = null) {
  if (step === 0 && checkpoint === null) return '/create';

  const params = new URLSearchParams({ step: String(step + 1) });
  if (checkpoint) params.set('checkpoint', String(checkpoint));
  return `/create?${params.toString()}`;
}

export function useFlowNavigation() {
  const [location, setLocation] = useState(readFlowLocation);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname !== '/create') return;
      const location = readFlowLocation();
      setLocation(location);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateFlow = (
    nextStep: number,
    nextCheckpoint: AvatarStage | null = null,
  ) => {
    window.history.pushState(
      { ...window.history.state, alumniApp: true },
      '',
      flowPath(nextStep, nextCheckpoint),
    );
    setLocation({ step: nextStep, checkpoint: nextCheckpoint });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { ...location, navigateFlow };
}
