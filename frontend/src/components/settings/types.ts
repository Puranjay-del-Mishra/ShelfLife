export type UserSettings = {
  notify_local_time: string;     // "HH:MM" or "HH:MM:SS"
  timezone: string;              // IANA TZ
  notify_days_before: number[];  // e.g. [3,1,0]
  push_enabled: boolean;
};
