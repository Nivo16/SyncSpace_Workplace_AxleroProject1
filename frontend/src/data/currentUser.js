const USER_NAME_KEY = 'syncspace-user-name';

export const setCurrentUserName = (name) => {
  if (typeof window === 'undefined') return;
  const trimmed = String(name || '').trim();
  if (trimmed) {
    window.localStorage.setItem(USER_NAME_KEY, trimmed);
  }
};

export const getCurrentUserName = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(USER_NAME_KEY) || '';
};

export const displayNameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || '';
  if (!local) return '';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};
