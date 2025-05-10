// lib/createUser.ts
import bcrypt from 'bcrypt';
import prisma from '@/lib/prismadb';
import { User } from '@prisma/client';

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export async function createUser(
  userData: CreateUserInput
): Promise<User | null> {
  try {
    const { name, email, password } = userData;

    if (!name || !email || !password) {
      throw {
        error_type: 'BadRequest',
        message: 'Missing required information',
      };
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw {
        error_type: 'Conflict',
        message: 'Email already in use',
      };
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
    });

    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}
