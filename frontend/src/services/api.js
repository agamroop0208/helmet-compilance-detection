import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://helmet-compilance-detection.onrender.com/api",
});

export const checkHealth = async () => {
  const res = await apiClient.get("/health");
  return res.data;
};

export const analyzeImage = async (file, conf, iou) => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiClient.post(`/predict/image?conf=${conf}&iou=${iou}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};
