import { useEffect, useState } from 'react';
export const TOTAL_STEPS = 7;

interface FlowLocation {
  step: number;
}

function readFlowLocation(): FlowLocation {
  const params = new URLSearchParams(window.location.search);
  const requestedStep = Number(params.get('step'));
  const step = Number.isInteger(requestedStep)
    ? Math.min(TOTAL_STEPS - 1, Math.max(0, requestedStep - 1))
    : 0;
  return { step };
}

function flowPath(step: number) {
  if (step === 0) return '/create';

  const params = new URLSearchParams({ step: String(step + 1) });
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

  const navigateFlow = (nextStep: number) => {
    window.history.pushState(
      { ...window.history.state, alumniApp: true },
      '',
      flowPath(nextStep),
    );
    setLocation({ step: nextStep });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return { ...location, navigateFlow };
}
