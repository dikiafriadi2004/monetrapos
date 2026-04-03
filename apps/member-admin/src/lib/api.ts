// Backward compatibility layer
// This file exports the apiClient as 'api' for existing code
import apiClient from './api-client';

export const api = apiClient;
export default apiClient;
