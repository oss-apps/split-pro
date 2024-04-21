import { type User } from 'next-auth';
import { Resend } from 'resend';
import { env } from '~/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendSignUpEmail(email: string, token: string, url: string) {
  const { host } = new URL(url);

  if (env.NODE_ENV === 'development') {
    console.log('Sending sign in email', email, url, token);
    return;
  }

  const subject = 'Sign in to SplitPro';
  const text = `Hey,\n\nYou can sign in to SplitPro by clicking the below URL:\n${url}\n\nYou can also use this OTP: ${token}\n\nThanks,\nKoushik KM\nSplitPro`;
  const html = `<p>Hey,</p> <p>You can sign in to SplitPro by clicking the below URL:</p><p><a href="${url}">Sign in to ${host}</a></p><p>You can also use this OTP: <b>${token}</b></p<br /><br /><p>Thanks,</p><p>Koushik KM<br/>SplitPro</p>`;

  await sendMail(email, subject, text, html);
}

export async function sendInviteEmail(email: string, name: string) {
  const { host } = new URL(env.NEXTAUTH_URL);

  if (env.NODE_ENV === 'development') {
    console.log('Sending invite email', email, name);
    return;
  }

  const subject = 'Invitation to SplitPro';
  const text = `Hey,\n\nYou have been invited to SplitPro by ${name}. It's a completely open source free alternative to splitwise. You can sign in to SplitPro by clicking the below URL:\n${env.NEXTAUTH_URL}\n\nThanks,\nKoushik KM\nSplitPro`;
  const html = `<p>Hey,</p> <p>You have been invited to SplitPro by ${name}. It's a completely open source free alternative to splitwise. You can sign in to SplitPro by clicking the below URL:</p><p><a href="${env.NEXTAUTH_URL}">Sign in to ${host}</a></p><br><p>Thanks,<br/>Koushik KM<br/>SplitPro</p>`;

  await sendMail(email, subject, text, html);
}

export async function sendFeedbackEmail(feedback: string, user: User) {
  console.log('Received feedback from: ', user.email, 'Feedback: ', feedback);

  if (!env.FEEDBACK_EMAIL) return;

  const subject = `Feedback received on SplitPro from ${user.name}`;
  const text = `Feedback created by ${user.name} :\n\nFeedback: ${feedback}\n\nemail: ${user.email}`;

  await sendMail(env.FEEDBACK_EMAIL, subject, text, text);
}

async function sendMail(email: string, subject: string, text: string, html: string) {
  try {
    if (env.UNSEND_API_KEY && env.UNSEND_URL) {
      const resp = await fetch(`${env.UNSEND_URL}/emails`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.UNSEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'hello@auth.splitpro.app',
          to: email,
          subject,
          text,
          html,
        }),
      });

      if (resp.status === 200) {
        console.log('Email sent using unsend');
        return;
      } else {
        console.log(
          'Error sending email using unsend, so fallback to resend',
          resp.status,
          resp.statusText,
        );
      }
    }
  } catch (error) {
    console.log('Error sending email using unsend, so fallback to resend', error);
  }

  const response = await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject,
    text,
    html,
  });

  console.log('Email sent', response);
}
