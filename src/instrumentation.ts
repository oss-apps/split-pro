/**
 * Add things here to be executed during server startup.
 *
 * more details here: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if ('nodejs' === process.env.NEXT_RUNTIME) {
    console.log('Registering instrumentation');
    const { validateAuthEnv } = await import('./server/auth');
    const { initializeJobScheduler } = await import('./server/job-scheduler');
    
    validateAuthEnv();
    
    // Initialize job scheduler
    try {
      await initializeJobScheduler();
    } catch (error) {
      console.error('Failed to initialize job scheduler during startup:', error);
    }
  }
}
