// Dynamic Content Updater for Interdependent Way Site
// Fetches latest GitHub activity and updates site sections with fallback to static content.
// Ensures visitors always see a complete, built site.

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Configuration
    const REPO_OWNER = 'wayseer00';
    const REPO_NAME = 'wayseer.github.io';
    const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;
    
    // Sections to update (IDs in HTML)
    const sections = {
        lastCommit: 'last-commit-info',
        repoStats: 'repo-stats',
        edcmStatus: 'edcm-status'  // Placeholder for EDCM; update via external fetch if API available
    };
    
    // Static fallbacks (embedded or default text)
    const fallbacks = {
        lastCommit: 'Site last updated: Recent activity ensures ongoing development.',
        repoStats: 'Active repository with contributions from The-Interdependency organization.',
        edcmStatus: 'System coherence stable. Check internal metrics for details.'
    };
    
    // Function to fetch and update last commit
    function updateLastCommit() {
        fetch(`${API_BASE}/commits?per_page=1`)
            .then(response => {
                if (!response.ok) throw new Error('Fetch failed');
                return response.json();
            })
            .then(data => {
                if (data && data.length > 0) {
                    const commit = data[0];
                    const date = new Date(commit.commit.author.date).toLocaleString();
                    const message = commit.commit.message;
                    const element = document.getElementById(sections.lastCommit);
                    if (element) {
                        element.innerHTML = `<strong>Last Update:</strong> ${date}<br><em>${message}</em>`;
                    }
                } else {
                    fallbackUpdate(sections.lastCommit, fallbacks.lastCommit);
                }
            })
            .catch(error => {
                console.error('Dynamic update failed:', error);
                fallbackUpdate(sections.lastCommit, fallbacks.lastCommit);
            });
    }
    
    // Function to fetch repo stats (stars, forks, etc.)
    function updateRepoStats() {
        fetch(`${API_BASE}`)
            .then(response => {
                if (!response.ok) throw new Error('Fetch failed');
                return response.json();
            })
            .then(data => {
                const stars = data.stargazers_count || 0;
                const forks = data.forks_count || 0;
                const element = document.getElementById(sections.repoStats);
                if (element) {
                    element.innerHTML = `<strong>Community Engagement:</strong> ${stars} stars, ${forks} forks<br>Part of The-Interdependency: Explore <a href="https://github.com/The-Interdependency">our organization</a>.`;
                }
            })
            .catch(error => {
                console.error('Repo stats fetch failed:', error);
                fallbackUpdate(sections.repoStats, fallbacks.repoStats);
            });
    }
    
    // Placeholder for EDCM/PCNA updates - fetch from a public JSON endpoint if available
    // For now, static; extend with actual API (e.g., from replit.interdependentway.org/api/edcm)
    function updateEDCMStatus() {
        // Example: Fetch from external API
        // fetch('https://replit.interdependentway.org/api/edcm')
        //     .then(...) 
        // For demo, use static
        const element = document.getElementById(sections.edcmStatus);
        if (element) {
            element.innerHTML = fallbacks.edcmStatus;  // Replace with dynamic fetch when API ready
        }
    }
    
    // Generic fallback updater
    function fallbackUpdate(sectionId, text) {
        const element = document.getElementById(sectionId);
        if (element) {
            element.innerHTML = text;
        }
    }
    
    // Initialize updates
    updateLastCommit();
    updateRepoStats();
    updateEDCMStatus();
    
    // Optional: Refresh every 5 minutes for dynamic feel (without overwhelming API)
    setInterval(() => {
        updateLastCommit();
        updateRepoStats();
    }, 300000);  // 5 minutes
});

// Graceful degradation: If JS fails to load, static content remains visible.
// No visible errors to users; all updates are non-blocking.
