import { Queue } from "bullmq";

export const backgroundJobs = new Queue("jobs", {
  connection: { host: process.env.REDIS_HOST },
});
