from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from app.model import decode_base64_image, generate_embedding_from_image, calculate_cosine_similarity

app = FastAPI(title="Face Recognition AI Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class GenerateEmbeddingRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded face image")

class GenerateEmbeddingResponse(BaseModel):
    embedding: List[float]

class Candidate(BaseModel):
    id: str
    embedding: List[float]

class VerifyFaceRequest(BaseModel):
    live_embedding: List[float]
    candidates: List[Candidate]
    threshold: Optional[float] = Field(default=0.70, description="Cosine similarity threshold")

class VerifyFaceResponse(BaseModel):
    match: bool
    matched_id: Optional[str] = None
    score: float

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}

@app.post("/generate-embedding", response_model=GenerateEmbeddingResponse)
def generate_embedding(payload: GenerateEmbeddingRequest):
    try:
        # Decode image from base64
        pil_image = decode_base64_image(payload.image)
        # Generate face embedding
        embedding = generate_embedding_from_image(pil_image)
        return GenerateEmbeddingResponse(embedding=embedding)
    except ValueError as val_err:
        # Client input error (no face, multiple faces, bad quality)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(exc)}"
        )

@app.post("/verify-face", response_model=VerifyFaceResponse)
def verify_face(payload: VerifyFaceRequest):
    if not payload.candidates:
        return VerifyFaceResponse(match=False, score=0.0)

    best_score = -1.0
    best_candidate_id = None

    for candidate in payload.candidates:
        score = calculate_cosine_similarity(payload.live_embedding, candidate.embedding)
        if score > best_score:
            best_score = score
            best_candidate_id = candidate.id

    is_match = best_score >= payload.threshold

    return VerifyFaceResponse(
        match=is_match,
        matched_id=best_candidate_id if is_match else None,
        score=best_score
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
