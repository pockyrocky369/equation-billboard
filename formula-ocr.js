(function () {
  let worker;
  let sequence = 0;
  const baseUrl = document.currentScript?.src || location.href;
  const pending = new Map();
  function getWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('./formula-ocr-worker.js', baseUrl), { type: 'module' });
    worker.onmessage = event => {
      const message = event.data;
      if (message.type === 'progress') {
        for (const task of pending.values()) task.onProgress?.({ stage: 'download', progress: message.progress });
        return;
      }
      const task = pending.get(message.id);
      if (!task) return;
      if (message.type === 'stage') task.onProgress?.({ stage: message.stage });
      if (message.type === 'result' || message.type === 'error') {
        pending.delete(message.id);
        if (message.type === 'error') task.reject(new Error(message.message));
        else task.resolve(cleanOcrLatex(message.latex));
      }
    };
    worker.onerror = event => {
      for (const task of pending.values()) task.reject(new Error('公式识别组件运行失败'));
      pending.clear(); worker.terminate(); worker = null;
      event.preventDefault();
    };
    return worker;
  }
  window.FormulaOCR = {
    recognize(file, onProgress) {
      if (!file?.type?.startsWith('image/')) return Promise.reject(new Error('请选择图片文件'));
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, onProgress });
        try { getWorker().postMessage({ id, file }); }
        catch (error) { pending.delete(id); reject(error); }
      });
    }
  };
})();
