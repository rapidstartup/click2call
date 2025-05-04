export interface CallData {
  id: string;
  caller?: {
    id: string;
    name: string;
  };
  startTime: Date | string;
  endTime?: Date | string;
  // Add any other properties needed for calls
} 