const STORAGE = 'auth-storage';

type authStorage = {
  token: string | null;
  username: string | null;
  roles: string[]; 
};

// Storage selector: localStorage if remember=true, otherwise sessionStorage
const getStorage = (remember: boolean) => (remember ? localStorage : sessionStorage);

export const setLoginData = (token: string, username: string, roles: string[], remember: boolean) => {
  if (!token || !username || !roles) return; // ✅ only store if valid
  const storage = getStorage(remember);

  const authData: authStorage = {
    token,
    username,
    roles,
  };

  storage.setItem(STORAGE, JSON.stringify(authData));

};

// Getters automatically check both storages
export const getToken = (): string | null => {
  const authData = sessionStorage.getItem(STORAGE) || localStorage.getItem(STORAGE);
  if (!authData) return null;
  try {
    const parsed = JSON.parse(authData) as authStorage;
    return parsed.token;
  } catch {
    return null;
  }
};

export const getUsername = (): string | null => {
  const authData = sessionStorage.getItem(STORAGE) || localStorage.getItem(STORAGE);
  if (!authData) return null;
  try {
    const parsed = JSON.parse(authData) as authStorage;
    return parsed.username;
  } catch {
    return null;
  }
};

export const getRoles = (): string[] => {
  const authData = sessionStorage.getItem(STORAGE) || localStorage.getItem(STORAGE);
  if (!authData) return [];
  try {
    const parsed = JSON.parse(authData) as authStorage;
    return parsed.roles;
  } catch {
    return [];
  }
};

export const clearLoginData = () => {
  sessionStorage.removeItem(STORAGE);
  localStorage.removeItem(STORAGE);
};

export const isAuthenticated = () => !!getToken();
