type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';


const jobsArray: any[] = [
  { id: 1, status: 'queued' },
  { id: 2, status: 'processing' },
  { id: 3, status: 'processing' },
  { id: 4, status: 'failed' },
  { id: 5, status: 'queued' },
  { id: 6, status: 'completed' },
];

// Define the desired order
const statusOrder: Record<JobStatus, number> = {
  processing: 1,
  queued: 2,
  completed: 3,
  failed: 4,
};

// Sort based on the defined order
const sortedJobs = jobsArray.sort(
  (a, b) => statusOrder[a.status as JobStatus] - statusOrder[b.status as JobStatus]
);

console.log(sortedJobs);
