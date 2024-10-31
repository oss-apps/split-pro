import { type NextPage } from 'next';
import Link from 'next/link';
import { env } from '~/env';

const Terms: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
  return (
    <>
      <div>
        <main className="mx-auto max-w-4xl px-4 pb-32 lg:px-0">
          <nav className="sticky mx-auto flex max-w-5xl items-center justify-between px-4   py-4 lg:px-0 lg:py-5">
            <Link href="/">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-medium">SplitPro</p>
              </div>
            </Link>
          </nav>
          <h1 className="mt-20 text-2xl font-semibold">Terms of service</h1>
          <p className="text-sm text-gray-400">Last Updated: 06 Mar, 2022</p>

          <p className="mt-12 text-xl font-semibold">1. Agreement</p>
          <p className="mt-1 text-lg text-gray-300">
            By using Splitpro, you agree to these Terms of Service. Splitpro reserves the right to
            modify these Terms at any time. By continuing to use the Service, you agree to the
            updated Terms.
          </p>

          <p className="mt-12 text-xl font-semibold">2. Eligibility</p>
          <p className="mt-1 text-lg text-gray-300">
            You must be at least 13 years old to use the Service. By using the Service, you
            represent that you meet this age requirement.
          </p>

          <p className="mt-12 text-xl font-semibold">3. Acceptable Use</p>
          <p className="mt-1 text-lg text-gray-300">
            You agree not to use the Service for any illegal or harmful activities. We reserve the
            right to terminate your access to the Service if you violate this provision.
          </p>

          <p className="mt-12 text-xl font-semibold">4. Termination</p>
          <p className="mt-1 text-lg text-gray-300">
            We reserve the right to suspend or terminate your access to the Service at any time,
            with or without notice, for any reason.
          </p>

          <p className="mt-12 text-xl font-semibold">5. Disclaimers and Limitation of Liability</p>
          <p className="mt-1 text-lg text-gray-300">
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without
            warranties of any kind. We disclaim all liability for any damages or losses arising from
            your use of the Service.
          </p>

          <p className="mt-12 text-xl font-semibold">6. Governing Law</p>
          <p className="mt-1 text-lg text-gray-300">
            These Terms shall be governed by the laws of US. Any disputes arising from these Terms
            shall be resolved in the courts located in US.
          </p>

          <p className="mt-12 text-xl font-semibold">7. Privacy</p>
          <p className="mt-1 text-lg text-gray-300">
            Please read our <Link href="/privacy">Privacy Policy</Link>
          </p>

          <p className="mt-12 text-xl font-semibold">8. Contact</p>
          <p className="mt-1 text-lg text-gray-300">
            If you have any questions or concerns regarding these Terms, please contact us at{' '}
            <a className="underline" href={'mailto:' + feedbackEmail}>
              {feedbackEmail ?? ''}
            </a>
            .
          </p>
        </main>
      </div>
    </>
  );
};

export default Terms;

export async function getServerSideProps() {
  return {
    props: {
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
    },
  };
}
