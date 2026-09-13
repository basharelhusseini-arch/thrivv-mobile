export function usePathname() { return window.location.pathname; }
export function useRouter() { return { push: (path: string) => window.location.assign(path) }; }
