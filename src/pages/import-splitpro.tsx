import { PaperClipIcon } from '@heroicons/react/24/solid';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'next-i18next';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { LoadingSpinner } from '~/components/ui/spinner';
import { ImportLogWindow } from '~/components/Import/ImportLogWindow';
import { useImportStream } from '~/hooks/useImportStream';
import { type NextPageWithUser } from '~/types';
import { withI18nStaticProps } from '~/utils/i18n/server';

const ImportSplitProPage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null);
  const [parseError, setParseError] = useState(false);
  const [mode, setMode] = useState<'merge' | 'restore'>('merge');
  const router = useRouter();

  const { logs, isStreaming, startStream } = useImportStream();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadedFile(file);
    setParseError(false);
    setParsedData(null);

    try {
      const json = JSON.parse(await file.text()) as Record<string, unknown>;

      const expenses = json.expenses as Record<string, unknown>[] | undefined;
      const looksLikeSplitwise =
        json.friends &&
        !json.version &&
        Array.isArray(expenses) &&
        expenses.length > 0 &&
        'repayments' in expenses[0]!;
      if (looksLikeSplitwise) {
        toast.error(t('errors.wrong_file_splitwise_on_splitpro'));
        return;
      }

      if (!json.version || !json.expenses || !json.users) {
        setParseError(true);
        return;
      }
      setParsedData(json);
    } catch {
      setParseError(true);
      toast.error(t('errors.import_splitpro_failed'));
    }
  };

  const onImport = async () => {
    if (!parsedData || !uploadedFile || isStreaming) {
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('mode', mode);

    const outcome = await startStream('/api/import-splitpro-stream', formData);

    if (outcome.ok) {
      toast.success(
        t('account.import_splitpro_data_details.messages.import_success', {
          expenses: outcome.result.expensesImported,
          groups: outcome.result.groupsImported,
        }),
      );
    } else {
      toast.error(t('errors.import_splitpro_failed'));
    }
  };

  return (
    <>
      <Head>
        <title>{t('account.import_splitpro_data')}</title>
      </Head>
      <MainLayout hideAppBar>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/balances">
              <Button variant="ghost" className="text-primary px-0 py-0" size="sm">
                {t('actions.cancel')}
              </Button>
            </Link>
          </div>
          <div className="font-medium">{t('account.import_splitpro_data')}</div>
          <div className="flex gap-4">
            <Button
              onClick={() => void onImport()}
              variant="ghost"
              className="text-primary px-0 py-0"
              size="sm"
              disabled={isStreaming || !parsedData}
            >
              {t('actions.import')}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${mode === 'merge' ? 'border-primary bg-primary/5' : 'border-gray-700'}`}
            onClick={() => setMode('merge')}
          >
            <input
              type="radio"
              name="mode"
              value="merge"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
              className="mt-1"
            />
            <div>
              <div className="font-medium">
                {t('account.import_splitpro_data_details.mode_merge')}
              </div>
              <div className="mt-1 text-sm text-gray-400">
                {t('account.import_splitpro_data_details.mode_merge_description')}
              </div>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${mode === 'restore' ? 'border-red-500 bg-red-500/5' : 'border-gray-700'}`}
            onClick={() => setMode('restore')}
          >
            <input
              type="radio"
              name="mode"
              value="restore"
              checked={mode === 'restore'}
              onChange={() => setMode('restore')}
              className="mt-1"
            />
            <div>
              <div className="font-medium">
                {t('account.import_splitpro_data_details.mode_restore')}
              </div>
              <div className="mt-1 text-sm text-gray-400">
                {t('account.import_splitpro_data_details.mode_restore_description')}
              </div>
              {mode === 'restore' && (
                <div className="mt-2 text-sm font-medium text-red-400">
                  {t('account.import_splitpro_data_details.mode_restore_warning')}
                </div>
              )}
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <label htmlFor="splitpro-json" className="w-full cursor-pointer rounded border">
            <div className="flex cursor-pointer px-3 py-[6px]">
              <div className="flex items-center border-r pr-4">
                <PaperClipIcon className="mr-2 h-4 w-4" />
                <span className="hidden text-sm md:block">
                  {t('account.import_from_splitwise_details.choose_file')}
                </span>
              </div>
              <div className="pl-4 text-gray-400">
                {uploadedFile
                  ? uploadedFile.name
                  : t('account.import_from_splitwise_details.no_file_chosen')}
              </div>
            </div>
            <Input
              onChange={handleFileChange}
              id="splitpro-json"
              type="file"
              accept=".json"
              className="hidden"
            />
          </label>
          <Button
            onClick={() => void onImport()}
            disabled={!parsedData || isStreaming}
            className="w-[100px]"
            size="sm"
            variant={mode === 'restore' ? 'destructive' : 'default'}
          >
            {isStreaming ? <LoadingSpinner /> : t('actions.import')}
          </Button>
        </div>

        {parseError && (
          <div className="mt-4 text-sm text-red-500">{t('errors.import_splitpro_failed')}</div>
        )}

        {parsedData && !isStreaming && 0 === logs.length && (
          <div className="mt-6 flex flex-col gap-2 text-sm text-gray-400">
            <div>{t('account.import_splitpro_data_details.note')}</div>
            <div className="mt-2 rounded border border-gray-700 p-3 text-gray-300">
              <div>
                {t('actors.friends')}: {(parsedData.users as unknown[]).length}
              </div>
              <div>
                {t('actors.groups')}: {(parsedData.groups as unknown[]).length}
              </div>
              <div>
                {(parsedData.expenses as unknown[]).length}{' '}
                {t('account.import_splitpro_data_details.expenses')}
              </div>
            </div>
          </div>
        )}

        <ImportLogWindow entries={logs} isStreaming={isStreaming} />
      </MainLayout>
    </>
  );
};

ImportSplitProPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ImportSplitProPage;
