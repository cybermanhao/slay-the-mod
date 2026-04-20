export class GaussianRandom {
  private mean: number;
  private stdDev: number;
  private spare: number | null;
  public constructor(mean = 0, stdDev = 1) {
    this.mean = mean;
    this.stdDev = stdDev;
    this.spare = null;
  }
  public random(): number {
    //正态分布
    if (this.spare !== null) {
      const val = this.spare;
      this.spare = null;
      return val * this.stdDev + this.mean;
    }
    let u: number, v: number, s: number;
    do {
      u = Math.random() * 2 - 1;
      v = Math.random() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    this.spare = v * mul;
    return u * mul * this.stdDev + this.mean;
  }
  public random0to1(): number {
    //0到1的正态分布
    const random = this.random();
    const logNormal = Math.exp(random);
    return logNormal / (logNormal + 1);
  }
}
