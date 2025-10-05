// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const apiConfig = {
    baseURL: API_BASE_URL,
    endpoints: {
        auth: {
            register: `${API_BASE_URL}/api/auth/register`,
            login: `${API_BASE_URL}/api/auth/login`,
            profile: `${API_BASE_URL}/api/auth/profile`,
            logout: `${API_BASE_URL}/api/auth/logout`,
        },
        github: {
            auth: `${API_BASE_URL}/api/github/auth`,
            callback: `${API_BASE_URL}/api/github/callback`,
            account: `${API_BASE_URL}/api/github/account`,
            disconnect: `${API_BASE_URL}/api/github/disconnect`,
            repositories: `${API_BASE_URL}/api/github/repositories`,
            scan: `${API_BASE_URL}/api/github/scan`,
        },
        scan: {
            code: `${API_BASE_URL}/api/scan`,
        }
    }
};

export default apiConfig;











