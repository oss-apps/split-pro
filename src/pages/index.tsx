import Head from 'next/head';
import Link from 'next/link';
import { Button } from '~/components/ui/button';
import {
  ArrowRight,
  Banknote,
  Bell,
  FileUp,
  GitFork,
  Github,
  Globe,
  Import,
  Split,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { BackgroundGradient } from '~/components/ui/background-gradient';
import { env } from '~/env';

export default function Home() {
  return (
    <>
      <Head>
        <title>SplitPro: Teile Ausgaben mit deinen Freunden, kostenlos!</title>
        <meta name="description" content="SplitPro: Teile Ausgaben mit deinen Freunden, kostenlos!" />
        <link rel="icon" href="/favicon.ico" />
        {process.env.NODE_ENV === 'production' && (
          <>
            <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://queue.simpleanalyticscdn.com/noscript.gif"
                alt=""
                referrerPolicy="no-referrer-when-downgrade"
              />
            </noscript>
          </>
        )}
      </Head>
      <main className="min-h-screen">
        <nav className="sticky mx-auto flex max-w-5xl items-center justify-between px-4   py-4 lg:px-0 lg:py-5">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-medium">SplitPro</p>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/blog/need-for-splitwise-alternative">Warum SplitPro?</Link>
            <Link href="/terms">Geschäftsbedingungen</Link>
            <Link href="/privacy">Privatsphäre</Link>
          </div>
        </nav>
        <div className="mx-auto mt-20 flex w-full items-start justify-center  gap-16 px-4 lg:max-w-5xl lg:px-0 ">
          <div>
            <div className=" mb-32 text-center lg:mb-0 lg:h-[70vh] lg:text-left">
              <h1 className="max-w-3xl text-center text-2xl font-semibold leading-loose text-gray-100 lg:text-left lg:text-5xl lg:leading-[4rem]">
              Teile Ausgaben mit deinen Freunden{' '}
                <span className="font-bold text-primary">kostenlos!</span>
              </h1>
              <h2 className="mt-5  text-gray-300  lg:mt-8 lg:text-lg">
                Eine{' '}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/SebastianHanz/split-pro"
                  target="_blank"
                >
                  open source
                </a>{' '}
                Alternative zu SplitWise
              </h2>
              <div className="mt-10 flex flex-col gap-6 lg:flex-row">
                <Link href="/auth/signin" className="mx-auto lg:mx-0">
                  <Button className="flex w-[200px] items-center gap-2 rounded-full">
                    Ausgabe hinzufügen <ArrowRight size={15} />{' '}
                  </Button>
                </Link>
                <Link
                  href="https://github.com/SebastianHanz/split-pro"
                  target="_blank"
                  className="mx-auto lg:mx-0"
                >
                  <Button
                    variant="outline"
                    className="flex w-[200px] items-center gap-2 rounded-full"
                  >
                    <Github size={15} /> Quellcode auf GitHub</Button>
                </Link>
              </div>
              <div className=" mt-40"></div>
            </div>
            <div className="mb-20 mt-8 flex justify-center lg:hidden">
              <MobileScreenShot />
            </div>
            <div className=" flex flex-col gap-20 text-center lg:text-left">
              <p className="text-2xl">Funktionsumfang</p>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Users className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Gruppen und Freunde</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Erstelle Gruppen und tragt eure Ausgaben ein. Alle Kosten werden danach automatisch nach euren Kriterien auf die Gruppe aufgeteilt.
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Banknote className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Viele Währungen</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Musst du eine Ausgabe in einer anderen Währung für denselben Nutzer hinzufügen? Kein Problem!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Split className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Ungleiche Aufteilung</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Erweiterte Optionen zur Aufteilung. Nach Anteilen, Prozentsatz oder exakten Beträgen.
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Globe className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">PWA-Unterstützung</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Liebst du mobile Apps? Wir haben an dich gedacht. Installiere die Anwendung als PWA und du wirst den Unterschied kaum bemerken!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <FileUp className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Belege hochladen</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Lade Belege zusammen mit der Ausgabe hoch.
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <GitFork className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Open source</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Der Quellcode der App ist öffentlich und für jeden einsehbar. Du kannst die App aber auch selbst hosten.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Import className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Import aus Splitwise</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Keine manuelle Übertragung von Salden nötig. Du kannst Nutzer und Gruppen aus Splitwise importieren.
                  </p>
                </div>
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Bell className="h-6 w-6 text-primary" />
                    <p className="text-lg font-medium">Push-Benachrichtigungen</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                  Verpasse nichts! Erhalte eine Push-Nachricht wenn jemand eine Ausgabe hinzufügt oder eine Abrechnung durchführt hat.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-20 mt-24 flex flex-col gap-8 text-center lg:text-left">
              <div>
                Built by{' '}
                <a className=" text-primary" href="https://github.com/SebastianHanz/" target="_blank">
                  Sebastian Hanz
                </a>   
              </div>
              <div className="flex justify-center gap-4 lg:justify-start">
                <a
                  className="text-primary"
                  href="https://github.com/SebastianHanz/split-pro"
                  target="_blank"
                >
                  Github
                </a>
              </div>
            </div>
          </div>
          <div className="sticky top-40 hidden shrink-0 lg:flex">
            <MobileScreenShot />
          </div>
        </div>
      </main>
    </>
  );
}

const MobileScreenShot = () => {
  return (
    <BackgroundGradient>
      <Image
        src="/hero.webp"
        className=" rounded-[22px] border bg-background"
        width={300}
        height={550}
        alt="hero"
      />
    </BackgroundGradient>
  );
};
