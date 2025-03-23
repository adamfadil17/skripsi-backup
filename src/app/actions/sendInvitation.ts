import transporter from '@/lib/nodemailer';
import prisma from '@/lib/prismadb';
import type { Role } from '@prisma/client';

export async function sendInvitation(
  email: string,
  workspaceId: string,
  invitedById: string,
  role: Role
) {
  const expiredAt = new Date();
  expiredAt.setHours(expiredAt.getHours() + 24);

  const invitation = await prisma.invitation.create({
    data: {
      email,
      workspaceId,
      invitedById,
      role,
      expiredAt,
    },
  });

  const inviteLink = `${process.env.APP_URL}/invite/${invitation.id}`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Missing email credentials in environment variables');
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  const workspaceName = workspace?.name;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `You're Invited to Join "${workspaceName}" on Catatan Cerdas!`,
    html: `
  <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; border: 1px solid #ccc; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #0c0a09; padding: 20px;">
      <div style="display: inline-block;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 5px;">
              <div style="background-color: white; width: 10px; height: 10px; border-radius: 2px;"></div>
            </td>
            <td style="padding: 5px;">
              <div style="background-color: white; width: 10px; height: 10px; border-radius: 2px;"></div>
            </td>
            <td style="padding: 5px;">
              <div style="background-color: white; width: 10px; height: 10px; border-radius: 2px;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 5px;">
              <div style="background-color: white; width: 10px; height: 10px; border-radius: 2px;"></div>
            </td>
            <td style="padding: 5px;">
              <div style="background-color: white; width: 10px; height: 10px; border-radius: 2px;"></div>
            </td>
            <td></td>
          </tr>
        </table>
      </div>
    </div>
    
    <div style="padding: 40px 20px; background-color: white;">
      <h1 style="color: #0c0a09; font-size: 28px; margin-bottom: 20px;">You're Invited to Join "${workspaceName}" on Catatan Cerdas! 🎉</h1>
      
      <h2 style="color: #333; font-size: 18px; margin-bottom: 20px;">Catatan Cerdas is a smart and collaborative platform that helps teams work together seamlessly.</h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
        You have been invited to join the workspace "${workspaceName}". Click the button below to accept the invitation and start collaborating!
      </p>
      
      <div style="margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #0c0a09; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Accept Invitation & Join Now</a>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This invitation is valid for 24 hours. Don't miss out!
      </p>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 20px; text-align: center; color: #666; font-size: 12px;">
      <p>© ${new Date().getFullYear()} Catatan Cerdas. All Rights Reserved</p>
      <p>If you did not request this invitation, you can ignore and delete this email.</p>
    </div>
  </div>
`,
  });

  return invitation;
}
