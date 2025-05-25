/**
 * Enhanced Navigation System - Best Practices Implementation
 * Features: Mobile-first responsive design, full accessibility support,
 * keyboard navigation, and smooth animations
 */

class EnhancedNavigation {
    constructor() {
        this.mobileToggle = null;
        this.navMenu = null;
        this.dropdowns = [];
        this.themeToggle = null;
        this.isInitialized = false;
        
        // Bind methods to preserve context
        this.handleMobileToggle = this.handleMobileToggle.bind(this);
        this.handleDropdownClick = this.handleDropdownClick.bind(this);
        this.handleDropdownKeyboard = this.handleDropdownKeyboard.bind(this);
        this.handleThemeToggle = this.handleThemeToggle.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    /**
     * Initialize the navigation system
     */
    init() {
        if (this.isInitialized) return;
        
        try {
            this.setupElements();
            this.setupEventListeners();
            this.setupActiveStates();
            this.setupTheme();
            this.isInitialized = true;
            console.log('Enhanced Navigation initialized successfully');
        } catch (error) {
            console.error('Error initializing enhanced navigation:', error);
        }
    }

    /**
     * Setup DOM element references
     */
    setupElements() {
        this.mobileToggle = document.querySelector('.mobile-menu-toggle');
        this.navMenu = document.querySelector('.nav-menu');
        this.dropdowns = Array.from(document.querySelectorAll('.nav-dropdown'));
        this.themeToggle = document.querySelector('#theme-toggle-checkbox');
        
        if (!this.navMenu) {
            throw new Error('Navigation menu not found');
        }
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Mobile toggle
        if (this.mobileToggle) {
            this.mobileToggle.addEventListener('click', this.handleMobileToggle);
        }

        // Dropdown interactions
        this.dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                // Mouse events for desktop
                dropdown.addEventListener('mouseenter', () => this.showDropdown(dropdown));
                dropdown.addEventListener('mouseleave', () => this.hideDropdown(dropdown));
                
                // Click events for mobile and keyboard users
                toggle.addEventListener('click', (e) => this.handleDropdownClick(e, dropdown));
                toggle.addEventListener('keydown', (e) => this.handleDropdownKeyboard(e, dropdown));
            }
        });

        // Theme toggle
        if (this.themeToggle) {
            this.themeToggle.addEventListener('change', this.handleThemeToggle);
        }

        // Global event listeners
        document.addEventListener('click', this.handleOutsideClick);
        document.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('resize', this.handleResize);

        // Handle escape key for accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllDropdowns();
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Setup active states for current page
     */
    setupActiveStates() {
        const currentPath = window.location.pathname;
        const currentEndpoint = document.body.dataset.endpoint;
        
        // Update active states based on current route
        const navLinks = document.querySelectorAll('.nav-link, .dropdown-link');
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href === currentPath || link.classList.contains('active'))) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
                
                // If it's a dropdown link, mark parent as active
                const parentDropdown = link.closest('.nav-dropdown');
                if (parentDropdown) {
                    const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
                    if (parentToggle) {
                        parentToggle.classList.add('active');
                    }
                }
            }
        });
    }

    /**
     * Setup theme functionality
     */
    setupTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            document.documentElement.setAttribute('data-theme', savedTheme);
            if (this.themeToggle) {
                this.themeToggle.checked = savedTheme === 'dark';
            }
        } else if (prefersDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            if (this.themeToggle) {
                this.themeToggle.checked = true;
            }
        }
    }

    /**
     * Handle mobile menu toggle
     */
    handleMobileToggle(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isExpanded = this.mobileToggle.getAttribute('aria-expanded') === 'true';
        const newState = !isExpanded;
        
        this.mobileToggle.setAttribute('aria-expanded', newState);
        this.navMenu.setAttribute('aria-expanded', newState);
        
        if (newState) {
            this.openMobileMenu();
        } else {
            this.closeMobileMenu();
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        this.navMenu.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        
        // Focus first navigation item for accessibility
        setTimeout(() => {
            const firstNavLink = this.navMenu.querySelector('.nav-link');
            if (firstNavLink) {
                firstNavLink.focus();
            }
        }, 300);
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        this.mobileToggle.setAttribute('aria-expanded', 'false');
        this.navMenu.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        this.closeAllDropdowns();
    }

    /**
     * Handle dropdown click events
     */
    handleDropdownClick(e, dropdown) {
        // On mobile or when using keyboard
        if (window.innerWidth <= 768 || e.detail === 0) {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown(dropdown);
        }
    }

    /**
     * Handle dropdown keyboard navigation
     */
    handleDropdownKeyboard(e, dropdown) {
        const { key } = e;
        
        switch (key) {
            case 'Enter':
            case ' ':
                e.preventDefault();
                this.toggleDropdown(dropdown);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.showDropdown(dropdown);
                this.focusFirstDropdownItem(dropdown);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.showDropdown(dropdown);
                this.focusLastDropdownItem(dropdown);
                break;
        }
    }

    /**
     * Toggle dropdown state
     */
    toggleDropdown(dropdown) {
        const isExpanded = dropdown.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            this.hideDropdown(dropdown);
        } else {
            this.closeAllDropdowns();
            this.showDropdown(dropdown);
        }
    }

    /**
     * Show dropdown
     */
    showDropdown(dropdown) {
        dropdown.setAttribute('aria-expanded', 'true');
        dropdown.setAttribute('data-keyboard-open', 'true');
        
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'true');
        }
    }

    /**
     * Hide dropdown
     */
    hideDropdown(dropdown) {
        dropdown.setAttribute('aria-expanded', 'false');
        dropdown.removeAttribute('data-keyboard-open');
        
        const toggle = dropdown.querySelector('.dropdown-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', 'false');
        }
    }

    /**
     * Close all dropdowns
     */
    closeAllDropdowns() {
        this.dropdowns.forEach(dropdown => {
            this.hideDropdown(dropdown);
        });
    }

    /**
     * Focus first dropdown item
     */
    focusFirstDropdownItem(dropdown) {
        const firstItem = dropdown.querySelector('.dropdown-link');
        if (firstItem) {
            setTimeout(() => firstItem.focus(), 100);
        }
    }

    /**
     * Focus last dropdown item
     */
    focusLastDropdownItem(dropdown) {
        const items = dropdown.querySelectorAll('.dropdown-link');
        const lastItem = items[items.length - 1];
        if (lastItem) {
            setTimeout(() => lastItem.focus(), 100);
        }
    }

    /**
     * Handle theme toggle
     */
    handleThemeToggle(e) {
        const isDark = e.target.checked;
        const theme = isDark ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    /**
     * Handle clicks outside navigation
     */
    handleOutsideClick(e) {
        const nav = e.target.closest('.main-nav');
        
        if (!nav) {
            this.closeAllDropdowns();
            
            if (window.innerWidth <= 768 && this.navMenu.getAttribute('aria-expanded') === 'true') {
                this.closeMobileMenu();
            }
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (window.innerWidth > 768) {
            this.closeMobileMenu();
            this.closeAllDropdowns();
        }
    }

    /**
     * Handle global keyboard navigation
     */
    handleKeyDown(e) {
        // Implement arrow key navigation within dropdowns
        if (e.target.closest('.dropdown-menu')) {
            this.handleDropdownNavigation(e);
        }
    }

    /**
     * Handle arrow key navigation within dropdowns
     */
    handleDropdownNavigation(e) {
        const dropdown = e.target.closest('.nav-dropdown');
        if (!dropdown) return;

        const items = Array.from(dropdown.querySelectorAll('.dropdown-link'));
        const currentIndex = items.indexOf(e.target);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
                items[prevIndex].focus();
                break;
            case 'Home':
                e.preventDefault();
                items[0].focus();
                break;
            case 'End':
                e.preventDefault();
                items[items.length - 1].focus();
                break;
            case 'Tab':
                // Allow natural tab behavior, but close dropdown
                setTimeout(() => this.closeAllDropdowns(), 0);
                break;
        }
    }

    /**
     * Public method to manually update active states
     */
    updateActiveStates(newPath) {
        // Remove all active states
        document.querySelectorAll('.nav-link.active, .dropdown-link.active, .dropdown-toggle.active')
            .forEach(link => {
                link.classList.remove('active');
                link.removeAttribute('aria-current');
            });

        // Add active state to current page
        const currentLink = document.querySelector(`[href="${newPath}"]`);
        if (currentLink) {
            currentLink.classList.add('active');
            currentLink.setAttribute('aria-current', 'page');

            // If it's a dropdown link, mark parent as active
            const parentDropdown = currentLink.closest('.nav-dropdown');
            if (parentDropdown) {
                const parentToggle = parentDropdown.querySelector('.dropdown-toggle');
                if (parentToggle) {
                    parentToggle.classList.add('active');
                }
            }
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        if (!this.isInitialized) return;
        
        // Remove event listeners
        if (this.mobileToggle) {
            this.mobileToggle.removeEventListener('click', this.handleMobileToggle);
        }
        
        if (this.themeToggle) {
            this.themeToggle.removeEventListener('change', this.handleThemeToggle);
        }
        
        document.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('resize', this.handleResize);
        
        this.isInitialized = false;
    }
}

// Initialize navigation when DOM is ready
let navigationInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    navigationInstance = new EnhancedNavigation();
    navigationInstance.init();
});

// Expose for external use
window.EnhancedNavigation = navigationInstance;

// Legacy support for existing functionality
document.addEventListener('DOMContentLoaded', function() {
    // Maintain compatibility with existing dropdown handling
    const legacyDropdownToggles = document.querySelectorAll('.dropdown-toggle');
    legacyDropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const dropdown = this.closest('.nav-dropdown');
                const dropdownMenu = dropdown.querySelector('.dropdown-menu');
                
                // Close all other menus
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    if (menu !== dropdownMenu) {
                        menu.classList.remove('show');
                    }
                });
                
                // Toggle this menu
                dropdownMenu.classList.toggle('show');
            }
        });
    });

    // Legacy outside click handler
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // Legacy active state detection
    const activeLinks = document.querySelectorAll('.dropdown-menu a.active');
    activeLinks.forEach(link => {
        const parentDropdown = link.closest('.nav-dropdown');
        if (parentDropdown) {
            const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle');
            if (dropdownToggle) {
                dropdownToggle.classList.add('active');
            }
        }
    });
});
