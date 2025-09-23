import html2canvas from 'https://esm.run/html2canvas';
import ImageTracer from 'https://esm.run/imagetracerjs';
import debounce from 'https://esm.run/debounce';

globalThis.ImageTracer = ImageTracer;
globalThis.html2canvas = html2canvas;
globalThis.debounce = debounce;