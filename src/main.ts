// Solar System — modular entry point
import './scene';
import { closeDetail, openKiki, closeKiki } from './controls';
import { animate } from './animate';

// Expose to HTML onclick handlers
(window as any).closeDetail = closeDetail;
(window as any).openKiki = openKiki;
(window as any).closeKiki = closeKiki;

animate();
