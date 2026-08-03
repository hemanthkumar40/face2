import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { generateEmbedding, verifyFace } from '../utils/ai';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_987654321_face_recognition';

// Input Schemas
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  images: z.array(z.string()).min(5, 'At least 5 images are required').max(10, 'At most 10 images are allowed'),
});

const loginSchema = z.object({
  image: z.string().min(1, 'Image is required'),
});

/**
 * Registers a new user.
 * Expects name, email, and 5-10 base64 images.
 */
export async function register(req: Request, res: Response) {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { name, email, images } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Call AI Service sequentially for each image to generate embeddings
    const embeddings: number[][] = [];
    for (let i = 0; i < images.length; i++) {
      try {
        const emb = await generateEmbedding(images[i]);
        embeddings.push(emb);
      } catch (err: any) {
        return res.status(400).json({
          message: `Registration failed at Capture #${i + 1}: ${err.message}. Please try again with clear lighting.`,
        });
      }
    }

    // Check if the face is already registered under another account
    const allEmbeddings = await prisma.faceEmbedding.findMany({
      select: {
        userId: true,
        embedding: true,
      },
    });

    if (allEmbeddings.length > 0) {
      const candidates = allEmbeddings.map((item) => ({
        id: item.userId,
        embedding: JSON.parse(item.embedding) as number[],
      }));

      // Verify the first generated embedding against existing candidates
      const threshold = 0.72;
      const verification = await verifyFace(embeddings[0], candidates, threshold);

      if (verification.match) {
        return res.status(400).json({
          message: 'Registration failed: This face is already registered under another account.',
        });
      }
    }

    // Write user and embeddings in a database transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email },
      });

      await tx.faceEmbedding.createMany({
        data: embeddings.map((emb) => ({
          userId: user.id,
          embedding: JSON.stringify(emb),
        })),
      });

      return user;
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error: any) {
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Internal server error during registration' });
  }
}

/**
 * Logs in a user using 1:N face verification.
 * Expects a base64 live image.
 */
export async function login(req: Request, res: Response) {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { image } = validationResult.data;

    // 1. Generate embedding for the live capture
    let liveEmbedding: number[];
    try {
      liveEmbedding = await generateEmbedding(image);
    } catch (err: any) {
      return res.status(400).json({ message: `Face generation error: ${err.message}` });
    }

    // 2. Fetch all stored embeddings from MySQL
    const allEmbeddings = await prisma.faceEmbedding.findMany({
      select: {
        userId: true,
        embedding: true,
      },
    });

    if (allEmbeddings.length === 0) {
      return res.status(401).json({ message: 'Face not recognized. No registered users found.' });
    }

    // 3. Prepare candidates list
    const candidates = allEmbeddings.map((item) => ({
      id: item.userId,
      embedding: JSON.parse(item.embedding) as number[],
    }));

    // 4. Verify face against candidates (using standard cosine similarity threshold: 0.70)
    // FaceNet embeddings are high-dimensional, 0.70 or 0.75 represents high confidence of identity match.
    const threshold = 0.72;
    const verification = await verifyFace(liveEmbedding, candidates, threshold);

    if (!verification.match || !verification.matchedId) {
      return res.status(401).json({ message: 'Face not recognized' });
    }

    // 5. Fetch matching user info
    const user = await prisma.user.findUnique({
      where: { id: verification.matchedId },
    });

    if (!user) {
      return res.status(401).json({ message: 'User matching this face no longer exists' });
    }

    // 6. Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      JWT_SECRET,
      { expiresIn: '2h' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error during login' });
  }
}

/**
 * Returns the authenticated user's profile info.
 */
export async function profile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({ user });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * Simple logout endpoint.
 */
export async function logout(req: Request, res: Response) {
  return res.status(200).json({ message: 'Logged out successfully' });
}
