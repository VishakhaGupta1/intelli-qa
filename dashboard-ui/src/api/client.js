import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({
	baseURL,
	timeout: 10000,
	headers: {
		'Content-Type': 'application/json'
	}
});

client.interceptors.request.use(config => {
	const token = typeof window !== 'undefined' ? window.localStorage.getItem('qa_platform_jwt') : null;
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

client.interceptors.response.use(
	response => response,
	error => {
		const message = error?.response?.data?.error || error.message || 'Request failed';
		return Promise.reject({ message, error: message, status: error?.response?.status || 0 });
	}
);

export default client;
