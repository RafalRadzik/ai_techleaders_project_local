import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { Backend } from './backend';
import type { Controller } from './controller';
import type { Scenarios } from './scenario';

type Runtime = { controller: Controller; backend: Backend; scenarios: Scenarios };
const RuntimeContext = createContext<Runtime | null>(null);

/** Re-renders on every controller, backend or scenario change and hands back the live objects. */
export function usePrototype(): Runtime & { state: Controller['state'] } {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error('usePrototype needs PrototypeProvider');
  useSyncExternalStore(runtime.controller.subscribe, runtime.controller.version);
  useSyncExternalStore(runtime.backend.subscribe, runtime.backend.version);
  useSyncExternalStore(runtime.scenarios.subscribe, runtime.scenarios.version);
  return { ...runtime, state: runtime.controller.state };
}

export function PrototypeProvider({ runtime, children }: { runtime: Runtime; children: ReactNode }) {
  useEffect(() => {
    const onChange = (event: Event) => runtime.controller.enter((event as CustomEvent<string>).detail);
    document.addEventListener('prototype:screen-change', onChange);
    // The engine may have shown the first screen before this listener existed.
    const current = document.querySelector('.screen.is-current');
    if (current) runtime.controller.enter(current.id);
    return () => document.removeEventListener('prototype:screen-change', onChange);
  }, [runtime]);
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}
