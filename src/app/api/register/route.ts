import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/app/actions/createUser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: 'Missing required information',
        },
        { status: 400 }
      );
    }

    const user = await createUser({ name, email, password });

    return NextResponse.json(
      {
        status: 'success',
        code: 201,
        message: 'User created successfully',
        data: { user },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in registration route:', error);

    if (error.error_type === 'BadRequest') {
      return NextResponse.json(
        {
          status: 'error',
          code: 400,
          error_type: 'BadRequest',
          message: error.message || 'Missing required information',
        },
        { status: 400 }
      );
    } else if (error.error_type === 'Conflict') {
      return NextResponse.json(
        {
          status: 'error',
          code: 409,
          error_type: 'Conflict',
          message: error.message || 'Email already in use',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        status: 'error',
        code: 500,
        error_type: 'InternalServerError',
        message: 'An unexpected error occurred. Please try again later.',
      },
      { status: 500 }
    );
  }
}
