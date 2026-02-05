import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

// Define the shape of the context state
interface ThemeContextType {
    darkMode: boolean;
    toggleTheme: () => void;
}

// Create the context with default undefined value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider Component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    const getStorageKey = () => {
        try {
            const userDataStr = localStorage.getItem('user_data');
            if (userDataStr) {
                const user = JSON.parse(userDataStr);
                return `theme_${user.id}`;
            }
        } catch (e) {
            console.error('Error parsing user data for theme', e);
        }
        return 'theme';
    };

    // Initialize state
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const key = getStorageKey();
        const savedTheme = localStorage.getItem(key);
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Sync state when location (user) changes
    // This handles the case where user logs in/out and we need to load THEIR preference
    useEffect(() => {
        const key = getStorageKey();
        const savedTheme = localStorage.getItem(key);

        if (savedTheme) {
            setDarkMode(savedTheme === 'dark');
        } else {
            // If no preference for this user, fallback to system
            // OR keep current state? Better allow system preference for new users
            // Check if we switched users. If we did, and no pref, maybe default to light or system?
            setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
    }, [location.pathname]); // Trigger on navigation (login/logout)

    // Apply class to HTML and save to localStorage
    useEffect(() => {
        const root = window.document.documentElement;
        if (darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Save to current user's key
        const key = getStorageKey();
        localStorage.setItem(key, darkMode ? 'dark' : 'light');
    }, [darkMode]);

    const toggleTheme = () => {
        setDarkMode((prev) => !prev);
    };

    return (
        <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom Hook for using the context
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
