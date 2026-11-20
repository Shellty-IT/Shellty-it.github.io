import { createMeshHost } from './meshEngine';

const handle = createMeshHost((msg) => postMessage(msg));

onmessage = (event) => handle(event.data);
postMessage({ type: 'ready' });
