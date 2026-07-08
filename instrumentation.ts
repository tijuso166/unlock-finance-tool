export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startRecurringScheduler } = await import('./lib/recurringScheduler')
    startRecurringScheduler()
  }
}
