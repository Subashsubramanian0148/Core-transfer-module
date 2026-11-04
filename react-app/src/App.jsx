import { useEffect, useRef } from 'react';
import markup from './markup.html?raw';
import { initPrototype } from './prototype.js';
import './styles.css';

export default function App() {
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // guard against StrictMode double-run
    started.current = true;
    initPrototype();
  }, []);
  return <div ref={ref} dangerouslySetInnerHTML={{ __html: markup }} />;
}
