import axios from "axios";

// Dev: CRA proxies /api to the Express server (see "proxy" in package.json).
// Same-host production: the server serves the build, so /api just works.
// Split deployment (GitHub Pages frontend + hosted API): REACT_APP_API_URL
// is baked in at build time and CORS on the server allows the Pages origin.
const API_BASE = process.env.REACT_APP_API_URL || "";

const client = axios.create({ baseURL: `${API_BASE}/api` });

// Each browser gets a random dataset id, generated once — the server scopes
// uploaded datasets to it (your upload never replaces the site default).
export function getDatasetId() {
    let id = localStorage.getItem("ytm.datasetId");
    if (!id) {
        id =
            typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem("ytm.datasetId", id);
    }
    return id;
}

// Site-owner token (optional): lets an upload replace the site default and
// unlocks enrichment controls on the deployed API.
export function getAdminToken() {
    return localStorage.getItem("ytm.adminToken") || "";
}

export function setAdminToken(token) {
    if (token) localStorage.setItem("ytm.adminToken", token);
    else localStorage.removeItem("ytm.adminToken");
}

client.interceptors.request.use((config) => {
    config.headers["X-Dataset-Id"] = getDatasetId();
    return config;
});

// Normalize every failure to {code, message, status, isNetwork}.
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (axios.isCancel(error)) return Promise.reject(error);
        const apiError = error.response?.data?.error;
        return Promise.reject({
            code: apiError?.code ?? (error.response ? "UNKNOWN" : "NETWORK"),
            message: apiError?.message ?? error.message,
            status: error.response?.status ?? null,
            isNetwork: !error.response,
        });
    },
);

export default client;
