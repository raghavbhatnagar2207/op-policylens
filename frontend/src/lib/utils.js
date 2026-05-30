import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const API_BASE = 'http://localhost:5000';

export async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  return res.json();
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getRiskColor(level) {
  switch (level) {
    case 'High': return 'text-red-500';
    case 'Medium': return 'text-amber-500';
    case 'Low': return 'text-emerald-500';
    default: return 'text-surface-500';
  }
}

export function getRiskBg(level) {
  switch (level) {
    case 'High': return 'bg-red-500';
    case 'Medium': return 'bg-amber-500';
    case 'Low': return 'bg-emerald-500';
    default: return 'bg-surface-500';
  }
}
