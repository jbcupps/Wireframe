// Navigation dropdown handling
document.addEventListener('DOMContentLoaded', function() {
    // Add active class to parent dropdown if child link is active
    const activeLinks = document.querySelectorAll('.dropdown-menu a.active');
    activeLinks.forEach(link => {
        const parentDropdown = link.closest('.nav-dropdown');
        const dropdownToggle = parentDropdown.querySelector('.dropdown-toggle');
        dropdownToggle.classList.add('active');
    });

    // Handle click on dropdown toggle (for mobile)
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            // Only apply this on mobile
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

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.nav-dropdown')) {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });
});
