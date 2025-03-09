/**
 * Generate Placeholder Images
 * 
 * This script automatically generates placeholder images for the 4D Manifold Explorer website.
 * It creates colored canvases with text labels to serve as visual elements until
 * proper images are provided.
 */

// Configuration
const images = [
    {
        name: 'hero-visual.png',
        width: 800,
        height: 600,
        backgroundColor: '#5271ff20',
        text: '4D Manifold Visualization',
        drawFunction: drawComplexVisualization
    },
    {
        name: 'maxwell.jpg',
        width: 600,
        height: 400,
        backgroundColor: '#00c2b820',
        text: 'Maxwell\'s Equations',
        drawFunction: drawMaxwellVisualization
    },
    {
        name: 'evolution.jpg',
        width: 600,
        height: 400,
        backgroundColor: '#8f57ff20',
        text: 'Evolution Equations',
        drawFunction: drawEvolutionVisualization
    },
    {
        name: 'oscillator.jpg',
        width: 600,
        height: 400,
        backgroundColor: '#ef476f20',
        text: 'Harmonic Oscillator',
        drawFunction: drawOscillatorVisualization
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if images are missing
    checkAndCreatePlaceholderImages();
});

// Check for missing images and create placeholders
function checkAndCreatePlaceholderImages() {
    // Create the actual image elements with inline base64 data
    images.forEach(img => {
        // Create a canvas to generate the image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the placeholder
        const ctx = canvas.getContext('2d');
        
        // Fill with background color
        ctx.fillStyle = img.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // If there's a custom draw function, use it
        if (img.drawFunction) {
            img.drawFunction(ctx, canvas.width, canvas.height);
        }
        
        // Add text
        ctx.fillStyle = '#2b2d42';
        ctx.font = 'bold 24px Inter, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(img.text, canvas.width / 2, canvas.height / 2);
        
        // Create data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Find any image elements with this source and replace with our placeholder
        document.querySelectorAll(`img[src*="${img.name}"]`).forEach(imgElement => {
            imgElement.src = dataUrl;
            
            // Make sure the image is visible
            imgElement.style.display = 'block';
            imgElement.style.maxWidth = '100%';
            imgElement.style.height = 'auto';
        });
    });
    
    // Add a small visual indicator that we're using placeholders
    const indicator = document.createElement('div');
    indicator.textContent = 'Using placeholder images';
    indicator.style.position = 'fixed';
    indicator.style.bottom = '10px';
    indicator.style.left = '10px';
    indicator.style.padding = '5px 10px';
    indicator.style.backgroundColor = 'rgba(0,0,0,0.7)';
    indicator.style.color = 'white';
    indicator.style.fontSize = '12px';
    indicator.style.borderRadius = '4px';
    indicator.style.zIndex = '9999';
    document.body.appendChild(indicator);
}

// Custom drawing functions for each image type
function drawComplexVisualization(ctx, width, height) {
    // Draw a wireframe-like structure for the hero image
    ctx.strokeStyle = '#5271ff';
    ctx.lineWidth = 2;
    
    // Create a grid of lines
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
    
    // Draw a 3D perspective cube
    ctx.lineWidth = 3;
    const centerX = width / 2;
    const centerY = height / 2;
    const size = Math.min(width, height) * 0.3;
    
    // Front face
    ctx.strokeStyle = '#5271ff';
    ctx.beginPath();
    ctx.moveTo(centerX - size / 2, centerY - size / 2);
    ctx.lineTo(centerX + size / 2, centerY - size / 2);
    ctx.lineTo(centerX + size / 2, centerY + size / 2);
    ctx.lineTo(centerX - size / 2, centerY + size / 2);
    ctx.closePath();
    ctx.stroke();
    
    // Back face
    ctx.strokeStyle = '#8f57ff';
    const offset = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(centerX - size / 2 + offset, centerY - size / 2 - offset);
    ctx.lineTo(centerX + size / 2 + offset, centerY - size / 2 - offset);
    ctx.lineTo(centerX + size / 2 + offset, centerY + size / 2 - offset);
    ctx.lineTo(centerX - size / 2 + offset, centerY + size / 2 - offset);
    ctx.closePath();
    ctx.stroke();
    
    // Connect front to back
    ctx.strokeStyle = '#00c2b8';
    ctx.beginPath();
    ctx.moveTo(centerX - size / 2, centerY - size / 2);
    ctx.lineTo(centerX - size / 2 + offset, centerY - size / 2 - offset);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + size / 2, centerY - size / 2);
    ctx.lineTo(centerX + size / 2 + offset, centerY - size / 2 - offset);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + size / 2, centerY + size / 2);
    ctx.lineTo(centerX + size / 2 + offset, centerY + size / 2 - offset);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - size / 2, centerY + size / 2);
    ctx.lineTo(centerX - size / 2 + offset, centerY + size / 2 - offset);
    ctx.stroke();
}

function drawMaxwellVisualization(ctx, width, height) {
    // Draw field lines for Maxwell's equations
    ctx.strokeStyle = '#00c2b8';
    ctx.lineWidth = 2;
    
    // Draw electric field lines (straight lines)
    for (let i = 0; i < 10; i++) {
        const x = width * 0.2 + (width * 0.6) * (i / 9);
        
        ctx.beginPath();
        ctx.moveTo(x, height * 0.2);
        ctx.lineTo(x, height * 0.8);
        ctx.stroke();
        
        // Add arrowheads
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(x, height * 0.8);
        ctx.lineTo(x - arrowSize, height * 0.8 - arrowSize * 1.5);
        ctx.lineTo(x + arrowSize, height * 0.8 - arrowSize * 1.5);
        ctx.closePath();
        ctx.fillStyle = '#00c2b8';
        ctx.fill();
    }
    
    // Draw magnetic field lines (circular)
    ctx.strokeStyle = '#5271ff';
    ctx.lineWidth = 2;
    const centerX = width / 2;
    const centerY = height / 2;
    
    for (let i = 0; i < 5; i++) {
        const radius = 30 + i * 20;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Draw some equations in the background
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(43, 45, 66, 0.5)';
    ctx.fillText('∇ × E = -∂B/∂t', width * 0.2, height * 0.1);
    ctx.fillText('∇ × B = μ₀J + μ₀ε₀∂E/∂t', width * 0.6, height * 0.1);
    ctx.fillText('∇ · E = ρ/ε₀', width * 0.2, height * 0.9);
    ctx.fillText('∇ · B = 0', width * 0.6, height * 0.9);
}

function drawEvolutionVisualization(ctx, width, height) {
    // Draw genetic algorithm-like visualization
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw evolution stages
    const stages = 5;
    const stageWidth = width * 0.8 / stages;
    const stageHeight = height * 0.6;
    const startX = width * 0.1;
    const startY = height * 0.2;
    
    for (let i = 0; i < stages; i++) {
        const x = startX + i * stageWidth;
        
        // Draw container
        ctx.fillStyle = `rgba(143, 87, 255, ${0.2 + i * 0.15})`;
        ctx.strokeStyle = '#8f57ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.rect(x, startY, stageWidth * 0.8, stageHeight);
        ctx.fill();
        ctx.stroke();
        
        // Draw some internal structures to symbolize evolution
        ctx.fillStyle = '#5271ff';
        
        // Number of points increases with evolution stage
        const points = 3 + i * 2;
        const radius = stageWidth * 0.3;
        
        ctx.beginPath();
        for (let j = 0; j < points; j++) {
            const angle = j * (Math.PI * 2 / points);
            const pX = x + stageWidth * 0.4 + Math.cos(angle) * radius * (0.5 + i * 0.1);
            const pY = startY + stageHeight / 2 + Math.sin(angle) * radius * (0.5 + i * 0.1);
            
            if (j === 0) {
                ctx.moveTo(pX, pY);
            } else {
                ctx.lineTo(pX, pY);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add evolution arrows
        if (i < stages - 1) {
            ctx.beginPath();
            ctx.moveTo(x + stageWidth * 0.8, startY + stageHeight / 2);
            ctx.lineTo(x + stageWidth, startY + stageHeight / 2);
            ctx.strokeStyle = '#ef476f';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Arrow head
            ctx.beginPath();
            ctx.moveTo(x + stageWidth, startY + stageHeight / 2);
            ctx.lineTo(x + stageWidth - 10, startY + stageHeight / 2 - 6);
            ctx.lineTo(x + stageWidth - 10, startY + stageHeight / 2 + 6);
            ctx.closePath();
            ctx.fillStyle = '#ef476f';
            ctx.fill();
        }
    }
}

function drawOscillatorVisualization(ctx, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Draw coordinate axes
    ctx.strokeStyle = '#8d99ae';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(width * 0.1, centerY);
    ctx.lineTo(width * 0.9, centerY);
    ctx.stroke();
    
    // Arrowhead for X
    ctx.beginPath();
    ctx.moveTo(width * 0.9, centerY);
    ctx.lineTo(width * 0.9 - 10, centerY - 6);
    ctx.lineTo(width * 0.9 - 10, centerY + 6);
    ctx.closePath();
    ctx.fillStyle = '#8d99ae';
    ctx.fill();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(centerX, height * 0.1);
    ctx.lineTo(centerX, height * 0.9);
    ctx.stroke();
    
    // Arrowhead for Y
    ctx.beginPath();
    ctx.moveTo(centerX, height * 0.1);
    ctx.lineTo(centerX - 6, height * 0.1 + 10);
    ctx.lineTo(centerX + 6, height * 0.1 + 10);
    ctx.closePath();
    ctx.fill();
    
    // Draw a sine wave
    ctx.strokeStyle = '#ef476f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const amplitude = height * 0.3;
    const frequency = 3; // number of waves to fit
    
    ctx.moveTo(width * 0.1, centerY);
    
    for (let x = 0; x <= width * 0.8; x++) {
        const progress = x / (width * 0.8);
        const damping = Math.exp(-progress * 2); // Damping factor
        
        const y = centerY - Math.sin(progress * Math.PI * 2 * frequency) * amplitude * damping;
        ctx.lineTo(width * 0.1 + x, y);
    }
    
    ctx.stroke();
    
    // Add a dot to represent the oscillator
    const time = (Date.now() % 5000) / 5000; // 0 to 1 over 5 seconds
    const dotX = width * 0.1 + time * width * 0.8;
    const damping = Math.exp(-time * 2);
    const dotY = centerY - Math.sin(time * Math.PI * 2 * frequency) * amplitude * damping;
    
    ctx.beginPath();
    ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#5271ff';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw a Gaussian envelope
    ctx.strokeStyle = 'rgba(0, 194, 184, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    ctx.moveTo(width * 0.1, centerY - amplitude);
    
    for (let x = 0; x <= width * 0.8; x++) {
        const progress = x / (width * 0.8);
        const envelope = Math.exp(-Math.pow((progress - 0.5) * 2, 2));
        
        ctx.lineTo(width * 0.1 + x, centerY - amplitude * envelope);
    }
    
    ctx.lineTo(width * 0.9, centerY);
    ctx.lineTo(width * 0.9, centerY + amplitude);
    
    for (let x = width * 0.8; x >= 0; x--) {
        const progress = x / (width * 0.8);
        const envelope = Math.exp(-Math.pow((progress - 0.5) * 2, 2));
        
        ctx.lineTo(width * 0.1 + x, centerY + amplitude * envelope);
    }
    
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 194, 184, 0.1)';
    ctx.fill();
    ctx.stroke();
} 