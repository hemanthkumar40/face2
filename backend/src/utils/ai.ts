import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export interface VerifyFaceCandidate {
  id: string;
  embedding: number[];
}

export interface VerifyFaceResponse {
  match: boolean;
  matchedId: string | null;
  score: number;
}

/**
 * Sends a base64 encoded face image to the AI service to generate its embedding vector.
 */
export async function generateEmbedding(base64Image: string): Promise<number[]> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/generate-embedding`, {
      image: base64Image,
    });
    return response.data.embedding;
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('AI Service is currently unavailable');
  }
}

/**
 * Sends a live embedding and candidate face embeddings to the AI service for similarity comparison.
 */
export async function verifyFace(
  liveEmbedding: number[],
  candidates: VerifyFaceCandidate[],
  threshold = 0.70
): Promise<VerifyFaceResponse> {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/verify-face`, {
      live_embedding: liveEmbedding,
      candidates,
      threshold,
    });
    return {
      match: response.data.match,
      matchedId: response.data.matched_id,
      score: response.data.score,
    };
  } catch (error: any) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('AI Service is currently unavailable');
  }
}
