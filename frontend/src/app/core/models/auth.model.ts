export interface User {
  id: number;
  email: string;
  name: string;
  role: 'psicologo' | 'alumno';
  avatarUrl?: string;
  studentId?: number | null;
  studentCode?: string | null;
  program?: string | null;
  semester?: number | null;
  isActive: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface MeResponse {
  authenticated: boolean;
  user: User | null;
}



export interface NavOption {
  label: string;
  route: string;
}
