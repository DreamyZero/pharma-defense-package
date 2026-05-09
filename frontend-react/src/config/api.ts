import axios from 'axios';
export const API_BASE = 'http://localhost:3000';
let token = '';
export const setToken = (value:string) => { token = value; };
export const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
