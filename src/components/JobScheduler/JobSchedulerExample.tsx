import { useState } from 'react';
import { api } from '~/utils/api';

/**
 * Example component showing how to use the job scheduler in the UI
 * This demonstrates scheduling a test job and viewing common schedules
 */
export function JobSchedulerExample() {
  const [testMessage, setTestMessage] = useState('Hello from scheduled job!');
  const [delayMinutes, setDelayMinutes] = useState(1);

  // tRPC mutations and queries
  const scheduleTestJobMutation = api.job.scheduleTestJob.useMutation();
  const commonSchedulesQuery = api.job.getCommonSchedules.useQuery();
  const cronHelpersQuery = api.job.getCronHelpers.useQuery();

  const handleScheduleTestJob = async () => {
    try {
      const result = await scheduleTestJobMutation.mutateAsync({
        message: testMessage,
        delayMinutes,
      });

      if (result.success) {
        alert(`Job scheduled successfully! Job ID: ${result.jobId}`);
      } else {
        alert('Failed to schedule job: ' + result.message);
      }
    } catch (error) {
      alert('Error scheduling job: ' + (error as Error).message);
    }
  };

  const handleScheduleCurrencyUpdate = async () => {
    try {
      const result = await api.job.scheduleCurrencyUpdate.mutate({
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
      });

      if (result.success) {
        alert('Currency update scheduled successfully!');
      } else {
        alert('Failed to schedule currency update');
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Job Scheduler Demo</h1>
      
      {/* Test Job Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Schedule Test Job</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Message:</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter job message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Delay (minutes):</label>
            <input
              type="number"
              min="0"
              max="60"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            onClick={handleScheduleTestJob}
            disabled={scheduleTestJobMutation.isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {scheduleTestJobMutation.isLoading ? 'Scheduling...' : 'Schedule Test Job'}
          </button>
        </div>
      </div>

      {/* Currency Update Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Currency Updates</h2>
        <button
          onClick={handleScheduleCurrencyUpdate}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Schedule USD to EUR Update
        </button>
      </div>

      {/* Common Schedules Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Common Schedules</h2>
        {commonSchedulesQuery.data ? (
          <div className="space-y-4">
            {Object.entries(commonSchedulesQuery.data).map(([category, schedules]) => (
              <div key={category} className="border rounded p-3">
                <h3 className="font-medium capitalize mb-2">{category}</h3>
                <div className="grid gap-2">
                  {Object.entries(schedules).map(([name, { cron, description }]) => (
                    <div key={name} className="flex justify-between items-center text-sm">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cron}</span>
                      <span className="text-gray-600">{description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Loading schedules...</p>
        )}
      </div>

      {/* Cron Helpers Section */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Cron Expression Helpers</h2>
        {cronHelpersQuery.data ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Predefined Expressions</h3>
              <div className="grid gap-2">
                {Object.entries(cronHelpersQuery.data.predefined).map(([name, cron]) => (
                  <div key={name} className="flex justify-between items-center text-sm">
                    <span className="capitalize">{name}:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cron}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Examples</h3>
              <div className="grid gap-2">
                {Object.entries(cronHelpersQuery.data.examples).map(([name, cron]) => (
                  <div key={name} className="flex justify-between items-center text-sm">
                    <span>{name.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                    <span className="font-mono bg-gray-100 px-2 py-1 rounded">{cron}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-600">
              <p><strong>Format:</strong> {cronHelpersQuery.data.description.format}</p>
              <p><strong>Ranges:</strong></p>
              <ul className="ml-4 list-disc">
                {Object.entries(cronHelpersQuery.data.description.ranges).map(([field, range]) => (
                  <li key={field}>{field}: {range}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p>Loading cron helpers...</p>
        )}
      </div>
    </div>
  );
}

/**
 * Smaller component for integrating job scheduling into existing forms
 */
export function RecurringExpenseScheduler({ 
  onSchedule 
}: { 
  onSchedule: (cronExpression: string) => void 
}) {
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [customCron, setCustomCron] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const commonSchedulesQuery = api.job.getCommonSchedules.useQuery();

  const handleSchedule = () => {
    const expression = useCustom ? customCron : selectedSchedule;
    if (expression) {
      onSchedule(expression);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={!useCustom}
            onChange={() => setUseCustom(false)}
          />
          <span>Use common schedule</span>
        </label>
        
        {!useCustom && commonSchedulesQuery.data && (
          <select
            value={selectedSchedule}
            onChange={(e) => setSelectedSchedule(e.target.value)}
            className="w-full mt-2 p-2 border rounded"
          >
            <option value="">Select a schedule...</option>
            {Object.entries(commonSchedulesQuery.data).map(([category, schedules]) => (
              <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                {Object.entries(schedules).map(([name, { cron, description }]) => (
                  <option key={`${category}-${name}`} value={cron}>
                    {description}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="flex items-center space-x-2">
          <input
            type="radio"
            checked={useCustom}
            onChange={() => setUseCustom(true)}
          />
          <span>Use custom cron expression</span>
        </label>
        
        {useCustom && (
          <input
            type="text"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            placeholder="0 9 * * 1 (Every Monday at 9 AM)"
            className="w-full mt-2 p-2 border rounded font-mono"
          />
        )}
      </div>

      <button
        onClick={handleSchedule}
        disabled={(!useCustom && !selectedSchedule) || (useCustom && !customCron)}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        Schedule Recurring Expense
      </button>
    </div>
  );
}