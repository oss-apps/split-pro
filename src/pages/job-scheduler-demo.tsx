import { type NextPageWithUser } from '~/types';
import { JobSchedulerExample } from '~/components/JobScheduler/JobSchedulerExample';

/**
 * Demo page for the job scheduler functionality
 * This page shows how to use the job scheduler in the SplitPro application
 * 
 * To access this page in development:
 * http://localhost:3000/job-scheduler-demo
 */
const JobSchedulerDemoPage: NextPageWithUser = ({ user }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Job Scheduler Demo
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome, {user.name}! This page demonstrates the job scheduling capabilities in SplitPro.
          </p>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">About Job Scheduling</h2>
          <p className="text-blue-700">
            The job scheduler allows you to automate recurring tasks like:
          </p>
          <ul className="mt-2 text-blue-700 list-disc list-inside">
            <li>Creating recurring expenses (rent, utilities, subscriptions)</li>
            <li>Updating currency exchange rates</li>
            <li>Sending notifications and reminders</li>
            <li>Running maintenance tasks</li>
          </ul>
        </div>
        
        <JobSchedulerExample />
        
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">Development Note</h2>
          <p className="text-yellow-700">
            This demo page is for development and testing purposes. In production, job scheduling 
            would typically be integrated into the existing expense and group management flows.
          </p>
        </div>
      </div>
    </div>
  );
};

JobSchedulerDemoPage.requireAuth = true;

export default JobSchedulerDemoPage;