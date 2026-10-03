import { useEffect, useState } from 'react';
import { hasTrainingCamera } from './native';
export function useCameraAvailability(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let live = true;
    void hasTrainingCamera().then((value) => {
      if (live) setAvailable(value);
    });
    return () => {
      live = false;
    };
  }, []);
  return available;
}
