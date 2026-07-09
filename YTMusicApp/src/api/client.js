import axios from "axios";

// Dev: CRA proxies /api to the Express server (see "proxy" in package.json).
// Prod: the server serves the build, so same-origin /api just works.
const client = axios.create({ baseURL: "/api" });

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
