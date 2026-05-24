/**
 * Splitwise API Import Page
 *
 * Imports complete expense history from Splitwise using their API.
 * Provides 100% accurate import with full expense details.
 */

import { CheckCircle, Key, Loader2, XCircle } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import MainLayout from '~/components/Layout/MainLayout';
import { Button } from '~/components/ui/button';
import { Checkbox } from '~/components/ui/checkbox';
import { Input } from '~/components/ui/input';
import { Separator } from '~/components/ui/separator';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

interface GroupImportState {
  status: ImportStatus;
  imported?: number;
  skipped?: number;
  total?: number;
  error?: string;
}

const ImportSplitwiseApiPage: NextPageWithUser = () => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [userName, setUserName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<Record<number, boolean>>({});
  const [importStatus, setImportStatus] = useState<Record<number, GroupImportState>>({});

  // Validate API key mutation
  const validateMutation = api.splitwiseApiImport.validateKey.useMutation();

  // Get groups query (enabled only after validation)
  const groupsQuery = api.splitwiseApiImport.getGroups.useQuery(
    { apiKey },
    { enabled: isValidated && apiKey.length > 0 },
  );

  // Import group mutation
  const importMutation = api.splitwiseApiImport.importGroup.useMutation();

  const handleValidateKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Splitwise API key');
      return;
    }

    setIsValidating(true);
    try {
      const result = await validateMutation.mutateAsync({ apiKey });
      if (result.valid && result.user) {
        setIsValidated(true);
        setUserName(
          `${result.user.first_name}${result.user.last_name ? ` ${result.user.last_name}` : ''}`,
        );
        toast.success(`Connected as ${result.user.first_name}`);
      } else {
        toast.error(result.error || 'Invalid API key');
      }
    } catch (error) {
      toast.error('Failed to validate API key');
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportSelected = async () => {
    const selectedGroupIds = Object.entries(selectedGroups)
      .filter(([, selected]) => selected)
      .map(([id]) => Number(id));

    if (selectedGroupIds.length === 0) {
      toast.error('Please select at least one group to import');
      return;
    }

    const groups = groupsQuery.data || [];

    // Import groups sequentially
    for (const groupId of selectedGroupIds) {
      const group = groups.find((g) => g.id === groupId);
      if (!group) {
        continue;
      }

      setImportStatus((prev) => ({
        ...prev,
        [groupId]: { status: 'importing' },
      }));

      try {
        const result = await importMutation.mutateAsync({
          apiKey,
          groupId,
          groupName: group.name,
        });

        setImportStatus((prev) => ({
          ...prev,
          [groupId]: {
            status: 'success',
            imported: result.imported,
            skipped: result.skipped,
            total: result.total,
          },
        }));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setImportStatus((prev) => ({
          ...prev,
          [groupId]: { status: 'error', error: message },
        }));
      }
    }

    toast.success('Import completed!');
  };

  const handleSelectAll = () => {
    const groups = groupsQuery.data || [];
    const allSelected = groups.every((g) => selectedGroups[g.id]);

    if (allSelected) {
      setSelectedGroups({});
    } else {
      const newSelected: Record<number, boolean> = {};
      groups.forEach((g) => {
        newSelected[g.id] = true;
      });
      setSelectedGroups(newSelected);
    }
  };

  const isImporting = Object.values(importStatus).some((s) => s.status === 'importing');
  const hasSelection = Object.values(selectedGroups).some(Boolean);

  return (
    <>
      <Head>
        <title>Import from Splitwise (API)</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout hideAppBar>
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link href="/balances">
              <Button variant="ghost" className="text-primary px-0 py-0" size="sm">
                Cancel
              </Button>
            </Link>
          </div>
          <div className="font-medium">Import from Splitwise</div>
          <div className="w-[50px]" />
        </div>

        {/* API Key Section */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-300">Step 1: Connect to Splitwise</h3>
          <p className="mt-1 text-xs text-gray-500">
            Enter your Splitwise API key to fetch your groups and expenses.
          </p>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                type="password"
                placeholder="Splitwise API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isValidated}
                className="pl-10"
              />
            </div>
            {!isValidated ? (
              <Button onClick={handleValidateKey} disabled={isValidating || !apiKey.trim()}>
                {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect'}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setIsValidated(false);
                  setApiKey('');
                  setSelectedGroups({});
                  setImportStatus({});
                }}
              >
                Disconnect
              </Button>
            )}
          </div>

          {isValidated && <p className="mt-2 text-sm text-green-500">Connected as {userName}</p>}

          <p className="mt-3 text-xs text-gray-500">
            Get your API key from{' '}
            <a
              href="https://secure.splitwise.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              secure.splitwise.com/apps
            </a>
          </p>
        </div>

        {/* Groups Section */}
        {isValidated && (
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-300">Step 2: Select Groups to Import</h3>
              {groupsQuery.data && groupsQuery.data.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {groupsQuery.data.every((g) => selectedGroups[g.id])
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Choose which groups to import. All expenses will be imported with complete accuracy.
            </p>

            {groupsQuery.isLoading && (
              <div className="mt-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              </div>
            )}

            {groupsQuery.error && (
              <div className="mt-4 rounded-lg bg-red-900/20 p-4 text-red-400">
                Failed to load groups: {groupsQuery.error.message}
              </div>
            )}

            {groupsQuery.data && (
              <div className="mt-4 flex flex-col gap-3">
                {groupsQuery.data.map((group, index) => {
                  const status = importStatus[group.id];
                  return (
                    <div key={group.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={selectedGroups[group.id] || false}
                            onCheckedChange={(checked) => {
                              setSelectedGroups({
                                ...selectedGroups,
                                [group.id]: Boolean(checked),
                              });
                            }}
                            disabled={
                              status?.status === 'importing' || status?.status === 'success'
                            }
                          />
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-xs text-gray-500">{group.memberCount} members</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {status?.status === 'importing' && (
                            <div className="flex items-center gap-2 text-yellow-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Importing...</span>
                            </div>
                          )}
                          {status?.status === 'success' && (
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm">
                                {status.imported} imported, {status.skipped} skipped
                              </span>
                            </div>
                          )}
                          {status?.status === 'error' && (
                            <div className="flex items-center gap-2 text-red-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">{status.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {index !== groupsQuery.data.length - 1 && <Separator className="mt-3" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Import Button */}
            {groupsQuery.data && groupsQuery.data.length > 0 && (
              <div className="mt-8">
                <Button
                  onClick={handleImportSelected}
                  disabled={isImporting || !hasSelection}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    `Import ${Object.values(selectedGroups).filter(Boolean).length} Group(s)`
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 rounded-lg bg-gray-900/50 p-4">
          <h4 className="font-medium">How this works</h4>
          <ul className="mt-2 space-y-1 text-sm text-gray-400">
            <li>- Fetches complete expense data directly from Splitwise API</li>
            <li>- Imports exact payment splits (who paid, who owes what)</li>
            <li>- Creates accounts for group members using their Splitwise email</li>
            <li>- Skips duplicate expenses (safe to re-run)</li>
            <li>- Preserves original expense dates and categories</li>
          </ul>
        </div>

        {/* Note about friends */}
        <div className="mt-4 rounded-lg border border-blue-800/50 bg-blue-900/20 p-4">
          <h4 className="font-medium text-blue-300">About group members</h4>
          <p className="mt-1 text-sm text-blue-200/70">
            When you import a group, accounts are created for all members using their Splitwise
            email. When your friends sign up to SplitPro using the <strong>same email</strong> they
            use in Splitwise, they&apos;ll automatically see the imported expenses and groups.
          </p>
        </div>
      </MainLayout>
    </>
  );
};

ImportSplitwiseApiPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ImportSplitwiseApiPage;
