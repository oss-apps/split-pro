## Job Scheduler Integration

This project now includes job scheduling capabilities using [pg-boss](https://github.com/timgit/pg-boss), a PostgreSQL-based job queue system.

### Features

- **Recurring Jobs**: Schedule tasks to run on a cron-like schedule
- **One-time Jobs**: Schedule tasks to run once at a specific time
- **Built-in Handlers**: Pre-configured handlers for common tasks
- **Type Safety**: Full TypeScript support with typed job payloads
- **Error Handling**: Automatic retry mechanisms with configurable limits

### Job Types

#### 1. Currency Conversion Jobs
Automatically fetch and update currency exchange rates.

```typescript
// Schedule a one-time currency update
await CurrencyConversionService.updateCurrencyRates('USD', 'EUR');

// Schedule daily currency updates at 2 AM UTC
await CurrencyConversionService.scheduleRecurringCurrencyUpdates(
  'USD', 
  'EUR', 
  CronHelpers.daily(2)
);
```

#### 2. Recurring Expense Jobs
Create recurring expenses on a schedule (useful for rent, subscriptions, etc.).

```typescript
// Schedule a monthly recurring expense
await RecurringExpenseService.scheduleRecurringExpense(
  {
    expenseId: 123,
    groupId: 456,
    amount: 100000n, // $1000.00 in cents
    currency: 'USD',
    name: 'Monthly Rent'
  },
  CronHelpers.monthly(1, 9) // 1st of every month at 9 AM
);
```

#### 3. Custom Jobs
You can extend the system with custom job types by adding handlers in `job-scheduler.ts`.

### API Usage

The job scheduler is exposed through tRPC endpoints:

```typescript
// From a React component using tRPC
const scheduleJobMutation = api.job.scheduleTestJob.useMutation();

const handleScheduleJob = async () => {
  const result = await scheduleJobMutation.mutateAsync({
    message: 'Hello World!',
    delayMinutes: 5
  });
  
  if (result.success) {
    console.log('Job scheduled:', result.jobId);
  }
};
```

### Cron Expression Helpers

Use the `CronHelpers` class for common scheduling patterns:

```typescript
import { CronHelpers } from '~/server/api/services/jobService';

// Predefined patterns
CronHelpers.HOURLY    // '0 * * * *'
CronHelpers.DAILY     // '0 0 * * *'
CronHelpers.WEEKLY    // '0 0 * * 0'
CronHelpers.MONTHLY   // '0 0 1 * *'

// Custom patterns
CronHelpers.daily(9, 30)        // Daily at 9:30 AM
CronHelpers.weekly(1, 8)        // Every Monday at 8 AM
CronHelpers.monthly(15, 12, 30) // 15th of every month at 12:30 PM
```

### Environment Configuration

Add to your `.env` file:

```bash
# Job scheduler settings
JOB_SCHEDULER_ENABLED=true
```

### Database Setup

pg-boss creates its own tables in a separate schema (`pgboss`) in your existing PostgreSQL database. No additional setup is required.

### Development

For testing, you can use the test job endpoint:

```typescript
// Schedule a test job to run in 1 minute
api.job.scheduleTestJob.mutate({
  message: 'Test job from UI',
  delayMinutes: 1
});
```

### Monitoring

Jobs are logged to the console. In production, you may want to integrate with your logging system for better monitoring.

### Extending the System

To add new job types:

1. Add the job type to the `JobType` union in `job-scheduler.ts`
2. Create a payload interface extending `JobPayload`
3. Add a job handler in `setupJobHandlers()`
4. Optionally create a service class in `jobService.ts`
5. Add tRPC endpoints in `job.ts` router

Example:

```typescript
// 1. Add job type
type JobType = 'currency-conversion' | 'recurring-expense' | 'my-custom-job';

// 2. Create payload interface
interface MyCustomJobPayload extends JobPayload {
  customField: string;
}

// 3. Add handler
boss.work('my-custom-job', async (job: Job<MyCustomJobPayload>) => {
  console.log('Processing custom job:', job.data);
  // Your job logic here
});
```

### Deployment Considerations

#### Docker

The job scheduler is automatically initialized when the application starts. For Docker deployments:

1. Ensure your database connection string includes access to the PostgreSQL database
2. The `pgboss` schema will be created automatically in your existing database
3. Set `JOB_SCHEDULER_ENABLED=true` in your environment variables

#### Production Monitoring

Consider implementing:

- Health checks for the job scheduler
- Metrics for job success/failure rates
- Alerting for failed jobs
- Log aggregation for job outputs

#### Performance Tuning

For high-volume deployments, you may want to adjust:

```typescript
const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: 'pgboss',
  max: 10, // Increase connection pool size
  retryLimit: 3, // Adjust retry behavior
  retryDelay: 10000, // Increase retry delay
  monitorStateIntervalSeconds: 30, // Adjust monitoring frequency
});
```

### Troubleshooting

#### Common Issues

1. **Job scheduler not starting**: Check database connectivity and permissions
2. **Jobs not executing**: Verify job handlers are properly registered
3. **Performance issues**: Consider adjusting connection pool size and retry settings

#### Logs

Job scheduler activities are logged to the console. Look for:
- "Job scheduler initialized successfully" - startup confirmation
- "Scheduled job [type] with ID: [id]" - successful job scheduling
- Job handler logs during execution