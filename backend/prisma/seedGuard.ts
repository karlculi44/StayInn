export const assertDevelopmentSeedEnvironment = (
  nodeEnv: string | undefined,
): void => {
  if (nodeEnv !== "development") {
    throw new Error(
      "Seed script can only run when NODE_ENV is explicitly set to development.",
    );
  }
};
