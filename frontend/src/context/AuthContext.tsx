import React, { createContext, useContext, useState } from 'react';
const C = createContext<any>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const login = (u: any) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)); localStorage.setItem('role', u.role); };
  const logout = () => { setUser(null); localStorage.removeItem('user'); };
  return <C.Provider value={{ user, login, logout }}>{children}</C.Provider>;
}
export const useAuth = () => useContext(C);
