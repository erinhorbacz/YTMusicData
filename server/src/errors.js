export class ApiError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Express error middleware — every failure becomes {error: {code, message}}.
export function errorMiddleware(err, req, res, next) {
    if (res.headersSent) return next(err);
    if (err instanceof ApiError) {
        return res.status(err.status).json({
            error: { code: err.code, message: err.message },
        });
    }
    // Multer upload errors are client errors, not server faults.
    if (err?.name === "MulterError") {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                error: { code: "FILE_TOO_LARGE", message: "File exceeds the 200 MB limit." },
            });
        }
        return res.status(400).json({
            error: { code: err.code ?? "UPLOAD_ERROR", message: err.message },
        });
    }
    // express.json() body-parse failures (malformed JSON from the client).
    if (err?.type === "entity.parse.failed" || (err instanceof SyntaxError && err.status === 400)) {
        return res.status(400).json({
            error: { code: "BAD_JSON", message: "Request body is not valid JSON." },
        });
    }
    console.error(err);
    return res.status(500).json({
        error: { code: "INTERNAL", message: "Unexpected server error." },
    });
}
