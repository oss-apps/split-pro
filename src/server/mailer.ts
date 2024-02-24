import { type User } from 'next-auth';
import { Resend } from 'resend';
import { env } from '~/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendSignUpEmail(email: string, token: string, url: string) {
  const { host } = new URL(url);
  console.log('Sending sign in email', email);

  const response = await resend.emails.send({
    from: env.FROM_EMAIL,
    to: email,
    subject: 'Sign in to SplitPro',
    text: `Hey,\n\nYou can sign in to SpliPro by clicking the below URL:\n${url}\n\nYou can also use this OTP: ${token}\n\nThanks,\nKoushik KM\nSplitPro`,
    html: `<p>Hey,</p> <p>You can sign in to SpliPro by clicking the below URL:</p><p><a href="${url}">Sign in to ${host}</a></p><p>You can also use this OTP: <b>${token}</b></p<br /><br /><p>Thanks,</p><p>Koushik KM<br/>SplitPro</p>`,
  });

  console.log('Email sent', response);
}

export async function sendFeedbackEmail(feedback: string, user: User) {
  console.log('Received feedback from: ', user.email, 'Feedback: ', feedback);

  if (!env.FEEDBACK_EMAIL) return;

  const response = await resend.emails.send({
    from: env.FROM_EMAIL,
    to: env.FEEDBACK_EMAIL,
    subject: `Feedback received on SplitPro from ${user.name}`,
    text: `Feedback created by ${user.name} :\n\nFeedback: ${feedback}\n\nemail: ${user.email}`,
  });

  console.log('Email sent', response);
}
