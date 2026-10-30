/** Keep the file index in a worker; transfer only a requested catalog page. */
export function createCsvClient({onProgress = () => {}} = {}) {
  const worker = new Worker(new URL('./csv-worker.mjs', import.meta.url), {type: 'module'});
  const pending = new Map();
  let sequence = 0, disposed = false;
  function close(error) {
    if (disposed) return;
    disposed = true;
    worker.terminate();
    for (const {reject} of pending.values()) reject(error);
    pending.clear();
  }
  worker.onmessage = ({data}) => {
    const request = pending.get(data?.id);
    if (!request || disposed) return;
    if (data.type === 'progress') { onProgress(data); return; }
    pending.delete(data.id);
    if (data.type === 'error') request.reject(new Error(data.message || 'CSV import failed.'));
    else if (data.type === 'ready') request.resolve(data);
    else if (data.type === 'page') request.resolve(data.page);
    else request.reject(new Error('The CSV worker returned an unexpected response. Reload the workspace and try again.'));
  };
  worker.onerror = event => {
    event.preventDefault();
    close(new Error('The CSV worker could not finish. Your previous catalog is unchanged. Reload the workspace and try again.'));
  };
  worker.onmessageerror = () => close(new Error('The CSV worker response could not be read. Reload the workspace and try again.'));
  function request(type, payload) {
    if (disposed) return Promise.reject(new Error('This CSV session has closed. Import the file again.'));
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, {resolve, reject});
      try { worker.postMessage({id, type, ...payload}); }
      catch (error) { pending.delete(id); reject(error); }
    });
  }
  return {
    open: file => request('open', {file}),
    page: options => request('page', options),
    dispose() {
      const error = new Error('CSV import cancelled.'); error.name = 'AbortError'; close(error);
    },
  };
}
