import React, { useState, useEffect, useRef } from "react";
import { checkHealth, analyzeImage } from "./services/api";

export default function App() {
  const [apiReady, setApiReady] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [conf, setConf] = useState(0.35);
  const [iou, setIou] = useState(0.45);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let interval;
    const poll = async () => {
      try {
        await checkHealth();
        setApiReady(true);
        if (interval) clearInterval(interval);
      } catch (err) {
        setApiReady(false);
      }
    };
    poll();
    interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setResult(null);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleRunInference = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeImage(file, conf, iou);
      setResult(data);
    } catch (err) {
      console.error("Inference failure:", err);
      alert("Inference failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const exportCSV = () => {
    if (!result?.detections?.length) return;
    const headers = "Class ID,Class Name,Confidence,X_Min,Y_Min,X_Max,Y_Max\n";
    const rows = result.detections
      .map((d) => `${d.class_id},${d.class_name},${d.confidence},${d.bbox.join(",")}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `compliance_audit_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-gray-200 flex flex-col font-sans">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
          <h1 className="text-lg font-semibold tracking-wide text-white">
            Helmet Detection Compliance Workspace
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              apiReady ? "bg-emerald-500 shadow-emerald-500/50 shadow-sm" : "bg-rose-500 shadow-rose-500/50 shadow-sm"
            }`}
          />
          <span className="text-xs text-gray-400 font-mono">
            {apiReady ? "Model Ready" : "API Offline"}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-6 bg-[#11131a] p-5 rounded-xl border border-gray-800">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-400 block mb-2">
              Source Media
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-indigo-400 hover:file:bg-gray-700 cursor-pointer w-full"
            />
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Confidence Threshold</span>
                <span className="font-mono text-indigo-400">{conf}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={conf}
                onChange={(e) => setConf(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>NMS IoU Threshold</span>
                <span className="font-mono text-indigo-400">{iou}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={iou}
                onChange={(e) => setIou(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleRunInference}
              disabled={!file || !apiReady || loading}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-sm text-white transition-colors"
            >
              {loading ? "Processing..." : "Run Inspection"}
            </button>
            <button
              onClick={handleClear}
              className="w-full py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 font-medium transition-colors"
            >
              Clear Workspace
            </button>
          </div>
        </aside>

        <section className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#11131a] rounded-xl border border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Selected Input
              </h3>
              <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-gray-800/60">
                {previewUrl ? (
                  <img src={previewUrl} alt="Source Preview" className="max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-600 font-mono">No input frame loaded</span>
                )}
              </div>
            </div>

            <div className="bg-[#11131a] rounded-xl border border-gray-800 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Detection Output
                </h3>
                {result?.inference_time_ms && (
                  <span className="text-xs font-mono text-emerald-400">
                    {result.inference_time_ms} ms
                  </span>
                )}
              </div>
              <div className="aspect-video bg-black/40 rounded-lg flex items-center justify-center overflow-hidden border border-gray-800/60">
                {result?.annotated_image ? (
                  <img src={result.annotated_image} alt="Inference Output" className="max-h-full object-contain" />
                ) : (
                  <span className="text-xs text-gray-600 font-mono">
                    {loading ? "Analyzing frame..." : "Pending detection"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {result && (
            <div className="bg-[#11131a] rounded-xl border border-gray-800 p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-white">Detection Telemetry</h3>
                <button
                  onClick={exportCSV}
                  className="text-xs px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors font-mono"
                >
                  Export CSV
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
                  <span className="text-xs text-gray-500 block">Total Detections</span>
                  <span className="text-xl font-bold font-mono text-white">
                    {result.total_objects}
                  </span>
                </div>
                {Object.entries(result.class_counts || {}).map(([cls, cnt]) => (
                  <div key={cls} className="bg-gray-900/60 border border-gray-800 p-3 rounded-lg">
                    <span className="text-xs text-gray-500 block capitalize">{cls}</span>
                    <span className="text-xl font-bold font-mono text-indigo-400">{cnt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
