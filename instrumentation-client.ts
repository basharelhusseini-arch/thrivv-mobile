import {reportBrowserError} from './lib/browser-error-reporting';
window.addEventListener('error',event=>reportBrowserError(event.error));
window.addEventListener('unhandledrejection',event=>reportBrowserError(event.reason));
