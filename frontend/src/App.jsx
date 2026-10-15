import React, { useState, useEffect } from "react";
import { analyzeImage, checkHealth } from "./services/api";
import { Upload, Download, Eye } from "lucide-react";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [conf, setConf] = useState(0.45);
  const [iou, setIou] = useState(0.45);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    checkHealth()
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));
  }, []);

  useEffect(() => {
    if (file) runInference(file, conf, iou);
  }, [file, conf, iou]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setShowOriginal(false);
  };

  const runInference = async (imgFile, c, i) => {
    setLoading(true);
    try {
      const data = await analyzeImage(imgFile, c, i);
      setResult(data);
    } catch (err) {
      console.error("Inference error:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!result?.detections?.length) return;
    const headers = "ID,Class,Confidence,BBox_x1,BBox_y1,BBox_x2,BBox_y2\n";
    const rows = result.detections
      .map((d) => `${d.id},${d.class_name},${d.confidence},${d.bbox.join(",")}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "detections.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/80 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
          <span className="font-semibold text-sm tracking-tight">Helmet Detection</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className={`h-2 w-2 rounded-full ${backendOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
          <span>{backendOnline ? "Model Ready" : "API Offline"}</span>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-400">Status</span>
            <p className={`text-lg font-semibold mt-1 ${
              !result ? "text-zinc-500" : result.status === "VIOLATION" ? "text-rose-400" : "text-emerald-400"
            }`}>
              {result ? result.status : "Idle"}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-400">With Helmet</span>
            <p className="text-lg font-semibold text-zinc-100 mt-1">
              {result ? result.counts.helmet : 0}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-400">No Helmet</span>
            <p className="text-lg font-semibold text-zinc-100 mt-1">
              {result ? result.counts.no_helmet : 0}
            </p>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4">
            <span className="text-xs text-zinc-400">Inference Time</span>
            <p className="text-lg font-semibold text-zinc-100 mt-1">
              {result ? `${result.latency_ms} ms` : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Preview</span>
              <div className="flex items-center gap-2">
                {preview && (
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {showOriginal ? "Annotated" : "Original"}
                  </button>
                )}
                <label className="text-xs px-3 py-1.5 rounded-lg bg-white text-zinc-950 font-medium hover:bg-zinc-200 cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </div>

            <div className="relative h-[420px] flex items-center justify-center p-6 bg-zinc-950/50">
              {preview ? (
                <>
                  <img
                    src={showOriginal ? preview : result?.annotated_image || preview}
                    alt="Detection preview"
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center">
                      <span className="text-xs text-zinc-300 font-medium">Analyzing...</span>
                    </div>
                  )}
                </>
              ) : (
                <label className="flex flex-col items-center justify-center text-center cursor-pointer p-8">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-zinc-300">Select an image to analyze</span>
                  <span className="text-xs text-zinc-500 mt-1">JPG or PNG</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
            </div>

            <div className="px-5 py-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">Confidence</span>
                  <span className="text-zinc-200 font-medium">{conf.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.10" max="0.95" step="0.05"
                  value={conf}
                  onChange={(e) => setConf(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer h-1 bg-zinc-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-zinc-400">IoU Threshold</span>
                  <span className="text-zinc-200 font-medium">{iou.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.10" max="0.95" step="0.05"
                  value={iou}
                  onChange={(e) => setIou(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer h-1 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400">Detections</span>
              {result?.detections?.length > 0 && (
                <button
                  onClick={downloadCSV}
                  className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 max-h-[480px]">
              {result?.detections?.length > 0 ? (
                result.detections.map((d) => {
                  const isViolation = d.class_name.toLowerCase().includes("no") || d.class_name.toLowerCase().includes("without");
                  return (
                    <div key={d.id} className="px-5 py-3.5 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-zinc-200 capitalize">{d.class_name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Box: [{d.bbox.map((n) => Math.round(n)).join(", ")}]
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        isViolation
                          ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}>
                        {(d.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center p-8 text-center">
                  <span className="text-xs text-zinc-500">
                    {preview ? "No objects detected above threshold" : "Upload an image to view detections"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
