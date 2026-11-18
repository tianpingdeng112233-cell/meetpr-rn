import { createContext } from 'react';

/** App-shell overlays (including their unresolved startup checks) block introductions. */
export const StartupOverlayContext = createContext(false);
