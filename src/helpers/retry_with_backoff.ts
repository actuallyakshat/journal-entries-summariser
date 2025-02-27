async function retryWithBackoff(
  fn: Function,
  maxRetries: number = 5
): Promise<string> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      const delay = Math.pow(2, retries) * 2000; // Backing off exponentially
      console.log(`Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      retries++;
    }
  }
}

export default retryWithBackoff;
