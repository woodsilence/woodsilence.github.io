const Storage = {
    get(key, defaultValue) {
        try {
            const val = localStorage.getItem(key);
            return val !== null ? JSON.parse(val) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // localStorage full or disabled, silently ignore
        }
    }
};
