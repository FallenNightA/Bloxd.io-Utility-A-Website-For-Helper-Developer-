/* Bloxd Utility - Automated Syntax Engine */
document.addEventListener('DOMContentLoaded', () => {
    // Find all pre-formatted blocks
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach(block => {
        // Automatically mark as JavaScript if not specified
        if (!block.classList.contains('language-javascript')) {
            block.classList.add('language-javascript');
        }
        
        // Wrap content in <code> tag for Prism compatibility
        if (!block.querySelector('code')) {
            const content = block.innerHTML;
            block.innerHTML = `<code>${content}</code>`;
        }
    });

    // Run the highlighter
    if (typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
});

// Helper for dynamic tools like the Merger/Generator
window.refreshSyntax = function() {
    if (typeof Prism !== 'undefined') Prism.highlightAll();
};