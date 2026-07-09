/**
 * @fileoverview API d'upload de fichiers (file-service via le gateway).
 */
import { apiClient } from './client';
import type { ApiResponse } from '../types';

/** Fichier tel que renvoyé par le file-service après upload. */
export interface UploadedFile {
  originalName: string;
  filename: string;
  mimetype: string;
  type: string;
  size: number;
  /** Chemin public relatif (ex. `/uploads/temp/xyz.png`). */
  path: string;
}

/** Origine des fichiers servis publiquement (= gateway sans le suffixe `/api`). */
const FILES_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
).replace(/\/api\/?$/, '');

/** Construit l'URL absolue d'un fichier uploadé à partir de son chemin. */
export function fileUrl(path: string): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${FILES_ORIGIN}${path}`;
}

export const filesApi = {
  /**
   * Téléverse un fichier et renvoie ses métadonnées.
   */
  upload: async (file: File): Promise<ApiResponse<UploadedFile[]>> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<UploadedFile[]>>(
      '/files/upload',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
