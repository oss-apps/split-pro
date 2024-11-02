import { type NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { env } from '~/env';

const Terms: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
  return (
    <>
      <div>
        <main className="mx-auto max-w-4xl px-4 pb-32 lg:px-0">
          <nav className="sticky mx-auto flex max-w-5xl items-center justify-between px-4 py-4 lg:px-0 lg:py-5">
            <Link href="/">
              <div className="flex items-center gap-2">
                <p className="text-2xl font-medium">SplitPro</p>
              </div>
            </Link>
          </nav>
          <h1 className="mt-20 text-2xl font-semibold">Nutzungsbedingungen</h1>
          <p className="text-sm text-gray-400">Letzte Aktualisierung: 06. März 2022</p>

          <p className="mt-12 text-xl font-semibold">1. Zustimmung</p>
          <p className="mt-1 text-lg text-gray-300">
            Durch die Nutzung von SplitPro stimmen Sie diesen Nutzungsbedingungen zu. SplitPro
            behält sich das Recht vor, diese Bedingungen jederzeit zu ändern. Durch die
            fortgesetzte Nutzung des Dienstes stimmen Sie den aktualisierten Bedingungen zu.
          </p>

          <p className="mt-12 text-xl font-semibold">2. Berechtigung</p>
          <p className="mt-1 text-lg text-gray-300">
            Sie müssen mindestens 13 Jahre alt sein, um den Dienst nutzen zu dürfen. Durch die Nutzung des Dienstes
            versichern Sie, dass Sie diese Altersanforderung erfüllen.
          </p>

          <p className="mt-12 text-xl font-semibold">3. Zulässige Nutzung</p>
          <p className="mt-1 text-lg text-gray-300">
            Sie verpflichten sich, den Dienst nicht für illegale oder schädliche Aktivitäten zu verwenden. Wir behalten
            uns das Recht vor, Ihren Zugang zum Dienst zu beenden, wenn Sie gegen diese Bestimmung verstoßen.
          </p>

          <p className="mt-12 text-xl font-semibold">4. Kündigung</p>
          <p className="mt-1 text-lg text-gray-300">
            Wir behalten uns das Recht vor, Ihren Zugang zum Dienst jederzeit, mit oder ohne Vorankündigung, aus
            beliebigem Grund auszusetzen oder zu beenden.
          </p>

          <p className="mt-12 text-xl font-semibold">5. Haftungsausschluss und Haftungsbeschränkung</p>
          <p className="mt-1 text-lg text-gray-300">
            Der Dienst wird „wie besehen“ und „wie verfügbar“ bereitgestellt, ohne jegliche Garantien. Wir lehnen
            jegliche Haftung für Schäden oder Verluste ab, die aus Ihrer Nutzung des Dienstes entstehen.
          </p>

          <p className="mt-12 text-xl font-semibold">6. Anwendbares Recht</p>
          <p className="mt-1 text-lg text-gray-300">
            Diese Bedingungen unterliegen den Gesetzen der USA. Alle Streitigkeiten im Zusammenhang mit diesen
            Bedingungen werden vor den Gerichten der USA entschieden.
          </p>

          <p className="mt-12 text-xl font-semibold">7. Datenschutz</p>
          <p className="mt-1 text-lg text-gray-300">
            Bitte lesen Sie unsere <Link href="/privacy">Datenschutzerklärung</Link>.
          </p>

          <p className="mt-12 text-xl font-semibold">8. Kontakt</p>
          <p className="mt-1 text-lg text-gray-300">
            Wenn Sie Fragen oder Bedenken zu diesen Bedingungen haben, kontaktieren Sie uns bitte unter{' '}
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
