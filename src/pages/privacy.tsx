import { type NextPage } from 'next';
import Link from 'next/link';
import { env } from '~/env';

const Privacy: NextPage<{ feedbackEmail: string }> = ({ feedbackEmail }) => {
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
          <h1 className="mt-20 text-2xl font-semibold">Datenschutzerklärung</h1>
          <p className="text-sm text-gray-400">Letzte Aktualisierung: 06. März 2022</p>

          <p className="mt-4 text-lg text-gray-400">
            SplitPro verpflichtet sich, Ihre Privatsphäre zu schützen. Diese Datenschutzerklärung beschreibt, wie wir
            Ihre Informationen sammeln, verwenden und weitergeben, wenn Sie SplitPro nutzen.
          </p>

          <p className="mt-16 text-xl font-semibold">Informationen, die wir sammeln</p>
          <p className="mt-4 text-lg text-gray-300">Persönliche Informationen</p>
          <p className="mt-0.5 text-lg text-gray-400">
            Wenn Sie ein Konto erstellen, sammeln wir Ihre E-Mail-Adresse, Ihren Namen und Ihr Foto (falls Sie sich
            über Google anmelden).
          </p>
          <p className="mt-4 text-lg text-gray-300">Nutzungsdaten</p>
          <p className="mt-0.5 text-lg text-gray-400">
            Wir sammeln automatisch Informationen darüber, wie Sie den Dienst nutzen, z. B. besuchte Seiten und genutzte Funktionen.
          </p>

          <p className="mt-16 text-xl font-semibold">Wie wir Ihre Informationen verwenden</p>
          <p className="mt-1 text-lg text-gray-400">
            Wir verwenden Ihre Informationen zu folgenden Zwecken:
            <ul className="list-inside list-disc">
              <li>Bereitstellung und Wartung des Dienstes</li>
              <li>Verbesserung und Personalisierung Ihrer Erfahrung mit dem Dienst</li>
              <li>Kommunikation mit Ihnen über Aktualisierungen, Angebote und Kundensupport</li>
              <li>Anzeigen Ihres Namens und Fotos für Personen, die Ihre E-Mail-Adresse haben</li>
            </ul>
          </p>
          <p className="mt-16 text-xl font-semibold">Weitergabe Ihrer Informationen</p>
          <p className="mt-1 text-lg text-gray-400">
            Wir verkaufen, vermieten oder teilen Ihre persönlichen Informationen nicht mit Dritten.
          </p>
          <p className="mt-16 text-xl font-semibold">4. Datensicherheit</p>
          <p className="mt-1 text-lg text-gray-400">
            Wir ergreifen angemessene Maßnahmen, um Ihre Informationen vor unbefugtem Zugriff, Nutzung oder
            Offenlegung zu schützen. Allerdings ist keine Methode der Übertragung oder Speicherung völlig sicher, und wir
            können die absolute Sicherheit Ihrer Informationen nicht garantieren.
          </p>

          <p className="mt-16 text-xl font-semibold">5. Datenspeicherung</p>
          <p className="mt-1 text-lg text-gray-400">
            Wir speichern Ihre persönlichen Informationen so lange, wie es erforderlich ist, um den Dienst bereitzustellen,
            gesetzliche Verpflichtungen zu erfüllen, Streitigkeiten beizulegen und unsere Vereinbarungen durchzusetzen.
          </p>

          <p className="mt-16 text-xl font-semibold">6. Ihre Rechte</p>
          <p className="mt-1 text-lg text-gray-400">
            Sie können auf Ihre persönlichen Informationen zugreifen, sie aktualisieren oder deren Löschung beantragen, indem
            Sie uns unter{' '}
            <a className="underline" href={'mailto:' + feedbackEmail}>
              {feedbackEmail ?? ''}
            </a>
            kontaktieren.
          </p>

          <p className="mt-16 text-xl font-semibold">7. Datenschutz von Kindern</p>
          <p className="mt-1 text-lg text-gray-400">
            Der Dienst ist nicht für Nutzer unter 13 Jahren vorgesehen. Wir sammeln wissentlich keine persönlichen
            Informationen von Kindern unter 13 Jahren. Wenn Sie ein Elternteil oder Erziehungsberechtigter sind und glauben,
            dass Ihr Kind uns persönliche Informationen bereitgestellt hat, kontaktieren Sie uns bitte unter{' '}
            <a className="underline" href={'mailto:' + feedbackEmail}>
              {feedbackEmail ?? ''}
            </a>
            .
          </p>
          <p className="mt-16 text-xl font-semibold">8. Änderungen an dieser Richtlinie</p>
          <p className="mt-1 text-lg text-gray-400">
            Wir können diese Richtlinie von Zeit zu Zeit aktualisieren. Wir werden Sie über Änderungen informieren, indem
            wir die aktualisierte Richtlinie auf dieser Seite veröffentlichen. Durch die weitere Nutzung des Dienstes erklären
            Sie sich mit der aktualisierten Richtlinie einverstanden.
          </p>
          <p className="mt-16 text-xl font-semibold">9. Kontakt</p>
          <p className="mt-1 text-lg text-gray-400">
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

export default Privacy;

export async function getServerSideProps() {
  return {
    props: {
      feedbackEmail: env.FEEDBACK_EMAIL ?? '',
    },
  };
}
