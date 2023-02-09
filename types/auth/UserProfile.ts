import FormField from '../FormField';

import Announcement from './Announcement';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  streak: number;
  createdAt: string;
  photoUrl?: string;
  requiredFields: FormField[];
  announcement: Announcement;
  lastSyncAt?: Date;
}

export default UserProfile;
