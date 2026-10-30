/** Dedicated worker: retain the File and compact index, return only requested pages. */
import {indexCsv, CSV_STREAM_LIMITS} from './csv-stream.mjs';

let current = null, generation = 0;
globalThis.onmessage = async ({data}) => {
  const {id, type} = data ?? {};
  let requestGeneration = generation;
  try {
    if (type === 'open') {
      requestGeneration = ++generation;
      current = null;
      const opened = await indexCsv(data.file, {onProgress: progress => {
        if (requestGeneration === generation) globalThis.postMessage({id, type: 'progress', ...progress});
      }});
      if (requestGeneration !== generation) return;
      current = opened;
      globalThis.postMessage({id, type: 'ready', total: opened.total, kind: opened.kind,
        operations: opened.operations, totalBytes: opened.totalBytes, limits: CSV_STREAM_LIMITS});
    } else if (type === 'page') {
      if (!current) throw new Error('Open and validate a CSV file before requesting a page.');
      const index = current;
      const page = await index.page({start: data.start, count: data.count});
      if (requestGeneration === generation && current === index) globalThis.postMessage({id, type: 'page', page});
    } else {
      throw new Error('Unknown CSV worker request.');
    }
  } catch (error) {
    if (requestGeneration === generation) globalThis.postMessage({id, type: 'error', message: error?.message || String(error)});
  }
};
