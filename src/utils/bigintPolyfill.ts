// @ts-expect-error we are extending BigInt prototype for JSON serialization
// oxlint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function toJSON() {
  // Custom JSON serialization for BigInt to avoid errors in Jest
  return this.toString();
};
