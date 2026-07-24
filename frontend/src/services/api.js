import axios from 'axios';

const api = axios.create({
    baseURL:
        import.meta.env.VITE_API_URL ||
        'http://localhost:3010/api',

    headers: {
        'Content-Type': 'application/json'
    },

    timeout: 15000
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(
            'tablero_incidentes_token'
        );

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,

    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(
                'tablero_incidentes_token'
            );

            localStorage.removeItem(
                'tablero_incidentes_usuario'
            );
        }

        return Promise.reject(error);
    }
);

export default api;