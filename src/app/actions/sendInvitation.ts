import prisma from '@/lib/prismadb';
import { Role, InvitationStatus } from '@prisma/client';
import nodemailer from 'nodemailer';

export async function sendInvitation(
  email: string,
  workspaceId: string,
  invitedById: string,
  role: Role
) {
  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 24); // Berlaku 24 jam

  // Buat undangan di database
  const invitation = await prisma.invitation.create({
    data: {
      email,
      workspaceId,
      invitedById, // Wajib karena ada di skema
      role,
      expiredAt,
    },
  });

  const inviteLink = `${process.env.APP_URL}/invite/${invitation.id}`;

  // Pastikan kredensial email tersedia
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Missing email credentials in environment variables');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Workspace Invitation',
    html: `
      <p>You have been invited to a workspace. Click <a href="${inviteLink}">here</a> to accept.</p>
      <p>This invitation will expire in 24 hours.</p>
    `,
  });

  return invitation;
}
