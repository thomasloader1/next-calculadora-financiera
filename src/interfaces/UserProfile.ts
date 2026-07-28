export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  birthDate: string | null;   // "YYYY-MM-DD" or null
  createdAt: string;          // ISO timestamp
}
