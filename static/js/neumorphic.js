/**
 * Neumorphic UI JavaScript Utilities
 * This file contains JavaScript functions to enhance the neumorphic UI experience
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all neumorphic components
    initializeNeumorphicUI();
});

/**
 * Initialize all neumorphic UI components
 */
function initializeNeumorphicUI() {
    // Add subtle hover effects to neumorphic elements
    addHoverEffects();
    
    // Initialize button press animations
    initButtonPressEffects();
    
    // Initialize staggered animations for lists
    initStaggeredAnimations();
    
    // Initialize tilt effect on cards
    initTiltEffect();
    
    // Initialize smooth transitions for theme switching
    initThemeTransitions();
}

/**
 * Add hover effects to neumorphic elements
 */
function addHoverEffects() {
    // Add subtle hover effects to neumorphic cards
    const neuCards = document.querySelectorAll('.neu-card:not(.neu-no-hover)');
    
    neuCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('neu-hover');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('neu-hover');
        });
    });
}

/**
 * Initialize button press animations
 */
function initButtonPressEffects() {
    const neuButtons = document.querySelectorAll('.neu-btn');
    
    neuButtons.forEach(button => {
        button.addEventListener('mousedown', function() {
            this.classList.add('neu-pressed');
        });
        
        button.addEventListener('mouseup', function() {
            this.classList.remove('neu-pressed');
        });
        
        button.addEventListener('mouseleave', function() {
            this.classList.remove('neu-pressed');
        });
    });
}

/**
 * Initialize staggered animations for lists
 */
function initStaggeredAnimations() {
    const neuLists = document.querySelectorAll('.neu-staggered-list');
    
    neuLists.forEach(list => {
        const items = list.querySelectorAll('li, .neu-list-item');
        
        items.forEach((item, index) => {
            item.classList.add('neu-list-item');
            item.style.opacity = '0';
            
            // Use Intersection Observer to trigger animations when scrolled into view
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Add animation class with a delay based on the index
                        setTimeout(() => {
                            item.classList.add('neu-anim-slide-up');
                            item.style.opacity = '1';
                        }, 100 * (index % 10));
                        
                        // Unobserve after animation is triggered
                        observer.unobserve(item);
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(item);
        });
    });
}

/**
 * Initialize 3D tilt effect on cards
 */
function initTiltEffect() {
    const tiltCards = document.querySelectorAll('.neu-tilt');
    
    tiltCards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
            // Get position of mouse cursor relative to the element
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate rotation based on mouse position
            const tiltX = (y / rect.height - 0.5) * 10; // Max 5deg rotation
            const tiltY = (x / rect.width - 0.5) * -10;
            
            // Apply the transformation
            this.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        card.addEventListener('mouseleave', function() {
            // Reset on mouse leave
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });
}

/**
 * Initialize smooth transitions for theme switching
 */
function initThemeTransitions() {
    const themeToggle = document.querySelector('.theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            // Add transition class to body
            document.body.classList.add('neu-transition-500');
            
            // Toggle dark theme
            document.body.classList.toggle('dark-theme');
            
            // Remove transition class after transition completes
            setTimeout(() => {
                document.body.classList.remove('neu-transition-500');
            }, 500);
        });
    }
}

/**
 * Add neumorphic ripple effect to buttons
 * @param {Element} element - The element to add ripple effect to
 */
function addRippleEffect(element) {
    element.addEventListener('click', function(e) {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const ripple = document.createElement('span');
        ripple.classList.add('neu-ripple');
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
}

/**
 * Initialize all elements with ripple effect
 */
function initRippleEffects() {
    const rippleElements = document.querySelectorAll('.neu-ripple-effect');
    
    rippleElements.forEach(element => {
        addRippleEffect(element);
    });
}

/**
 * Show a neumorphic toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info, warning)
 * @param {number} duration - The duration in milliseconds
 */
function showNeuToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.neu-toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.classList.add('neu-toast-container');
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.classList.add('neu-toast', `neu-toast-${type}`, 'neu-anim-slide-left');
    toast.innerHTML = `
        <div class="neu-toast-icon"></div>
        <div class="neu-toast-message">${message}</div>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Remove after duration
    setTimeout(() => {
        toast.classList.add('neu-toast-hide');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
} 