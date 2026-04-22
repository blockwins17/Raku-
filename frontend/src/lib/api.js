import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
    headers: { "Content-Type": "application/json" },
});

export const endpoints = {
    me: () => api.get("/me").then((r) => r.data),
    patchMe: (body) => api.patch("/me", body).then((r) => r.data),
    today: () => api.get("/today").then((r) => r.data),
    calendar: (start, end) =>
        api.get("/calendar", { params: { start, end } }).then((r) => r.data),
    tasks: () => api.get("/tasks").then((r) => r.data),
    createTask: (body) => api.post("/tasks", body).then((r) => r.data),
    updateTask: (id, body) => api.patch(`/tasks/${id}`, body).then((r) => r.data),
    deleteTask: (id) => api.delete(`/tasks/${id}`).then((r) => r.data),
    integrations: () => api.get("/integrations").then((r) => r.data),
    syncIntegration: (id) =>
        api.post(`/integrations/${id}/sync`).then((r) => r.data),
    disconnectIntegration: (id) =>
        api.post(`/integrations/${id}/disconnect`).then((r) => r.data),
    chat: (text, conversation_id) =>
        api
            .post("/chat", { text, conversation_id })
            .then((r) => r.data),
    getChat: (id) => api.get(`/chat/${id}`).then((r) => r.data),
    importAssignments: (assignments, source = "brightspace") =>
        api
            .post("/assignments/import", { assignments, source })
            .then((r) => r.data),
};
