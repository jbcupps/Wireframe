/**
 * Hadron Validator - Provides functionality for validating SKB configurations
 * for compatibility with hadron formation
 */

// Initialize validation elements when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners if we're on the visualization page
    if (document.getElementById('hadron-validation-panel')) {
        initHadronValidator();
    }
});

function initHadronValidator() {
    // Add event listener to the validate button
    document.getElementById('validate-hadron-btn').addEventListener('click', validateHadronConfiguration);
    
    // Add event listener to the toggle details button
    document.getElementById('toggle-validation-details').addEventListener('click', toggleValidationDetails);
    
    // Add listeners to SKB sliders to update validation status
    const skbSliders = document.querySelectorAll('#skb-controls input[type="range"]');
    skbSliders.forEach(slider => {
        slider.addEventListener('change', function() {
            const validationStatus = document.getElementById('validation-status');
            validationStatus.innerHTML = '<i class="fas fa-question-circle"></i><span>Configuration changed. Click "Validate" to analyze.</span>';
            document.getElementById('validation-result').className = 'validation-result';
        });
    });
    
    // Check if merge toggle is on - hadron validation requires individual sub-SKBs
    document.getElementById('merge-toggle').addEventListener('change', function() {
        updateMergeWarning();
    });
    
    // Initial check
    updateMergeWarning();
    
    // Listen for manifold type change to show/hide validation panel
    document.getElementById('manifold-type').addEventListener('change', function() {
        const manifestType = this.value;
        const validationPanel = document.getElementById('hadron-validation-panel');
        
        if (manifestType === 'skb') {
            validationPanel.style.display = 'block';
        } else {
            validationPanel.style.display = 'none';
        }
    });
}

// Update warning if merge is enabled
function updateMergeWarning() {
    const mergeEnabled = document.getElementById('merge-toggle').checked;
    const validationStatus = document.getElementById('validation-status');
    const validationResult = document.getElementById('validation-result');
    const validateButton = document.getElementById('validate-hadron-btn');
    
    if (mergeEnabled) {
        validationStatus.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Hadron validation requires individual sub-SKBs</span>';
        validationResult.className = 'validation-result invalid';
        validateButton.disabled = true;
    } else {
        validationStatus.innerHTML = '<i class="fas fa-question-circle"></i><span>Configure sub-SKBs to validate</span>';
        validationResult.className = 'validation-result';
        validateButton.disabled = false;
    }
}

// Toggle validation details visibility
function toggleValidationDetails() {
    const detailsSection = document.getElementById('validation-details');
    const toggleButton = document.getElementById('toggle-validation-details').querySelector('i');
    
    if (detailsSection.style.display === 'none') {
        detailsSection.style.display = 'block';
        toggleButton.className = 'fas fa-chevron-up';
    } else {
        detailsSection.style.display = 'none';
        toggleButton.className = 'fas fa-chevron-down';
    }
}

// Validate current hadron configuration
function validateHadronConfiguration() {
    // Show loading state
    const validateButton = document.getElementById('validate-hadron-btn');
    const originalButtonText = validateButton.innerHTML;
    validateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Validating...</span>';
    validateButton.disabled = true;
    
    // Get current parameters
    const params = getVisualizationParams();
    
    // Send request to validate
    fetch('/validate_hadron', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showValidationError(data.error);
            return;
        }
        
        updateValidationUI(data.result);
    })
    .catch(error => {
        console.error('Error validating hadron:', error);
        showValidationError('Failed to validate. Please try again.');
    })
    .finally(() => {
        // Restore button
        validateButton.innerHTML = originalButtonText;
        validateButton.disabled = false;
        
        // Show details
        document.getElementById('validation-details').style.display = 'block';
        document.getElementById('toggle-validation-details').querySelector('i').className = 'fas fa-chevron-up';
    });
}

// Update UI with validation results
function updateValidationUI(result) {
    const validationStatus = document.getElementById('validation-status');
    const validationResult = document.getElementById('validation-result');
    const reasonsList = document.getElementById('reasons-list');
    
    // Clear previous reasons
    reasonsList.innerHTML = '';
    
    // Update top-level result
    if (result.is_valid) {
        validationStatus.innerHTML = `<i class="fas fa-check-circle"></i><span>Valid ${result.hadron_type} configuration</span>`;
        validationStatus.className = 'validation-status valid';
        validationResult.className = 'validation-result valid';
        
        // Add hadron type and score
        if (!document.getElementById('hadron-type')) {
            const hadronType = document.createElement('div');
            hadronType.id = 'hadron-type';
            hadronType.className = 'hadron-type';
            validationResult.appendChild(hadronType);
            
            const compatScore = document.createElement('div');
            compatScore.id = 'compatibility-score';
            compatScore.className = 'compatibility-score';
            validationResult.appendChild(compatScore);
        }
        
        document.getElementById('hadron-type').textContent = result.hadron_type.toUpperCase();
        document.getElementById('compatibility-score').textContent = `Compatibility: ${(result.compatibility_score * 100).toFixed(0)}%`;
    } else {
        validationStatus.innerHTML = '<i class="fas fa-times-circle"></i><span>Invalid hadron configuration</span>';
        validationStatus.className = 'validation-status invalid';
        validationResult.className = 'validation-result invalid';
        
        // Remove hadron type and score if they exist
        if (document.getElementById('hadron-type')) {
            document.getElementById('hadron-type').remove();
            document.getElementById('compatibility-score').remove();
        }
    }
    
    // Update details
    const details = result.details;
    
    // Update linking values
    document.getElementById('total-linking').textContent = details.total_linking.toFixed(2);
    document.getElementById('total-linking').className = 'detail-value ' + getLinkValueClass(details.total_linking);
    
    document.getElementById('total-charge').textContent = details.total_charge.toFixed(2);
    document.getElementById('total-charge').className = 'detail-value ' + getChargeValueClass(details.total_charge);
    
    document.getElementById('mass-estimate').textContent = details.mass_estimate.toFixed(1) + ' MeV';
    document.getElementById('stability-value').textContent = details.stability;
    
    // Update linking matrix
    if (details.linking_numbers) {
        document.getElementById('link-12-value').textContent = details.linking_numbers.skb1_skb2.toFixed(1);
        document.getElementById('link-12-value').className = getLinkValueClass(details.linking_numbers.skb1_skb2);
        
        document.getElementById('link-13-value').textContent = details.linking_numbers.skb1_skb3.toFixed(1);
        document.getElementById('link-13-value').className = getLinkValueClass(details.linking_numbers.skb1_skb3);
        
        document.getElementById('link-23-value').textContent = details.linking_numbers.skb2_skb3.toFixed(1);
        document.getElementById('link-23-value').className = getLinkValueClass(details.linking_numbers.skb2_skb3);
    }
    
    // Update charge distribution
    if (details.charges && details.charges.length === 3) {
        document.getElementById('charge-1-value').textContent = details.charges[0].toFixed(2);
        document.getElementById('charge-1-value').className = getChargeValueClass(details.charges[0]);
        
        document.getElementById('charge-2-value').textContent = details.charges[1].toFixed(2);
        document.getElementById('charge-2-value').className = getChargeValueClass(details.charges[1]);
        
        document.getElementById('charge-3-value').textContent = details.charges[2].toFixed(2);
        document.getElementById('charge-3-value').className = getChargeValueClass(details.charges[2]);
    }
    
    // Add reasons
    if (details.reasons && details.reasons.length > 0) {
        details.reasons.forEach(reason => {
            const li = document.createElement('li');
            li.textContent = reason;
            reasonsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = 'No specific validation feedback available.';
        reasonsList.appendChild(li);
    }
}

// Helper function to get color class for linking values
function getLinkValueClass(value) {
    if (value >= 1) return 'high-value';
    if (value >= 0.5) return 'medium-value';
    return 'low-value';
}

// Helper function to get color class for charge values
function getChargeValueClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return '';
}

// Show validation error
function showValidationError(message) {
    const validationStatus = document.getElementById('validation-status');
    const validationResult = document.getElementById('validation-result');
    const reasonsList = document.getElementById('reasons-list');
    
    validationStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Validation Error</span>';
    validationStatus.className = 'validation-status invalid';
    validationResult.className = 'validation-result invalid';
    
    reasonsList.innerHTML = '';
    const li = document.createElement('li');
    li.textContent = message;
    reasonsList.appendChild(li);
    
    document.getElementById('validation-details').style.display = 'block';
} 