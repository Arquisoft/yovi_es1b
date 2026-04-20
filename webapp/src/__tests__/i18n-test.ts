const realLocalStorage = globalThis.localStorage

// Mock temporal solo para la inicialización de i18n
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => {
            if (key === 'yovi_user_language') return 'es'
            return realLocalStorage.getItem(key)
        },
        setItem: (key: string, value: string) => realLocalStorage.setItem(key, value),
        removeItem: (key: string) => realLocalStorage.removeItem(key),
        clear: () => realLocalStorage.clear(),
    },
    writable: true,
})

await import('../i18n')

// Restaurar el localStorage real después de que i18n ya se inicializó
Object.defineProperty(globalThis, 'localStorage', {
    value: realLocalStorage,
    writable: true,
})