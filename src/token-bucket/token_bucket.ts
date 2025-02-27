export class TokenBucket {
  private tokens: number; //available tokens
  private lastRefill: number; //last time tokens were refilled
  private readonly maxTokens: number; //max tokens allowed
  private readonly refillRate: number; //tokens per ms

  constructor(maxTokens: number, refillRate: number) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
  }

  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = timePassed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }

  take(count: number): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  getWaitTime(count: number): number {
    this.refill();
    if (this.tokens >= count) return 0;
    return (count - this.tokens) / this.refillRate;
  }
}
