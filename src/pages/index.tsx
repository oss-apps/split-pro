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
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

import { BackgroundGradient } from '~/components/ui/background-gradient';
import { Button } from '~/components/ui/button';

export default function Home() {
  return (
    <>
      <Head>
        <title>SplitPro: Split Expenses with your friends for free</title>
        <meta name="description" content="SplitPro: Split Expenses with your friends for free" />
        <link rel="icon" href="/favicon.ico" />
        {'production' === process.env.NODE_ENV && (
          <>
            <script async defer src="https://scripts.simpleanalyticscdn.com/latest.js" />
            <noscript>
              <Image
                src="https://queue.simpleanalyticscdn.com/noscript.gif"
                alt=""
                referrerPolicy="no-referrer-when-downgrade"
              />
            </noscript>
          </>
        )}
      </Head>
      <main className="min-h-screen">
        <nav className="sticky mx-auto flex max-w-5xl items-center justify-between px-4 py-4 lg:px-0 lg:py-5">
          <div className="flex items-center gap-2">
            <p className="text-2xl font-medium">SplitPro</p>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </nav>
        <div className="mx-auto mt-20 flex w-full items-start justify-center gap-16 px-4 lg:max-w-5xl lg:px-0">
          <div>
            <div className="mb-32 text-center lg:mb-0 lg:h-[70vh] lg:text-left">
              <h1 className="max-w-3xl text-center text-2xl leading-loose font-semibold text-gray-100 lg:text-left lg:text-5xl lg:leading-16">
                Split Expenses with your friends for{' '}
                <span className="text-primary font-bold">free</span>.
              </h1>
              <h2 className="mt-5 text-gray-300 lg:mt-8 lg:text-lg">
                An{' '}
                <a
                  className="text-primary hover:underline"
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  rel="noreferrer"
                >
                  open source
                </a>{' '}
                alternative to SplitWise
              </h2>
              <div className="mt-10 flex flex-col gap-6 lg:flex-row">
                <Link href="/auth/signin" className="mx-auto lg:mx-0">
                  <Button className="flex w-[200px] items-center gap-2 rounded-full">
                    Add Expense <ArrowRight size={15} />{' '}
                  </Button>
                </Link>
                <Link
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  className="mx-auto lg:mx-0"
                >
                  <Button
                    variant="outline"
                    className="flex w-[200px] items-center gap-2 rounded-full"
                  >
                    <Github size={15} /> Star us on github
                  </Button>
                </Link>
              </div>
              <div className="mt-40" />
            </div>
            <div className="mt-8 mb-20 flex justify-center lg:hidden">
              <MobileScreenShot />
            </div>
            <div className="flex flex-col gap-20 text-center lg:text-left">
              <p className="text-2xl">Features</p>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Users className="text-primary size-6" />
                    <p className="text-lg font-medium">Groups and Friends</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Can create multiple groups or add balance directly. Everything will be
                    consolidated
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Banknote className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Multiple currencies</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Need to add expense with different currency for same user? No problem!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Split className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Unequal Split</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Advanced split options. By shares, percentage or exact amounts.
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Globe className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">PWA support</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Love mobile apps? We got you covered. Install it as a PWA and you won&apos;t
                    even notice!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <FileUp className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Upload Receipts</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Upload receipts along with the expense
                  </p>
                </div>

                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <GitFork className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Open source</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Which makes it hard to become evil. Easy to self host
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-20 lg:flex-row lg:gap-8">
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Import className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Import from splitwise</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Don&apos;t have to manually migrate balances. You can import users and groups
                    from splitwise
                  </p>
                </div>
                <div className="flex flex-col gap-1 lg:w-1/2">
                  <div className="flex flex-row justify-center gap-1 lg:flex-col">
                    <Bell className="text-primary h-6 w-6" />
                    <p className="text-lg font-medium">Push notification</p>
                  </div>
                  <p className="px-4 text-gray-400 lg:px-0">
                    Never miss important notifications. Get notified when someone adds an expense or
                    settles up
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-24 mb-20 flex flex-col gap-8 text-center lg:text-left">
              <a
                href="https://www.producthunt.com/posts/splitpro?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-splitpro"
                target="_blank"
                rel="noreferrer"
              >
                <Image
                  src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=444717&theme=light"
                  alt="Splitpro - Free&#0032;drop&#0032;in&#0032;replacement&#0032;&#0032;to&#0032;Splitwise&#0058;&#0032;Fully&#0032;Open&#0032;source | Product Hunt"
                  className="mx-auto h-[47px] w-[200px] lg:mx-0"
                  width="200"
                  height="47"
                />
              </a>
              <div>
                Built by{' '}
                <a
                  className="text-primary"
                  href="https://koushik.dev"
                  target="_blank"
                  rel="noreferrer"
                >
                  KM Koushik
                </a>
                {/* <p className="text-gray-400">
                  A product of <a className="underline underline-offset-2">ossapps.dev</a>
                </p> */}
              </div>
              <div className="flex justify-center gap-4 lg:justify-start">
                <a
                  className="text-primary"
                  href="https://twitter.com/KM_Koushik_"
                  target="_blank"
                  rel="noreferrer"
                >
                  Twitter
                </a>
                <a
                  className="text-primary"
                  href="https://github.com/oss-apps/split-pro"
                  target="_blank"
                  rel="noreferrer"
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
        className="bg-background rounded-[22px] border"
        width={300}
        height={550}
        alt="hero"
      />
    </BackgroundGradient>
  );
};
